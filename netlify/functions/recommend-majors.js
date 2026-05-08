// 커리어넷 학과 추천 - Gemini 버전 (더 빠르고 똑똑)
const { GoogleGenerativeAI } = require('@google/generative-ai');
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
      reject(new Error('타임아웃'));
    });
  });
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const HOLLAND_TO_SUBJECT = {
  R: ['100394'],
  I: ['100395', '100394'],
  A: ['100397', '100391'],
  S: ['100393', '100392'],
  E: ['100392', '100391'],
  C: ['100392', '100394'],
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS')
    return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {
    const { hollandCode, interestScores, currentMajor, grade } = JSON.parse(
      event.body,
    );
    console.log('학과추천 시작:', { hollandCode, currentMajor, grade });

    const CAREERNET_KEY = '488782036227e15faccd08091610c2c9';
    const topHolland = (hollandCode || 'IR').slice(0, 2).split('');
    const subjectCodes = [
      ...new Set(topHolland.flatMap((h) => HOLLAND_TO_SUBJECT[h] || [])),
    ].slice(0, 2);

    // 커리어넷 학과 목록 병렬 조회
    const majorResults = await Promise.allSettled(
      subjectCodes.map((code) =>
        httpsGet(
          `https://www.career.go.kr/cnet/openapi/getOpenApi?apiKey=${CAREERNET_KEY}&svcType=api&svcCode=MAJOR&contentType=json&gubun=univ_list&subject=${code}&perPage=30&thisPage=1`,
        ),
      ),
    );

    const allMajors = [];
    for (const res of majorResults) {
      if (res.status === 'fulfilled' && res.value) {
        const data = safeJson(res.value);
        (data?.dataSearch?.content || []).forEach((m) => {
          if (m.majorSeq && m.mClass)
            allMajors.push({
              seq: String(m.majorSeq),
              name: m.mClass,
              category: m.lClass || '',
            });
        });
      }
    }

    const uniqueMajors = [
      ...new Map(allMajors.map((m) => [m.seq, m])).values(),
    ];
    console.log('수집 학과 수:', uniqueMajors.length);

    // Gemini로 5개 선별
    const geminiKey =
      process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!geminiKey) throw new Error('GEMINI_API_KEY 없음');

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const majorListText = uniqueMajors
      .slice(0, 50)
      .map((m) => `[${m.seq}] ${m.name} (${m.category})`)
      .join('\n');

    const prompt = `대학 진로 전문가. 학생에게 맞는 학과 5개 추천. 순수 JSON만 응답.

학생: ${currentMajor} ${grade}학년, 홀랜드 ${hollandCode}
흥미: R=${interestScores?.R || 0} I=${interestScores?.I || 0} A=${interestScores?.A || 0} S=${interestScores?.S || 0} E=${interestScores?.E || 0} C=${interestScores?.C || 0}

학과목록:
${majorListText}

위 목록의 seq만 사용. 마크다운 없이 순수 JSON만:
{"majors":[{"seq":"코드","name":"학과명","category":"계열","match":85,"reason":"추천이유 2문장","jobs":"직업1,직업2,직업3","keyword":"한단어"}]}`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    let parsed;
    try {
      parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('JSON 파싱 실패');
      parsed = JSON.parse(match[0]);
    }

    // 각 학과 취업률/초임 병렬 조회
    await Promise.allSettled(
      (parsed.majors || []).map(async (major) => {
        try {
          const text = await httpsGet(
            `https://www.career.go.kr/cnet/openapi/getOpenApi?apiKey=${CAREERNET_KEY}&svcType=api&svcCode=MAJOR_VIEW&contentType=json&gubun=univ_list&majorSeq=${major.seq}`,
          );
          const content = safeJson(text)?.dataSearch?.content?.[0];
          if (content) {
            major.employment = content.employment || '';
            major.salary = content.salary || '';
          }
        } catch {
          /* 무시 */
        }
      }),
    );

    console.log('학과추천 완료:', parsed.majors?.length, '개');
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    };
  } catch (err) {
    console.error('학과추천 오류:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
