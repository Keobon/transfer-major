// 커리어넷 직업백과 상세 조회 함수
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS')
    return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {
    const { jobSeq } = JSON.parse(event.body);
    const CAREERNET_KEY = '488782036227e15faccd08091610c2c9';

    const url = `https://www.career.go.kr/cnet/front/openapi/job.json?apiKey=${CAREERNET_KEY}&seq=${jobSeq}`;
    const res = await fetch(url);
    const data = await res.json();

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
