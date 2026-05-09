/**
 * major-gap-analysis.js
 * 갭분석 통합 Netlify 함수 - 공식 API 매뉴얼 기반 수정본
 *
 * 사용 API:
 *  - 커리어넷 학과정보  apiKey: 488782036227e15faccd08091610c2c9
 *  - 커리어넷 직업정보  apiKey: 488782036227e15faccd08091610c2c9 (동일키)
 *  - 워크넷(고용24) 채용정보  authKey: fc086189-feb3-4055-8430-4f2f3f1d2451
 *  - HRD-Net 훈련과정  authKey: 1e50a1f6-8a53-4074-b61d-6bdc6e91afc4
 *  - OpenAI GPT       env: OPENAI_API_KEY
 */

const https = require('https');

// ─────────────────────────────────────────────
// API 키 상수 (공식 매뉴얼 기반)
// ─────────────────────────────────────────────
const KEY_CAREERNET = '488782036227e15faccd08091610c2c9'; // 커리어넷 (학과+직업 공통)
const KEY_WORKNET = 'fc086189-feb3-4055-8430-4f2f3f1d2451'; // 워크넷(고용24) 채용정보
const KEY_HRD = '1e50a1f6-8a53-4074-b61d-6bdc6e91afc4'; // HRD-Net 훈련과정

// ─────────────────────────────────────────────
// CORS 헤더
// ─────────────────────────────────────────────
const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─────────────────────────────────────────────
// 유틸: HTTPS GET
// ─────────────────────────────────────────────
function httpsGet(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`GET 타임아웃: ${url.slice(0, 80)}`));
    });
  });
}

// ─────────────────────────────────────────────
// 유틸: HTTPS POST (GPT용)
// ─────────────────────────────────────────────
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
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(data));
        res.on('error', reject);
      },
    );
    req.on('error', reject);
    req.setTimeout(110000, () => {
      req.destroy();
      reject(new Error('GPT 응답 타임아웃 (110초 초과)'));
    });
    req.write(bodyStr);
    req.end();
  });
}

// ─────────────────────────────────────────────
// 유틸: 안전한 JSON 파싱
// ─────────────────────────────────────────────
function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// 1. 커리어넷 학과 상세정보
//    GET https://www.career.go.kr/cnet/openapi/getOpenApi
//    svcCode=MAJOR_VIEW, gubun=univ_list, majorSeq=학과코드
// ─────────────────────────────────────────────
async function fetchCareernetMajorDetail(majorSeq) {
  if (!majorSeq) return null;
  try {
    const url =
      `https://www.career.go.kr/cnet/openapi/getOpenApi` +
      `?apiKey=${KEY_CAREERNET}&svcType=api&svcCode=MAJOR_VIEW` +
      `&contentType=json&gubun=univ_list&majorSeq=${majorSeq}`;
    const text = await httpsGet(url);
    const parsed = safeJson(text);
    const item = parsed?.dataSearch?.content?.[0];
    if (!item) return null;

    // HTML 태그 제거 함수
    const stripHtml = (str) => (str || '').replace(/<[^>]*>/g, '').trim();

    // 모든 필드에서 HTML 태그 제거
    return {
      ...item,
      employment: stripHtml(item.employment),
      salary: stripHtml(item.salary),
      qualifications: stripHtml(item.qualifications),
      interest: stripHtml(item.interest),
      summary: stripHtml(item.summary),
      job: stripHtml(item.job),
    };
  } catch (e) {
    console.warn('커리어넷 학과 상세 실패:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────────
// 2. 커리어넷 직업백과 목록 검색
//    GET https://www.career.go.kr/cnet/front/openapi/jobs.json
//    파라미터: apiKey, searchJobNm(검색어), pageIndex
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// 2. 커리어넷 직업백과 검색
//    학과명이 아닌 직업 키워드로 검색해야 결과가 나옴
//    예: "그래픽디자인학과" → "디자이너" / "문예창작" → "작가"
// ─────────────────────────────────────────────
async function fetchCareernetJobs(keyword) {
  try {
    // 학과명에서 직업 키워드로 변환
    const jobKeyword = convertMajorToJobKeyword(keyword);
    const enc = encodeURIComponent(jobKeyword);
    const url =
      `https://www.career.go.kr/cnet/front/openapi/jobs.json` +
      `?apiKey=${KEY_CAREERNET}&searchJobNm=${enc}&pageIndex=1`;
    console.log('커리어넷 직업 검색 키워드:', jobKeyword, '← 원본:', keyword);
    const text = await httpsGet(url);
    const parsed = safeJson(text);
    const jobs = parsed?.jobs || [];
    console.log('커리어넷 직업 결과:', jobs.length, '건');

    // 결과 없으면 빈 키워드로 재시도 (전체 목록 일부)
    if (jobs.length === 0) {
      console.log('직업 검색 결과 없음 — 키워드 단순화 재시도');
      const short = jobKeyword.slice(0, 2);
      const url2 =
        `https://www.career.go.kr/cnet/front/openapi/jobs.json` +
        `?apiKey=${KEY_CAREERNET}&searchJobNm=${encodeURIComponent(short)}&pageIndex=1`;
      const text2 = await httpsGet(url2);
      const jobs2 = safeJson(text2)?.jobs || [];
      console.log('재시도 결과:', jobs2.length, '건');
      return jobs2.slice(0, 6).map(mapJob);
    }

    return jobs.slice(0, 6).map(mapJob);
  } catch (e) {
    console.warn('커리어넷 직업 검색 실패:', e.message);
    return [];
  }
}

// 직업 객체 매핑
function mapJob(j) {
  return {
    seq: j.seq,
    name: j.job_nm,
    wage: j.wage,
    work: (j.work || '').slice(0, 150),
    wlb: j.wlb,
  };
}

// 학과명 → 직업 키워드 변환 테이블
function convertMajorToJobKeyword(major) {
  const m = (major || '').replace(/학과|학부|전공|대학|계열/g, '').trim();

  const table = [
    [/(그래픽|시각|영상|미디어)디자인/, '디자이너'],
    [/(UI|UX|웹|앱|모바일)/, '디자이너'],
    [/(컴퓨터|소프트웨어|정보통신|IT|개발)/, '개발자'],
    [/(정보보안|사이버보안|보안)/, '보안전문가'],
    [/(문예창작|국어국문|문학)/, '작가'],
    [/(경영|경제|무역|마케팅)/, '경영'],
    [/(회계|세무)/, '회계사'],
    [/(심리|상담)/, '상담사'],
    [/(사회복지|복지)/, '사회복지사'],
    [/(간호|의료|보건)/, '간호사'],
    [/(건축|토목|도시)/, '건축사'],
    [/(기계|자동차|항공)/, '기계공학'],
    [/(화학|바이오|생명)/, '연구원'],
    [/(교육|사범|유아)/, '교사'],
    [/(법학|법률)/, '변호사'],
    [/(관광|호텔|항공서비스)/, '관광'],
    [/(언론|미디어|방송|광고)/, '기자'],
    [/(음악|실용음악)/, '음악'],
    [/(체육|스포츠)/, '스포츠'],
    [/(국제|외국어|통번역)/, '통역사'],
    [/(환경|생태)/, '환경'],
    [/(식품|영양)/, '영양사'],
    [/(패션|의류|섬유)/, '패션디자이너'],
  ];

  for (const [pattern, keyword] of table) {
    if (pattern.test(m)) return keyword;
  }

  // 매핑 없으면 앞 2글자로 검색
  return m.slice(0, 2) || m;
}

// ─────────────────────────────────────────────
// 3. 워크넷(고용24) 채용정보
//    GET https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L01.do
//    파라미터: authKey, callTp=L, returnType=JSON, startPage, display, keyword
// ─────────────────────────────────────────────
async function fetchWorknetRecruitment(keyword) {
  try {
    const enc = encodeURIComponent(keyword || '');
    const url =
      `https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L01.do` +
      `?authKey=${KEY_WORKNET}&callTp=L&returnType=JSON` +
      `&startPage=1&display=5&keyword=${enc}`;
    console.log('워크넷 채용 검색 키워드:', keyword);
    const text = await httpsGet(url);
    const parsed = safeJson(text);

    // 워크넷 응답 구조: wantedRoot > wanted 배열
    const list = parsed?.wantedRoot?.wanted || [];
    const arr = Array.isArray(list) ? list : [list];
    console.log('워크넷 채용 결과:', arr.length, '건');

    return arr
      .filter(Boolean)
      .slice(0, 5)
      .map((item) => ({
        title: item.title || '',
        company: item.company || '',
        endDate: item.closeDt || '',
        salary: item.sal || '',
        url: item.wantedInfoUrl || '',
        region: item.region || '',
        jobType: item.indTpNm || '',
      }));
  } catch (e) {
    console.warn('워크넷 채용정보 실패:', e.message);
    return [];
  }
}

// ─────────────────────────────────────────────
// 4. HRD-Net 국민내일배움카드 훈련과정
//    GET https://www.work24.go.kr/cm/openApi/call/hr/callOpenApiSvcInfo310L01.do
//    파라미터: authKey, returnType=JSON, outType=1, pageNum, pageSize,
//              srchTraStDt, srchTraEndDt, sort, sortCol,
//              crseTracseSe=C0061(국민내일배움카드),
//              srchTraProcessNm(훈련과정명 키워드)
// ─────────────────────────────────────────────
async function fetchHrdTraining(keyword) {
  try {
    const enc = encodeURIComponent(keyword || '');

    // 오늘~6개월 후 날짜 계산
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (d) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const end = new Date(now);
    end.setMonth(end.getMonth() + 6);

    // 1차 시도: 훈련과정명 키워드 검색
    const url =
      `https://www.work24.go.kr/cm/openApi/call/hr/callOpenApiSvcInfo310L01.do` +
      `?authKey=${KEY_HRD}&returnType=JSON&outType=1` +
      `&pageNum=1&pageSize=10` +
      `&srchTraStDt=${fmt(now)}&srchTraEndDt=${fmt(end)}` +
      `&crseTracseSe=C0061` +
      `&srchTraProcessNm=${enc}` +
      `&sort=DESC&sortCol=2`;

    console.log('HRD-Net URL:', url);
    const text = await httpsGet(url);
    const parsed = safeJson(text);
    console.log('HRD-Net 응답 앞 200자:', text.slice(0, 200));

    let list =
      parsed?.HRDNet?.srchList?.scn_list ||
      parsed?.srchList?.scn_list ||
      parsed?.srchList ||
      [];

    // 결과 없으면 키워드 2글자로 재시도
    if (!Array.isArray(list) || list.length === 0) {
      console.log('HRD-Net 결과 없음, 키워드 축소 재시도');
      const short = encodeURIComponent(keyword.slice(0, 2));
      const url2 =
        `https://www.work24.go.kr/cm/openApi/call/hr/callOpenApiSvcInfo310L01.do` +
        `?authKey=${KEY_HRD}&returnType=JSON&outType=1` +
        `&pageNum=1&pageSize=10` +
        `&srchTraStDt=${fmt(now)}&srchTraEndDt=${fmt(end)}` +
        `&crseTracseSe=C0061` +
        `&srchTraProcessNm=${short}` +
        `&sort=DESC&sortCol=2`;
      const text2 = await httpsGet(url2);
      const parsed2 = safeJson(text2);
      list =
        parsed2?.HRDNet?.srchList?.scn_list ||
        parsed2?.srchList?.scn_list ||
        parsed2?.srchList ||
        [];
    }

    const arr = Array.isArray(list) ? list : [list];
    console.log('HRD-Net 최종 결과:', arr.length, '건');

    return arr
      .filter(Boolean)
      .slice(0, 5)
      .map((item) => ({
        name: item.title || item.TITLE || '',
        institution: item.address || item.ADDRESS || '',
        period:
          (item.traStartDate || item.TRA_START_DATE) &&
          (item.traEndDate || item.TRA_END_DATE)
            ? `${item.traStartDate || item.TRA_START_DATE} ~ ${item.traEndDate || item.TRA_END_DATE}`
            : '',
        cost:
          item.courseMan || item.COURSE_MAN
            ? `${Number(item.courseMan || item.COURSE_MAN).toLocaleString()}원`
            : '',
        subsidy: '국민내일배움카드',
        rating:
          item.eiEmplRate3 || item.EI_EMPL_RATE3
            ? `수료 후 취업률 ${item.eiEmplRate3 || item.EI_EMPL_RATE3}%`
            : '',
        url: item.titleLink || item.TITLE_LINK || '',
      }));
  } catch (e) {
    console.warn('HRD-Net 훈련과정 실패:', e.message);
    return [];
  }
}

// ─────────────────────────────────────────────
// 5. OpenAI GPT 갭분석 생성
// ─────────────────────────────────────────────
async function generateGapAnalysis({
  currentMajor,
  targetMajorName,
  grade,
  hollandCode,
  majorInfo,
}) {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error('OPENAI_API_KEY 환경변수 없음');

  const prompt = `편입/전과 컨설턴트. 순수 JSON만 반환. 마크다운 없이.
학생: ${currentMajor} ${grade}학년 → ${targetMajorName} / 홀랜드: ${hollandCode}
${majorInfo ? `학과정보: ${majorInfo}` : ''}

규칙:
- strongPoints: 목표학과에서 실제 필요한 역량 중 학생이 보유한 것 2~3개. reason은 목표학과에서 어떻게 쓰이는지 2문장.
- weakPoints: 목표학과에 필요하지만 학생에게 부족한 것 2~3개. reason은 무엇을 어떻게 준비해야 하는지 2문장.
- transferRoutes desc: 각 방법의 구체적 준비절차·심사기준·주의사항 3문장.
- certifications: 실제 존재하는 국가공인 자격증 5개만.

{"totalScore":72,"grade":"준비 필요","summary":"2문장 핵심분석",
"skillRadar":[{"name":"수리/논리","current":60,"required":70},{"name":"글쓰기/표현","current":50,"required":65},{"name":"창의적사고","current":55,"required":70},{"name":"전공기초지식","current":40,"required":75},{"name":"커뮤니케이션","current":70,"required":60},{"name":"실기/실무","current":20,"required":80}],
"strongPoints":[{"skill":"역량명","percent":70,"reason":"2문장"}],
"weakPoints":[{"skill":"역량명","current":20,"required":80,"reason":"2문장"}],
// prompt 안의 transferRoutes 정의 부분 교체
"transferRoutes":[
  {"type":"편입","duration":"1년 6개월","difficulty":"높음","desc":"3문장"},
  {"type":"전과","duration":"1학기~1년","difficulty":"보통","desc":"3문장"},
  {"type":"복수전공","duration":"2년","difficulty":"낮음","desc":"3문장"}
]
"certifications":["자격증1","자격증2","자격증3","자격증4","자격증5"]}`;

  console.log('GPT 요청 시작...');
  const gptResponseText = await httpsPost(
    'api.openai.com',
    '/v1/chat/completions',
    {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1200,
    },
  );

  // ─────────────────────────────────────────────
  // 6. GPT로 관련 공모전 정보 생성
  //    실제로 정기 개최되는 분야별 공모전 정보 반환
  // ─────────────────────────────────────────────
  async function generateContests(targetMajorName) {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) return [];

    const keyword = targetMajorName
      .replace(/학과|학부|전공|대학|계열/g, '')
      .trim();

    const prompt = `${targetMajorName} 전공 관련 대학생이 참가할 수 있는 실제 공모전 4개를 알려줘.
실제로 매년 정기적으로 개최되는 공모전만 포함. 없는 공모전 만들지 말 것.
주최기관과 공모전명은 실제여야 함.

JSON만 반환:
{"contests":[
  {"name":"공모전명","organizer":"주최기관","category":"분야(예:디자인/아이디어/논문/영상)","period":"접수시기(예:매년 3~4월)","benefit":"혜택(상금/수상경력/취업연계 등)","tip":"준비 팁 1문장"}
]}`;

    try {
      const gptRes = await httpsPost(
        'api.openai.com',
        '/v1/chat/completions',
        {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 600,
        },
      );
      const gptData = safeJson(gptRes);
      const raw = gptData?.choices?.[0]?.message?.content || '';
      const parsed = safeJson(raw.replace(/```json|```/g, '').trim());
      return parsed?.contests || [];
    } catch (e) {
      console.warn('공모전 생성 실패:', e.message);
      return [];
    }
  }

  const gptData = safeJson(gptResponseText);
  if (!gptData) throw new Error('GPT 응답 파싱 실패');
  if (gptData.error) throw new Error('GPT 오류: ' + gptData.error.message);

  const rawText = gptData.choices?.[0]?.message?.content || '';
  console.log('GPT 응답 앞 50자:', rawText.slice(0, 50));

  try {
    return JSON.parse(rawText.replace(/```json|```/g, '').trim());
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('JSON 파싱 실패: ' + rawText.slice(0, 200));
    return JSON.parse(match[0]);
  }
}

// ─────────────────────────────────────────────
// 핸들러 메인
// ─────────────────────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS')
    return { statusCode: 200, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, headers: HEADERS, body: 'Method Not Allowed' };

  try {
    const {
      currentMajor,
      targetMajorSeq,
      targetMajorName,
      grade,
      hollandCode,
    } = JSON.parse(event.body);

    console.log('갭분석 시작:', {
      currentMajor,
      targetMajorName,
      grade,
      hollandCode,
    });

    const keyword = (targetMajorName || '')
      .replace(/학과|학부|전공|대학|계열/g, '')
      .trim();

    // 1차 병렬: 커리어넷 학과+직업
    const [majorDetail, relatedJobs] = await Promise.all([
      fetchCareernetMajorDetail(targetMajorSeq),
      fetchCareernetJobs(keyword),
    ]);

    // 2차 병렬 조회에 contests 추가
    const [recruitList, trainingList, contests] = await Promise.all([
      fetchWorknetRecruitment(keyword),
      fetchHrdTraining(keyword),
      generateContests(targetMajorName), // 추가
    ]);

    // 응답에 contests 포함
    analysis.contests = contests;

    console.log(
      `데이터 조회 완료 - 학과:${majorDetail ? 'Y' : 'N'} ` +
        `직업:${relatedJobs.length} 채용:${recruitList.length} 훈련:${trainingList.length}`,
    );

    // GPT 갭분석
    const majorInfo = majorDetail
      ? [
          majorDetail.summary
            ? `개요: ${majorDetail.summary.slice(0, 150)}`
            : '',
          majorDetail.interest
            ? `적성: ${majorDetail.interest.slice(0, 100)}`
            : '',
          majorDetail.job ? `관련직업: ${majorDetail.job.slice(0, 80)}` : '',
          majorDetail.qualifications
            ? `자격증: ${majorDetail.qualifications}`
            : '',
          majorDetail.employment ? `취업률: ${majorDetail.employment}` : '',
          majorDetail.salary ? `초임: ${majorDetail.salary}` : '',
        ]
          .filter(Boolean)
          .join(' / ')
      : `학과명: ${targetMajorName}`;

    const analysis = await generateGapAnalysis({
      currentMajor,
      targetMajorName,
      grade,
      hollandCode,
      majorInfo,
    });

    // 취업률 숫자만 파싱
    if (majorDetail?.employment) {
      const numMatch = majorDetail.employment.match(/\d+(\.\d+)?/);
      majorDetail.employment = numMatch
        ? `${numMatch[0]}%`
        : majorDetail.employment;
    }

    analysis.majorDetail = majorDetail
      ? {
          employment: majorDetail.employment || '',
          salary: majorDetail.salary || '',
          qualifications: majorDetail.qualifications || '',
          interest: majorDetail.interest || '',
          summary: (majorDetail.summary || '').slice(0, 200),
        }
      : null;

    analysis.relatedJobs = relatedJobs;
    analysis.recruitList = recruitList;
    analysis.trainingList = trainingList;

    console.log('갭분석 완료 totalScore:', analysis.totalScore);

    return {
      statusCode: 200,
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(analysis),
    };
  } catch (err) {
    console.error('갭분석 오류:', err.message);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
