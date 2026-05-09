/**
 * major-roadmap.js
 * 전환방법 선택 후 맞춤 로드맵 생성
 * 사용자가 편입/전과/복수전공 중 하나를 선택했을 때만 호출
 */

const https = require('https');

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        res.on('error', reject);
      },
    );
    req.on('error', reject);
    req.setTimeout(110000, () => {
      req.destroy();
      reject(new Error('GPT 로드맵 타임아웃'));
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
    return { statusCode: 200, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, headers: HEADERS, body: 'Method Not Allowed' };

  try {
    const {
      currentMajor, // 현재전공 (예: 정보보안)
      targetMajorName, // 목표학과 (예: 그래픽디자인학과)
      grade, // 학년
      routeType, // 선택한 전환방법: 편입 | 전과 | 복수전공
      weakPoints, // 갭분석에서 나온 보완 역량 배열
      certifications, // 갭분석에서 나온 추천 자격증
    } = JSON.parse(event.body);

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) throw new Error('OPENAI_API_KEY 없음');

    const weakList = (weakPoints || [])
      .map((w) => `${w.skill}(현재${w.current}%→목표${w.required}%)`)
      .join(', ');
    const certList = (certifications || []).join(', ');

    const routeGuide = {
      편입: `
[편입 실제 준비 방법 - 반드시 이 내용 기반으로 작성]
1. 편입 종류: 일반편입(2→3학년, 전문대/4년제 2년 이상 수료), 학사편입(학사학위 취득자, 경쟁률 낮음)
2. TO 확인: 목표 학과의 편입 모집 TO는 매년 다름. 대학 입학처 홈페이지에서 전년도 모집요강 확인 필수
3. 편입 전형: 대부분 편입영어(토익·토플 or 자체시험) + 학과별 전공시험 or 포트폴리오 + 면접
4. 준비 루트: 편입 학원(스카이편입·아이비편입 등) or 인강(에듀윌·메가편입) 등록이 일반적
5. 편입영어: 토익 850+ or 편입 전문 영어 교재(넥서스편입영어 등)로 준비
6. 전공시험: 학과별로 다름 — 이과는 편입수학, 문과·예체능은 논술·포트폴리오·실기
7. 지원 시기: 보통 매년 11월~2월 원서접수. 준비 최소 1년 필요
8. 합격 후: 편입 학점 인정 심사 → 이수 학점에 따라 3학년 or 2학년으로 배정
`,
      전과: `
[전과 실제 준비 방법 - 반드시 이 내용 기반으로 작성]
1. 전과 자격: 대부분 1학년 수료 후 가능. 재학 중인 학교 내에서만 가능
2. 학점 기준: 학교마다 다르나 보통 직전 학기 또는 전체 평점 3.0~3.5 이상 필요
3. 전과 시험/심사: 포트폴리오 심사, 면접, 필기시험 중 1~2가지 조합
4. 신청 시기: 1학기 전과는 보통 1월, 2학기 전과는 6월 신청. 학교마다 다름
5. TO: 학과별 전과 수용 인원 매우 적음(1~3명). 경쟁률 확인 필수
6. 준비 방법: 목표 학과 교수님 사전 면담 → 포트폴리오/실기 준비 → 면접 준비
7. 주의사항: 전과 후 기존 취득 학점 중 일부만 인정, 졸업 학점 다시 채워야 할 수 있음
`,
      복수전공: `
[복수전공 실제 준비 방법 - 반드시 이 내용 기반으로 작성]
1. 신청 자격: 보통 2학년 이상, 직전 학기 평점 2.0~3.0 이상 (학교마다 다름)
2. 신청 시기: 학기 초(3월, 9월) 수강신청 기간 전후로 학교 포털에서 신청
3. 이수 학점: 복수전공 졸업 요건 충족 필요 (보통 36~54학점 추가)
4. 수업 부담: 현재 전공 + 복수전공 동시 수강 → 학기당 21학점 이상 수강 각오
5. 졸업 요건: 두 전공 모두 졸업 요건 충족해야 복수전공 인정
6. 장점: 현재전공+목표전공 융합 역량으로 취업 경쟁력 강화, 리스크 가장 낮음
7. 주의사항: 일부 학과(의대·약대 등)는 복수전공 불가. 학교 학칙 먼저 확인
`,

      '부트캠프·졸업 후': `
[부트캠프·졸업 후 루트 실제 준비 방법]
1. 국민내일배움카드: 졸업 예정자·졸업자 발급 가능. 최대 500만원 훈련비 지원
2. 훈련과정 찾기: HRD-Net(www.hrd.go.kr)에서 목표 직종 관련 국비지원 부트캠프 검색
3. 주요 부트캠프: 코드스테이츠, 패스트캠퍼스, 멀티캠퍼스, 이스트소프트, 그린컴퓨터아카데미 등
4. K-디지털 트레이닝: AI·빅데이터·클라우드 등 디지털 분야 집중 훈련 (6개월~1년, 국비 100%)
5. 수료 후 취업: 부트캠프 수료 → 포트폴리오 완성 → 취업 연계 또는 자체 지원
6. 자격증 병행: 훈련 중 관련 국가자격증 취득 병행으로 서류 경쟁력 강화
`,

      '공모전·자격증': `
[공모전·자격증 루트 실제 준비 방법]
1. 공모전 플랫폼: 공모전 정보는 위비티(wevity.com), 씽굿(thinkcontest.com), 대티즌(detizen.com)에서 검색
2. 공모전 종류: 아이디어 공모전, 디자인 공모전, 광고 공모전, 창업 아이디어 등 분야별 존재
3. 자격증 취득: 목표 직무와 관련된 국가기술자격증 우선 — 큐넷(q-net.or.kr)에서 일정 확인
4. 포트폴리오 강화: 공모전 수상 실적 + 자격증 + 프리랜서 프로젝트 경험이 취업 서류에 유리
5. 재학 중 병행: 현재 전공 학점 유지하면서 방학·여가 시간 활용 가능한 리스크 낮은 루트
6. 링크드인·노션: 활동 결과를 온라인 포트폴리오로 정리해 HR 담당자에게 노출
`,
    };

    const prompt = `대학 ${routeType} 전문 컨설턴트. 순수 JSON만 반환. 마크다운 없이.

학생 정보:
- 현재전공: ${currentMajor} ${grade}학년
- 목표학과: ${targetMajorName}
- 선택한 전환방법: ${routeType}
- 보완 필요 역량: ${weakList || '없음'}
- 추천 자격증: ${certList || '없음'}

- ${
      routeType === '편입'
        ? '편입 TO 확인 → 편입학원/인강 → 편입영어 → 전공시험 → 원서 제출 절차 반영'
        : routeType === '전과'
          ? '전과 요강 확인 → 학점 관리 → 교수 면담 → 포트폴리오 → 전과 신청 절차 반영'
          : routeType === '복수전공'
            ? '복수전공 신청 → 커리큘럼 파악 → 학점 관리 → 융합 프로젝트 절차 반영'
            : routeType === '부트캠프·졸업 후'
              ? '국민내일배움카드 발급 → 부트캠프 선택 → 수강 → 포트폴리오 완성 → 취업 연계 절차 반영'
              : '공모전 참가 → 자격증 취득 → 포트폴리오 강화 → 취업 지원 절차 반영'
    }

위 실제 ${routeType} 준비 방법을 반드시 반영하여 4단계 로드맵을 작성하라.

[작성 규칙]
- actions는 실제 편입/전과/복수전공 준비생이 하는 행동만 작성. 존재하지 않는 강의명·사이트 금지.
- 편입이면: TO 확인, 편입학원/인강 등록, 편입영어 준비, 전공시험/포트폴리오, 지원서 제출 등 실제 편입 절차 반영
- 전과이면: 학교 전과 요강 확인, 학점 관리, 교수 면담, 포트폴리오/실기, 전과 신청 등 실제 절차 반영
- 복수전공이면: 학교 포털 신청, 복수전공 커리큘럼 파악, 학점 관리, 융합 프로젝트 등 실제 절차 반영
- ${targetMajorName} 학과 특성에 맞는 준비 내용 포함 (예: 디자인 계열이면 포트폴리오, 이공계면 수학/과학 준비 등)
- checkpoint는 그 단계를 완료했다는 명확하고 측정 가능한 기준

{"steps":[
  {"period":"지금~1개월","title":"제목","actions":["구체적행동1","행동2","행동3"],"checkpoint":"명확한완료기준"},
  {"period":"1~3개월","title":"제목","actions":["행동1","행동2","행동3"],"checkpoint":"완료기준"},
  {"period":"3~6개월","title":"제목","actions":["행동1","행동2","행동3"],"checkpoint":"완료기준"},
  {"period":"6개월이후","title":"제목","actions":["행동1","행동2","행동3"],"checkpoint":"완료기준"}
]}`;

    console.log(
      '로드맵 GPT 요청:',
      routeType,
      currentMajor,
      '→',
      targetMajorName,
    );

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
        temperature: 0.7,
        max_tokens: 1200,
      },
    );

    const gptData = safeJson(gptRes);
    if (!gptData) throw new Error('GPT 응답 파싱 실패');
    if (gptData.error) throw new Error('GPT 오류: ' + gptData.error.message);

    const rawText = gptData.choices?.[0]?.message?.content || '';
    let parsed;
    try {
      parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('로드맵 JSON 파싱 실패');
      parsed = JSON.parse(match[0]);
    }

    console.log('로드맵 생성 완료:', routeType, parsed.steps?.length, '단계');

    return {
      statusCode: 200,
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ routeType, steps: parsed.steps }),
    };
  } catch (err) {
    console.error('로드맵 오류:', err.message);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
