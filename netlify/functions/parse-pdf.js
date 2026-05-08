// pdf-parse ENOENT 버그 수정본
// 핵심: 최상단 require('pdf-parse') 제거 → 함수 내부에서 경로 직접 지정으로 import
// pdf-parse가 최상단에 있으면 모듈 로드 시점에 ./test/data 경로를 찾으려다 ENOENT 발생

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
    // pdf-parse를 실제 파싱 로직 파일로 직접 require (테스트 코드 우회)
    // node_modules/pdf-parse/lib/pdf-parse.js 를 직접 참조
    const pdfParse = require('pdf-parse/lib/pdf-parse.js');

    const body = JSON.parse(event.body);
    const buffer = Buffer.from(body.fileData, 'base64');
    const examType = body.examType || 'L';

    const data = await pdfParse(buffer);
    const result = parseWorknetPDF(data.text, examType);

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error('parse-pdf 오류:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

function parseWorknetPDF(text, examType) {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let rawScores = null;
  let stdScores = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\s+/g, ' ');

    if (/원\s*점\s*수/.test(line)) {
      const nums = line.match(/\d+/g);
      if (nums && nums.length >= 6) {
        rawScores = {
          R: parseInt(nums[0]),
          I: parseInt(nums[1]),
          A: parseInt(nums[2]),
          S: parseInt(nums[3]),
          E: parseInt(nums[4]),
          C: parseInt(nums[5]),
        };
      }
    }

    if (/표준점수/.test(line)) {
      const nums = line.match(/\d+/g);
      if (nums && nums.length >= 6) {
        stdScores = {
          R: parseInt(nums[0]),
          I: parseInt(nums[1]),
          A: parseInt(nums[2]),
          S: parseInt(nums[3]),
          E: parseInt(nums[4]),
          C: parseInt(nums[5]),
        };
      }
    }
  }

  // 대표 흥미 코드 파싱
  let hollandCode = null;
  const fullText = text.replace(/\s+/g, '');
  const codeMatch = fullText.match(/대표흥미코드는([RIASEC]{1,3})입니다/);
  if (codeMatch) hollandCode = codeMatch[1];

  // 성격 5요인 (L형만)
  let personality = null;
  if (examType === 'L') personality = parsePersonality(lines);

  // 상위 2개 유형
  const typeNames = {
    R: '현실형',
    I: '탐구형',
    A: '예술형',
    S: '사회형',
    E: '진취형',
    C: '관습형',
  };
  let topTypes = [];
  if (rawScores) {
    topTypes = Object.entries(rawScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([code, score]) => ({
        code,
        name: typeNames[code],
        rawScore: score,
        stdScore: stdScores?.[code] ?? null,
      }));
  }

  return {
    examType,
    hollandCode: hollandCode || topTypes.map((t) => t.code).join(''),
    rawScores,
    stdScores,
    topTypes,
    personality,
    parseSuccess: !!(rawScores && hollandCode),
  };
}

function parsePersonality(lines) {
  const result = {
    외향성: null,
    호감성: null,
    성실성: null,
    정서적불안정성: null,
    경험에대한개방성: null,
  };
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('외향성') && lines[i].includes('호감성')) {
      const scoreLines = lines.slice(i + 1, i + 15);
      const scores = [];
      for (const sl of scoreLines) {
        const nums = sl.match(/^\d{2}$/);
        if (nums) scores.push(parseInt(nums[0]));
        if (scores.length === 5) break;
      }
      if (scores.length === 5) {
        result.외향성 = scores[0];
        result.호감성 = scores[1];
        result.성실성 = scores[2];
        result.정서적불안정성 = scores[3];
        result.경험에대한개방성 = scores[4];
      }
    }
  }
  return result;
}
