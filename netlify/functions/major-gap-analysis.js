// 커리어넷 데이터 조회 + OpenAI GPT 갭 분석
// gpt-3.5-turbo 사용 → 빠른 응답 (5~8초)
const https = require('https');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(6000, () => {
      req.destroy();
      reject(new Error('커리어넷 타임아웃'));
    });
  });
}

function httpsPost(hostname, path, reqHeaders, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = https.request(
      {
        hostname,
        path,
        method: 'POST',
        headers: {
          ...reqHeaders,
          'Content-Length': Buffer.byteLength(bodyStr),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
        res.on('error', reject);
      },
    );
    req.on('error', reject);
    // GPT 응답 대기 타임아웃 25초
    req.setTimeout(25000, () => {
      req.destroy();
      reject(new Error('GPT 응답 타임아웃 (25초 초과)'));
    });
    req.write(bodyStr);
    req.end();
  });
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS')
    return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {
    const {
      currentMajor,
      targetMajorSeq,
      targetMajorName,
      grade,
      hollandCode,
    } = JSON.parse(event.body);

    const CAREERNET_KEY = '488782036227e15faccd08091610c2c9';
    const keyword = encodeURIComponent(
      (targetMajorName || '').replace(/학과|학부|전공/g, ''),
    );

    // 1단계: 커리어넷 병렬 조회
    const [detailRes, jobsRes] = await Promise.allSettled([
      targetMajorSeq
        ? httpsGet(
            `https://www.career.go.kr/cnet/openapi/getOpenApi?apiKey=${CAREERNET_KEY}&svcType=api&svcCode=MAJOR_VIEW&contentType=json&gubun=univ_list&majorSeq=${targetMajorSeq}`,
          )
        : Promise.resolve(null),
      httpsGet(
        `https://www.career.go.kr/cnet/front/openapi/jobs.json?apiKey=${CAREERNET_KEY}&searchJobNm=${keyword}&pageIndex=1`,
      ),
    ]);

    let majorDetail = null;
    if (detailRes.status === 'fulfilled' && detailRes.value)
      majorDetail = safeJson(detailRes.value)?.dataSearch?.content?.[0] || null;

    let relatedJobs = [];
    if (jobsRes.status === 'fulfilled' && jobsRes.value)
      relatedJobs = (safeJson(jobsRes.value)?.jobs || [])
        .slice(0, 8)
        .map((j) => ({
          seq: j.seq,
          name: j.job_nm,
          wage: j.wage,
          work: j.work,
          wlb: j.wlb,
        }));

    console.log(
      '커리어넷 완료 - 학과:',
      majorDetail ? 'Y' : 'N',
      '직업수:',
      relatedJobs.length,
    );

    // 2단계: OpenAI GPT 갭 분석
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) throw new Error('OPENAI_API_KEY 환경변수 없음');

    const majorInfo = majorDetail
      ? [
          majorDetail.summary
            ? `개요: ${(majorDetail.summary || '').slice(0, 150)}`
            : '',
          majorDetail.interest
            ? `적성: ${(majorDetail.interest || '').slice(0, 100)}`
            : '',
          majorDetail.job
            ? `직업: ${(majorDetail.job || '').slice(0, 80)}`
            : '',
          majorDetail.qualifications
            ? `자격: ${majorDetail.qualifications}`
            : '',
          majorDetail.employment ? `취업률: ${majorDetail.employment}` : '',
          majorDetail.salary ? `초임: ${majorDetail.salary}` : '',
        ]
          .filter(Boolean)
          .join(' / ')
      : `학과명: ${targetMajorName}`;

    // 프롬프트 최소화 (토큰 줄여서 응답 속도 향상)
    const prompt = `편입/전과 컨설턴트. JSON만 응답.
학생: ${currentMajor} ${grade}학년→${targetMajorName} / 홀랜드: ${hollandCode}
학과정보: ${majorInfo}

JSON(마크다운 없이):
{"totalScore":72,"grade":"보통","summary":"2문장","strongPoints":[{"skill":"역량","reason":"이유","level":80}],"weakPoints":[{"skill":"역량","reason":"이유","gap":35,"priority":"높음"}],"skillRadar":[{"name":"수리/논리","current":60,"required":85},{"name":"글쓰기/표현","current":50,"required":70},{"name":"데이터분석","current":40,"required":80},{"name":"프로그래밍","current":30,"required":75},{"name":"커뮤니케이션","current":70,"required":60},{"name":"창의적사고","current":55,"required":70}],"roadmap":[{"period":"이번달~1개월","title":"제목","actions":["행동1","행동2","행동3"],"checkpoint":"기준"},{"period":"1~3개월","title":"제목","actions":["행동1","행동2","행동3"],"checkpoint":"기준"},{"period":"3~6개월","title":"제목","actions":["행동1","행동2","행동3"],"checkpoint":"기준"},{"period":"6개월이후","title":"제목","actions":["행동1","행동2","행동3"],"checkpoint":"기준"}],"certifications":["자격증1","자격증2","자격증3"],"urgentActions":["할일1","할일2","할일3"],"transferRoutes":[{"type":"편입","duration":"1년6개월","difficulty":"높음","desc":"설명"},{"type":"전과","duration":"1학기~1년","difficulty":"보통","desc":"설명"},{"type":"복수전공","duration":"2년","difficulty":"낮음","desc":"설명"}]}`;

    console.log('GPT 요청 시작...');
    const gptResponseText = await httpsPost(
      'api.openai.com',
      '/v1/chat/completions',
      {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      {
        model: 'gpt-3.5-turbo', // 빠른 모델 (gpt-4o-mini보다 훨씬 빠름)
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1500,
      },
    );

    const gptData = safeJson(gptResponseText);
    if (!gptData) throw new Error('GPT 응답 파싱 실패');
    if (gptData.error) throw new Error('GPT 오류: ' + gptData.error.message);

    const rawText = gptData.choices?.[0]?.message?.content || '';
    console.log('GPT 응답 앞 50자:', rawText.slice(0, 50));

    let analysis;
    try {
      analysis = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('JSON 파싱 실패: ' + rawText.slice(0, 200));
      analysis = JSON.parse(match[0]);
    }

    analysis.majorDetail = majorDetail
      ? {
          employment: majorDetail.employment || '',
          salary: majorDetail.salary || '',
          qualifications: majorDetail.qualifications || '',
          interest: majorDetail.interest || '',
        }
      : null;
    analysis.relatedJobs = relatedJobs;

    console.log('갭분석 완료 totalScore:', analysis.totalScore);
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(analysis),
    };
  } catch (err) {
    console.error('오류:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
