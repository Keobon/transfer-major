import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import logo from '../assets/logo.png';

// ── ElevenLabs 에디토리얼 디자인 토큰 ──
const C = {
  canvas: '#f5f5f5',
  canvasSoft: '#fafafa',
  surface: '#ffffff',
  surfaceStrong: '#f0efed',
  surfaceDark: '#0c0a09',
  surfaceDarkElevated: '#1c1917',
  ink: '#0c0a09',
  primary: '#292524',
  body: '#4e4e4e',
  muted: '#777169',
  mutedSoft: '#a8a29e',
  hairline: '#e7e5e4',
  hairlineSoft: '#f0efed',
  hairlineStrong: '#d6d3d1',
  onPrimary: '#ffffff',
  onDark: '#ffffff',
  onDarkSoft: '#a8a29e',
  gMint: '#a7e5d3',
  gPeach: '#f4c5a8',
  gLavender: '#c8b8e0',
  gSky: '#a8c8e8',
  gRose: '#e8b8c4',
  success: '#16a34a',
  error: '#dc2626',
};

// ── 점수 라벨(컬러 의존 없이 텍스트로) ──
const scoreLabel = (s) =>
  s >= 75 ? '전환 가능성 높음' : s >= 50 ? '준비 필요' : '도전적 목표';

// ── 점수 액센트 컬러 — 파스텔 그라디언트 톤만 사용 ──
const scoreOrb = (s) => (s >= 75 ? C.gMint : s >= 50 ? C.gPeach : C.gRose);

function parseEmployment(str) {
  if (!str) return '정보 없음';
  const num = (str || '').match(/\d+(\.\d+)?/);
  return num ? `${num[0]}%` : str;
}

// ── 공용 카드 스타일 ──
const card = {
  background: C.surface,
  border: `1px solid ${C.hairline}`,
  borderRadius: 16,
  padding: '24px 28px',
  marginBottom: 16,
};

const sectionTitle = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: C.muted,
  margin: '0 0 18px',
};

// ── 레이더 차트 — 잉크/파스텔 톤 ──
function RadarChart({ data }) {
  const cx = 120,
    cy = 120,
    r = 80;
  const n = data.length;
  const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (val, i) => {
    const a = angle(i);
    const d = (val / 100) * r;
    return [cx + d * Math.cos(a), cy + d * Math.sin(a)];
  };
  const labelPos = (i) => {
    const a = angle(i);
    return [cx + (r + 24) * Math.cos(a), cy + (r + 24) * Math.sin(a)];
  };
  const toPath = (pts) =>
    pts
      .map(
        (p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`,
      )
      .join(' ') + 'Z';
  const circles = [25, 50, 75, 100].map((val) =>
    toPath(data.map((_, i) => point(val, i))),
  );
  const currentPts = data.map((d, i) => point(d.current, i));
  const requiredPts = data.map((d, i) => point(d.required, i));
  return (
    <svg
      width="240"
      height="240"
      viewBox="0 0 240 240"
      style={{ margin: '0 auto', display: 'block' }}
    >
      {circles.map((path, i) => (
        <path
          key={i}
          d={path}
          fill="none"
          stroke={C.hairline}
          strokeWidth={1}
        />
      ))}
      {data.map((_, i) => {
        const [x, y] = point(100, i);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke={C.hairline}
            strokeWidth={1}
          />
        );
      })}
      {/* 목표 수준 — 잉크 점선 */}
      <path
        d={toPath(requiredPts)}
        fill={`${C.ink}08`}
        stroke={C.ink}
        strokeWidth={1.2}
        strokeDasharray="4,3"
      />
      {/* 현재 역량 — 파스텔 라벤더 */}
      <path
        d={toPath(currentPts)}
        fill={`${C.gLavender}50`}
        stroke={C.primary}
        strokeWidth={1.5}
      />
      {data.map((d, i) => {
        const [lx, ly] = labelPos(i);
        return (
          <text
            key={i}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fill={C.body}
            fontFamily="'Pretendard', sans-serif"
            fontWeight="500"
          >
            {d.name}
          </text>
        );
      })}
    </svg>
  );
}

// ── 메인 컴포넌트 ──
export default function ResultPage({ session, profile, pdfResult }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState(
    '커리어넷에서 학과 데이터를 불러오는 중...',
  );
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('gap');
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [roadmapData, setRoadmapData] = useState({});
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    runAnalysis();
  }, []);

  // ── 로직 원본 유지 ──
  const runAnalysis = async () => {
    setLoading(true);
    setError('');
    try {
      setLoadingMsg('커리어넷에서 학과 정보를 조회하는 중...');
      await new Promise((r) => setTimeout(r, 500));
      setLoadingMsg('AI가 역량 갭을 분석하는 중...');
      const response = await fetch('/.netlify/functions/major-gap-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentMajor: profile.current_major,
          targetMajorSeq: profile.target_major_seq,
          targetMajorName: profile.target_major,
          grade: profile.grade,
          hollandCode: pdfResult?.hollandCode || '',
          interestScores: pdfResult?.rawScores || {},
        }),
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }
      setResult(data);
      setLoadingMsg('결과 저장 중...');
      await supabase.from('results').upsert(
        {
          user_id: session.user.id,
          transferability_score: data.totalScore,
          recommended_track:
            data.totalScore >= 75 ? 'A' : data.totalScore >= 50 ? 'B' : 'C',
          track_data: data,
        },
        { onConflict: 'user_id', ignoreDuplicates: false },
      );
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleSelectRoute = async (routeType) => {
    setSelectedRoute(routeType);
    setActiveTab('roadmap');
    if (roadmapData[routeType]) return;
    setRoadmapLoading(true);
    try {
      const res = await fetch('/.netlify/functions/major-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentMajor: profile.current_major,
          targetMajorName: profile.target_major,
          grade: profile.grade,
          routeType,
          weakPoints: result.weakPoints,
          certifications: result.certifications,
        }),
      });
      const data = await res.json();
      if (data.steps)
        setRoadmapData((prev) => ({ ...prev, [routeType]: data.steps }));
    } catch (e) {
      console.error('로드맵 로딩 실패:', e);
    }
    setRoadmapLoading(false);
  };

  // ── 로딩 ──
  if (loading)
    return (
      <div
        style={{
          minHeight: '100vh',
          background: C.surfaceDark,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 20,
          position: 'relative',
          overflow: 'hidden',
          fontFamily:
            "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif",
        }}
      >
        <style>{`
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
          @keyframes orbDrift1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(40px,-30px) scale(1.1)}}
          @keyframes orbDrift2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-30px,40px) scale(1.05)}}
        `}</style>
        {/* 파스텔 그라디언트 오브 */}
        <div
          style={{
            position: 'absolute',
            top: '15%',
            left: '15%',
            width: 420,
            height: 420,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${C.gMint}50 0%, rgba(167,229,211,0) 70%)`,
            filter: 'blur(40px)',
            animation: 'orbDrift1 10s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '15%',
            right: '15%',
            width: 380,
            height: 380,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${C.gLavender}50 0%, rgba(200,184,224,0) 70%)`,
            filter: 'blur(40px)',
            animation: 'orbDrift2 12s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'relative',
            textAlign: 'center',
            animation: 'fadeUp 0.5s ease',
          }}
        >
          {/* 로고 + 텍스트 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              marginBottom: 36,
            }}
          >
            <img
              src={logo}
              alt="Transfer Tomorrow"
              style={{ height: 40, width: 'auto', display: 'block' }}
            />
            <div
              style={{
                fontSize: 24,
                fontWeight: 300,
                color: C.onDark,
                letterSpacing: '-0.03em',
              }}
            >
              내일<span style={{ fontWeight: 500 }}>환승</span>
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              border: `1.5px solid rgba(255,255,255,0.15)`,
              borderTopColor: C.onDark,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 32px',
            }}
          />
          <p
            style={{
              color: C.onDark,
              fontSize: 16,
              fontWeight: 400,
              margin: '0 0 12px',
              letterSpacing: '0.01em',
            }}
          >
            {loadingMsg}
          </p>
          <p
            style={{
              color: C.onDarkSoft,
              fontSize: 11,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            CONNECT · VERIFY · EMPOWER
          </p>
        </div>
      </div>
    );

  // ── 오류 ──
  if (error)
    return (
      <div
        style={{
          minHeight: '100vh',
          background: C.canvas,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily:
            "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif",
        }}
      >
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.hairline}`,
            borderRadius: 16,
            padding: 48,
            textAlign: 'center',
            maxWidth: 400,
          }}
        >
          <p
            style={{
              color: C.error,
              fontSize: 14,
              marginBottom: 24,
              letterSpacing: '0.01em',
            }}
          >
            오류: {error}
          </p>
          <button
            onClick={runAnalysis}
            style={{
              padding: '10px 28px',
              height: 44,
              borderRadius: 9999,
              background: C.primary,
              color: C.onPrimary,
              border: 'none',
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: 500,
              letterSpacing: '0.01em',
            }}
          >
            다시 시도
          </button>
        </div>
      </div>
    );

  if (!result) return null;

  const sc = result.totalScore;
  const currentRoadmapSteps = selectedRoute
    ? roadmapData[selectedRoute] || []
    : [];
  const tabs = [
    { key: 'gap', label: '역량 분석' },
    { key: 'roadmap', label: '로드맵' },
    { key: 'jobs', label: '관련 직업' },
    ...(result.recruitList?.length
      ? [{ key: 'recruit', label: '채용공고' }]
      : []),
    ...(result.trainingList?.length
      ? [{ key: 'training', label: '부트캠프' }]
      : []),
    ...(result.contests?.length ? [{ key: 'contests', label: '공모전' }] : []),
  ];
  const majorKeyword = (profile.target_major || '')
    .replace(/학과|학부|전공|대학|계열/g, '')
    .trim();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.canvas,
        fontFamily:
          "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif",
      }}
    >
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes orbDrift1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(40px,-30px) scale(1.1)}}
        @keyframes orbDrift2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-30px,40px) scale(1.05)}}
        *{box-sizing:border-box}
      `}</style>

      {/* ── 헤더 — 라이트 + 로고 ── */}
      <div
        style={{
          background: C.canvas,
          height: 64,
          padding: '0 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          borderBottom: `1px solid ${C.hairline}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* 로고 모노그램 */}
          <img
            src={logo}
            alt="Transfer Tomorrow"
            style={{ height: 32, width: 'auto', display: 'block' }}
          />
          <span
            style={{
              fontSize: 18,
              fontWeight: 300,
              color: C.ink,
              letterSpacing: '-0.03em',
            }}
          >
            내일<span style={{ fontWeight: 500 }}>환승</span>
          </span>
          <div style={{ width: 1, height: 14, background: C.hairline }} />
          <span
            style={{
              fontSize: 12,
              color: C.muted,
              letterSpacing: '0.01em',
            }}
          >
            자신과 잘맞는 일을 찾는 것
          </span>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{
            fontSize: 13,
            padding: '8px 16px',
            height: 36,
            border: `1px solid ${C.hairlineStrong}`,
            borderRadius: 9999,
            cursor: 'pointer',
            background: 'transparent',
            color: C.ink,
            fontWeight: 500,
            letterSpacing: '0.01em',
          }}
        >
          Logout
        </button>
      </div>

      {/* ── 히어로 — 다크 잉크 + 그라디언트 오브 ── */}
      <div
        style={{
          background: C.surfaceDark,
          padding: '64px 24px 72px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 점수 톤 그라디언트 오브 */}
        <div
          style={{
            position: 'absolute',
            top: '10%',
            left: '15%',
            width: 380,
            height: 380,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${scoreOrb(sc)}60 0%, rgba(0,0,0,0) 70%)`,
            filter: 'blur(40px)',
            animation: 'orbDrift1 11s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '5%',
            right: '15%',
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${C.gLavender}40 0%, rgba(0,0,0,0) 70%)`,
            filter: 'blur(40px)',
            animation: 'orbDrift2 13s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />

        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
          {/* 경로 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              marginBottom: 40,
            }}
          >
            <span style={{ fontSize: 13, color: C.onDarkSoft }}>
              {profile.current_major}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 20, height: 1, background: C.onDarkSoft }} />
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M1 5h8m0 0L5 1m4 4L5 9"
                  stroke={C.onDarkSoft}
                  strokeWidth="1"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span
              style={{
                fontSize: 13,
                color: C.onDark,
                fontWeight: 500,
                letterSpacing: '-0.01em',
              }}
            >
              {profile.target_major}
            </span>
          </div>
          {/* 점수 — 디스플레이 메가(300) */}
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontSize: 11,
                color: C.onDarkSoft,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                margin: '0 0 12px',
                fontWeight: 600,
              }}
            >
              Transferability Score
            </p>
            <div
              style={{
                fontSize: 120,
                fontWeight: 300,
                color: C.onDark,
                lineHeight: 1,
                marginBottom: 12,
                letterSpacing: '-0.04em',
              }}
            >
              {sc}
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 300,
                  color: C.onDarkSoft,
                  marginLeft: 8,
                  letterSpacing: '-0.02em',
                }}
              >
                /100
              </span>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 16px',
                borderRadius: 9999,
                border: `1px solid rgba(255,255,255,0.15)`,
                background: 'rgba(255,255,255,0.04)',
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: scoreOrb(sc),
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  color: C.onDark,
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                }}
              >
                {scoreLabel(sc)}
              </span>
            </div>
            <p
              style={{
                fontSize: 15,
                color: C.onDarkSoft,
                lineHeight: 1.7,
                maxWidth: 520,
                margin: '0 auto',
                letterSpacing: '0.01em',
              }}
            >
              {result.summary}
            </p>
          </div>
        </div>
      </div>

      {/* ── 데이터 바 — 라이트 ── */}
      {result.majorDetail &&
        (result.majorDetail.employment || result.majorDetail.salary) && (
          <div
            style={{
              background: C.canvasSoft,
              borderBottom: `1px solid ${C.hairline}`,
              padding: '0 24px',
            }}
          >
            <div
              style={{
                maxWidth: 720,
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 36,
                height: 64,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: C.muted,
                  fontWeight: 600,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                }}
              >
                커리어넷 공식
              </span>
              {result.majorDetail.employment && (
                <div
                  style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}
                >
                  <span
                    style={{
                      fontSize: 28,
                      fontWeight: 300,
                      color: C.ink,
                      letterSpacing: '-0.03em',
                    }}
                  >
                    {parseEmployment(result.majorDetail.employment)}
                  </span>
                  <span style={{ fontSize: 11, color: C.muted }}>취업률</span>
                </div>
              )}
              {result.majorDetail.employment && result.majorDetail.salary && (
                <div style={{ width: 1, height: 24, background: C.hairline }} />
              )}
              {result.majorDetail.salary && (
                <div
                  style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}
                >
                  <span
                    style={{
                      fontSize: 28,
                      fontWeight: 300,
                      color: C.ink,
                      letterSpacing: '-0.03em',
                    }}
                  >
                    {result.majorDetail.salary}
                  </span>
                  <span style={{ fontSize: 11, color: C.muted }}>초임</span>
                </div>
              )}
            </div>
          </div>
        )}

      {/* ── 탭 ── */}
      <div
        style={{
          background: C.canvas,
          borderBottom: `1px solid ${C.hairline}`,
          position: 'sticky',
          top: 64,
          zIndex: 90,
        }}
      >
        <div
          className="tab-scroll"
          style={{
            maxWidth: 720,
            margin: '0 auto',
            display: 'flex',
            overflowX: 'auto',
          }}
        >
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                flex: '0 0 auto',
                padding: '18px 20px',
                fontSize: 13,
                fontWeight: activeTab === key ? 500 : 400,
                letterSpacing: '0.01em',
                background: 'transparent',
                color: activeTab === key ? C.ink : C.muted,
                border: 'none',
                borderBottom: `1.5px solid ${activeTab === key ? C.ink : 'transparent'}`,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 탭 콘텐츠 ── */}
      <div
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '32px 16px 80px',
        }}
      >
        {/* ════════ TAB: 역량 분석 ════════ */}
        {activeTab === 'gap' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            {result.skillRadar && (
              <div style={card}>
                <p style={sectionTitle}>역량 분석 레이더</p>
                <RadarChart data={result.skillRadar} />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 28,
                    marginTop: 20,
                  }}
                >
                  {[
                    { color: C.primary, label: '현재 역량', dashed: false },
                    { color: C.ink, label: '목표 수준', dashed: true },
                  ].map((it) => (
                    <div
                      key={it.label}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 20,
                          height: 2,
                          background: it.dashed
                            ? `repeating-linear-gradient(90deg, ${it.color}, ${it.color} 3px, transparent 3px, transparent 6px)`
                            : it.color,
                          borderRadius: 1,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 12,
                          color: C.body,
                          letterSpacing: '0.01em',
                        }}
                      >
                        {it.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.strongPoints?.length > 0 && (
              <div style={card}>
                <p style={sectionTitle}>강점 역량</p>
                {result.strongPoints.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: i < result.strongPoints.length - 1 ? 24 : 0,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 10,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 15,
                          fontWeight: 500,
                          color: C.ink,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {s.skill}
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: C.ink,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {s.percent}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: 4,
                        background: C.hairline,
                        borderRadius: 2,
                        marginBottom: 10,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${s.percent}%`,
                          background: `linear-gradient(90deg, ${C.gMint}, ${C.gSky})`,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <p
                      style={{
                        fontSize: 13,
                        color: C.body,
                        margin: 0,
                        lineHeight: 1.7,
                        letterSpacing: '0.01em',
                      }}
                    >
                      {s.reason}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {result.weakPoints?.length > 0 && (
              <div style={card}>
                <p style={sectionTitle}>보완 필요 역량</p>
                {result.weakPoints.map((w, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: i < result.weakPoints.length - 1 ? 24 : 0,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 10,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 15,
                          fontWeight: 500,
                          color: C.ink,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {w.skill}
                      </span>
                      <span style={{ fontSize: 12, color: C.muted }}>
                        현재{' '}
                        <span style={{ color: C.ink, fontWeight: 500 }}>
                          {w.current}%
                        </span>{' '}
                        → 목표{' '}
                        <span style={{ color: C.ink, fontWeight: 500 }}>
                          {w.required}%
                        </span>
                      </span>
                    </div>
                    <div
                      style={{
                        height: 4,
                        background: C.hairline,
                        borderRadius: 2,
                        marginBottom: 10,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          height: '100%',
                          width: `${w.required}%`,
                          background: `${C.ink}15`,
                          borderRadius: 2,
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          height: '100%',
                          width: `${w.current}%`,
                          background: `linear-gradient(90deg, ${C.gRose}, ${C.gPeach})`,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <p
                      style={{
                        fontSize: 13,
                        color: C.body,
                        margin: 0,
                        lineHeight: 1.7,
                        letterSpacing: '0.01em',
                      }}
                    >
                      {w.reason}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {result.transferRoutes?.length > 0 && (
              <div style={card}>
                <p style={sectionTitle}>전환 방법 비교</p>
                <p
                  style={{
                    fontSize: 13,
                    color: C.muted,
                    margin: '-10px 0 18px',
                    letterSpacing: '0.01em',
                  }}
                >
                  방법을 선택하면 맞춤 로드맵이 생성됩니다
                </p>
                <div
                  style={{
                    display: 'inline-block',
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.ink,
                    background: C.surfaceStrong,
                    borderRadius: 9999,
                    padding: '4px 12px',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: 14,
                  }}
                >
                  재학 중 전환
                </div>
                {result.transferRoutes.map((r, i) => (
                  <TransferCard
                    key={i}
                    r={r}
                    selected={selectedRoute === r.type}
                    onSelect={() => handleSelectRoute(r.type)}
                  />
                ))}
              </div>
            )}

            {result.trainingList?.length > 0 && (
              <div style={card}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <p style={{ ...sectionTitle, margin: 0 }}>관련 부트캠프</p>
                  <span
                    style={{
                      fontSize: 10,
                      color: C.ink,
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      background: C.surfaceStrong,
                      padding: '4px 10px',
                      borderRadius: 9999,
                    }}
                  >
                    국민내일배움카드
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: C.muted,
                    margin: '6px 0 18px',
                  }}
                >
                  {profile.target_major} 관련 국비지원 훈련과정
                </p>
                {result.trainingList.slice(0, 2).map((item, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '14px 0',
                      borderBottom: i < 1 ? `1px solid ${C.hairline}` : 'none',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: C.ink,
                          flex: 1,
                          marginRight: 10,
                          lineHeight: 1.45,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {item.name}
                      </span>
                      {item.cost && (
                        <span
                          style={{
                            fontSize: 13,
                            color: C.ink,
                            fontWeight: 500,
                            flexShrink: 0,
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {item.cost}
                        </span>
                      )}
                    </div>
                    {item.institution && (
                      <p
                        style={{
                          fontSize: 12,
                          color: C.muted,
                          margin: '6px 0 0',
                        }}
                      >
                        {item.institution}
                      </p>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setActiveTab('training')}
                  style={{
                    width: '100%',
                    padding: '10px 20px',
                    height: 40,
                    borderRadius: 9999,
                    fontSize: 13,
                    fontWeight: 500,
                    letterSpacing: '0.01em',
                    background: 'transparent',
                    color: C.ink,
                    border: `1px solid ${C.hairlineStrong}`,
                    cursor: 'pointer',
                    marginTop: 16,
                  }}
                >
                  전체 보기 ({result.trainingList.length}개)
                </button>
              </div>
            )}

            <div style={card}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <p style={{ ...sectionTitle, margin: 0 }}>관련 공모전</p>
                <span
                  style={{
                    fontSize: 10,
                    color: C.ink,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    background: C.surfaceStrong,
                    padding: '4px 10px',
                    borderRadius: 9999,
                  }}
                >
                  포트폴리오 강화
                </span>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: C.muted,
                  margin: '6px 0 18px',
                }}
              >
                {profile.target_major} 관련 공모전으로 경쟁력을 쌓아보세요
              </p>
              {result.contests?.length > 0 ? (
                result.contests.slice(0, 2).map((c, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '14px 0',
                      borderBottom: i < 1 ? `1px solid ${C.hairline}` : 'none',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: C.ink,
                          flex: 1,
                          marginRight: 10,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {c.name}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          background: C.surfaceStrong,
                          color: C.ink,
                          padding: '3px 10px',
                          borderRadius: 9999,
                          flexShrink: 0,
                          fontWeight: 500,
                          letterSpacing: '0.02em',
                        }}
                      >
                        {c.category}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: C.body,
                        fontWeight: 400,
                        margin: '6px 0 0',
                      }}
                    >
                      {c.organizer}
                    </p>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: 13, color: C.muted }}>
                  공모전 정보를 불러오는 중이에요
                </p>
              )}
              {result.contests?.length > 0 && (
                <button
                  onClick={() => setActiveTab('contests')}
                  style={{
                    width: '100%',
                    padding: '10px 20px',
                    height: 40,
                    borderRadius: 9999,
                    fontSize: 13,
                    fontWeight: 500,
                    letterSpacing: '0.01em',
                    background: 'transparent',
                    color: C.ink,
                    border: `1px solid ${C.hairlineStrong}`,
                    cursor: 'pointer',
                    marginTop: 16,
                  }}
                >
                  전체 보기
                </button>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <a
                  href={`https://www.wevity.com/?c=find&s=${encodeURIComponent(majorKeyword)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '10px 0',
                    borderRadius: 9999,
                    background: C.surfaceStrong,
                    color: C.ink,
                    fontSize: 12,
                    fontWeight: 500,
                    letterSpacing: '0.01em',
                    textDecoration: 'none',
                    border: `1px solid ${C.hairline}`,
                  }}
                >
                  위비티 검색
                </a>
                <a
                  href={`https://www.thinkcontest.com/Contest/List.aspx?keyword=${encodeURIComponent(majorKeyword)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '10px 0',
                    borderRadius: 9999,
                    background: C.surfaceStrong,
                    color: C.ink,
                    fontSize: 12,
                    fontWeight: 500,
                    letterSpacing: '0.01em',
                    textDecoration: 'none',
                    border: `1px solid ${C.hairline}`,
                  }}
                >
                  씽굿 검색
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ════════ TAB: 로드맵 ════════ */}
        {activeTab === 'roadmap' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            {result.transferRoutes && (
              <div style={{ marginBottom: 28 }}>
                <p style={{ ...sectionTitle, marginBottom: 12 }}>
                  전환 방법 선택
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  {result.transferRoutes.map((r) => (
                    <button
                      key={r.type}
                      onClick={() => handleSelectRoute(r.type)}
                      style={{
                        flex: 1,
                        padding: '12px 0',
                        height: 44,
                        borderRadius: 9999,
                        fontSize: 13,
                        fontWeight: 500,
                        letterSpacing: '0.01em',
                        background:
                          selectedRoute === r.type ? C.ink : C.surface,
                        color: selectedRoute === r.type ? C.onDark : C.ink,
                        border: `1px solid ${selectedRoute === r.type ? C.ink : C.hairlineStrong}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {r.type}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {roadmapLoading && (
              <div style={{ textAlign: 'center', padding: 56 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    border: `1.5px solid ${C.hairline}`,
                    borderTopColor: C.ink,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 18px',
                  }}
                />
                <p
                  style={{
                    color: C.ink,
                    fontSize: 14,
                    fontWeight: 500,
                    letterSpacing: '0.01em',
                  }}
                >
                  맞춤 로드맵 생성 중...
                </p>
                <p
                  style={{
                    color: C.muted,
                    fontSize: 11,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    marginTop: 6,
                  }}
                >
                  실제 준비 절차 기반
                </p>
              </div>
            )}
            {!roadmapLoading &&
              currentRoadmapSteps.map((step, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', gap: 20, marginBottom: 24 }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: i === 0 ? C.ink : C.surface,
                        border: `1px solid ${i === 0 ? C.ink : C.hairlineStrong}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: i === 0 ? C.onDark : C.ink,
                        fontWeight: 500,
                        fontSize: 14,
                        flexShrink: 0,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {i + 1}
                    </div>
                    {i < currentRoadmapSteps.length - 1 && (
                      <div
                        style={{
                          width: 1,
                          flex: 1,
                          background: C.hairline,
                          marginTop: 6,
                          minHeight: 24,
                        }}
                      />
                    )}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      background: C.surface,
                      border: `1px solid ${C.hairline}`,
                      borderRadius: 16,
                      padding: '20px 24px',
                    }}
                  >
                    <p
                      style={{
                        fontSize: 11,
                        color: C.muted,
                        fontWeight: 600,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        margin: '0 0 6px',
                      }}
                    >
                      {step.period}
                    </p>
                    <p
                      style={{
                        fontSize: 17,
                        fontWeight: 500,
                        color: C.ink,
                        margin: '0 0 14px',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {step.title}
                    </p>
                    {(step.actions || []).map((action, j) => (
                      <div
                        key={j}
                        style={{
                          display: 'flex',
                          gap: 12,
                          marginBottom: 8,
                        }}
                      >
                        <span
                          style={{
                            color: C.muted,
                            fontSize: 14,
                            flexShrink: 0,
                            marginTop: 1,
                          }}
                        >
                          ·
                        </span>
                        <span
                          style={{
                            fontSize: 14,
                            color: C.body,
                            lineHeight: 1.65,
                            letterSpacing: '0.01em',
                          }}
                        >
                          {action}
                        </span>
                      </div>
                    ))}
                    {step.checkpoint && (
                      <div
                        style={{
                          marginTop: 14,
                          padding: '10px 14px',
                          background: C.canvasSoft,
                          border: `1px solid ${C.hairline}`,
                          borderRadius: 12,
                          fontSize: 13,
                          color: C.body,
                          letterSpacing: '0.01em',
                        }}
                      >
                        <span style={{ fontWeight: 500, color: C.ink }}>
                          완료 기준:{' '}
                        </span>
                        {step.checkpoint}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            {!roadmapLoading && currentRoadmapSteps.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: 56,
                  color: C.muted,
                }}
              >
                <p style={{ fontSize: 14 }}>위에서 전환 방법을 선택하면</p>
                <p
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    marginTop: 6,
                  }}
                >
                  맞춤 로드맵이 생성됩니다
                </p>
              </div>
            )}
            {!roadmapLoading && result.certifications?.length > 0 && (
              <div style={{ ...card, marginTop: 8 }}>
                <p style={sectionTitle}>추천 자격증</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {result.certifications.map((cert, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 9999,
                        fontSize: 13,
                        fontWeight: 400,
                        background: C.surfaceStrong,
                        color: C.ink,
                        border: `1px solid ${C.hairline}`,
                        letterSpacing: '0.01em',
                      }}
                    >
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════ TAB: 관련 직업 ════════ */}
        {activeTab === 'jobs' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            {result.relatedJobs?.length > 0 ? (
              result.relatedJobs.map((job, i) => (
                <div key={i} style={card}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 500,
                        color: C.ink,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {job.name}
                    </span>
                    {job.wage && (
                      <span
                        style={{
                          fontSize: 13,
                          color: C.ink,
                          fontWeight: 500,
                          background: C.surfaceStrong,
                          padding: '4px 12px',
                          borderRadius: 9999,
                          flexShrink: 0,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {job.wage}
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 14,
                      color: C.body,
                      margin: '0 0 12px',
                      lineHeight: 1.7,
                      letterSpacing: '0.01em',
                    }}
                  >
                    {job.work}
                  </p>
                  {job.wlb && (
                    <span
                      style={{
                        fontSize: 11,
                        color: C.ink,
                        background: C.surfaceStrong,
                        padding: '4px 12px',
                        borderRadius: 9999,
                        fontWeight: 500,
                        letterSpacing: '0.02em',
                      }}
                    >
                      워라밸 {job.wlb}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: 56, color: C.muted }}>
                <p>관련 직업 정보를 불러올 수 없어요</p>
              </div>
            )}
            <a
              href="https://www.career.go.kr"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '12px 24px',
                height: 44,
                lineHeight: '20px',
                borderRadius: 9999,
                background: 'transparent',
                border: `1px solid ${C.hairlineStrong}`,
                color: C.ink,
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.01em',
                textDecoration: 'none',
                marginTop: 8,
              }}
            >
              커리어넷에서 더 탐색하기
            </a>
          </div>
        )}

        {/* ════════ TAB: 채용공고 ════════ */}
        {activeTab === 'recruit' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <p style={{ ...sectionTitle, marginBottom: 18 }}>
              워크넷 실시간 채용공고
            </p>
            {result.recruitList?.length > 0 ? (
              result.recruitList.map((item, i) => (
                <div key={i} style={card}>
                  <p
                    style={{
                      fontSize: 16,
                      fontWeight: 500,
                      color: C.ink,
                      margin: '0 0 6px',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {item.title}
                  </p>
                  <p
                    style={{
                      fontSize: 14,
                      color: C.body,
                      fontWeight: 400,
                      margin: '0 0 14px',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {item.company}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      flexWrap: 'wrap',
                      marginBottom: 14,
                    }}
                  >
                    {item.region && (
                      <span
                        style={{
                          fontSize: 11,
                          background: C.surfaceStrong,
                          color: C.ink,
                          padding: '4px 10px',
                          borderRadius: 9999,
                          letterSpacing: '0.01em',
                        }}
                      >
                        {item.region}
                      </span>
                    )}
                    {item.jobType && (
                      <span
                        style={{
                          fontSize: 11,
                          background: C.surfaceStrong,
                          color: C.ink,
                          padding: '4px 10px',
                          borderRadius: 9999,
                          letterSpacing: '0.01em',
                        }}
                      >
                        {item.jobType}
                      </span>
                    )}
                    {item.salary && (
                      <span
                        style={{
                          fontSize: 11,
                          background: C.surfaceStrong,
                          color: C.ink,
                          padding: '4px 10px',
                          borderRadius: 9999,
                          fontWeight: 500,
                          letterSpacing: '0.01em',
                        }}
                      >
                        {item.salary}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 12, color: C.muted }}>
                      마감: {item.endDate || '상시채용'}
                    </span>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: 13,
                          color: C.ink,
                          fontWeight: 500,
                          textDecoration: 'underline',
                          textUnderlineOffset: 3,
                          letterSpacing: '0.01em',
                        }}
                      >
                        공고 보기
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: 56, color: C.muted }}>
                <p>현재 관련 채용공고가 없습니다</p>
              </div>
            )}
          </div>
        )}

        {/* ════════ TAB: 부트캠프 ════════ */}
        {activeTab === 'training' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <p style={{ ...sectionTitle, marginBottom: 18 }}>
              국민내일배움카드 부트캠프 · 훈련과정
            </p>
            {result.trainingList?.length > 0 ? (
              result.trainingList.map((item, i) => (
                <div
                  key={i}
                  onClick={() => item.url && window.open(item.url, '_blank')}
                  style={{
                    ...card,
                    cursor: item.url ? 'pointer' : 'default',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (item.url) {
                      e.currentTarget.style.borderColor = C.ink;
                      e.currentTarget.style.boxShadow =
                        '0 4px 16px rgba(0,0,0,0.04)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = C.hairline;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 500,
                        color: C.ink,
                        flex: 1,
                        marginRight: 14,
                        lineHeight: 1.45,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {item.name}
                    </span>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        flexShrink: 0,
                      }}
                    >
                      {item.cost && (
                        <span
                          style={{
                            fontSize: 13,
                            color: C.ink,
                            fontWeight: 500,
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {item.cost}
                        </span>
                      )}
                    </div>
                  </div>
                  {item.institution && (
                    <p
                      style={{
                        fontSize: 13,
                        color: C.body,
                        margin: '0 0 10px',
                        letterSpacing: '0.01em',
                      }}
                    >
                      {item.institution}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: 11,
                        background: C.surfaceStrong,
                        color: C.ink,
                        padding: '4px 10px',
                        borderRadius: 9999,
                        fontWeight: 500,
                        letterSpacing: '0.02em',
                      }}
                    >
                      {item.subsidy}
                    </span>
                    {item.rating && (
                      <span
                        style={{
                          fontSize: 11,
                          background: C.surfaceStrong,
                          color: C.ink,
                          padding: '4px 10px',
                          borderRadius: 9999,
                          letterSpacing: '0.01em',
                        }}
                      >
                        {item.rating}
                      </span>
                    )}
                    {item.period && (
                      <span
                        style={{
                          fontSize: 11,
                          color: C.muted,
                          padding: '4px 0',
                          letterSpacing: '0.01em',
                        }}
                      >
                        {item.period}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: 56, color: C.muted }}>
                <p>현재 관련 훈련과정이 없습니다</p>
              </div>
            )}
            <a
              href="https://www.hrd.go.kr"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '12px 24px',
                height: 44,
                lineHeight: '20px',
                borderRadius: 9999,
                background: 'transparent',
                border: `1px solid ${C.hairlineStrong}`,
                color: C.ink,
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.01em',
                textDecoration: 'none',
                marginTop: 8,
              }}
            >
              HRD-Net에서 더 보기
            </a>
          </div>
        )}

        {/* ════════ TAB: 공모전 ════════ */}
        {/* 공모전 카드 클릭으로 외부 링크 이동 기능 제거 */}
        {/* 하단의 명시적 "위비티/씽굿에서 더 찾기" 버튼은 사용자가 직접 검색 진입할 때만 사용되도록 유지 */}
        {activeTab === 'contests' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <p style={{ ...sectionTitle, marginBottom: 6 }}>관련 공모전</p>
            <p
              style={{
                fontSize: 12,
                color: C.muted,
                marginBottom: 24,
                letterSpacing: '0.01em',
              }}
            >
              {profile.target_major} 관련 공모전 정보입니다
            </p>
            {result.contests?.length > 0 ? (
              result.contests.map((c, i) => (
                <div key={i} style={card}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 500,
                        color: C.ink,
                        flex: 1,
                        marginRight: 14,
                        lineHeight: 1.45,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {c.name}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        background: C.surfaceStrong,
                        color: C.ink,
                        padding: '3px 10px',
                        borderRadius: 9999,
                        fontWeight: 500,
                        flexShrink: 0,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {c.category}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: C.body,
                      fontWeight: 400,
                      margin: '0 0 12px',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {c.organizer}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      flexWrap: 'wrap',
                      marginBottom: c.tip ? 12 : 0,
                    }}
                  >
                    {c.period && (
                      <span
                        style={{
                          fontSize: 11,
                          background: C.surfaceStrong,
                          color: C.ink,
                          padding: '4px 10px',
                          borderRadius: 9999,
                          letterSpacing: '0.01em',
                        }}
                      >
                        {c.period}
                      </span>
                    )}
                    {c.benefit && (
                      <span
                        style={{
                          fontSize: 11,
                          background: C.surfaceStrong,
                          color: C.ink,
                          padding: '4px 10px',
                          borderRadius: 9999,
                          letterSpacing: '0.01em',
                        }}
                      >
                        {c.benefit}
                      </span>
                    )}
                  </div>
                  {c.tip && (
                    <p
                      style={{
                        fontSize: 13,
                        color: C.body,
                        margin: 0,
                        lineHeight: 1.65,
                        letterSpacing: '0.01em',
                      }}
                    >
                      {c.tip}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: 56, color: C.muted }}>
                <p>관련 공모전 정보가 없습니다</p>
              </div>
            )}
            {/* 명시적 외부 검색 진입 버튼만 유지 */}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <a
                href={`https://www.wevity.com/?c=find&s=${encodeURIComponent(majorKeyword)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '12px 0',
                  height: 44,
                  lineHeight: '20px',
                  borderRadius: 9999,
                  background: 'transparent',
                  border: `1px solid ${C.hairlineStrong}`,
                  color: C.ink,
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                  textDecoration: 'none',
                }}
              >
                위비티에서 더 찾기
              </a>
              <a
                href={`https://www.thinkcontest.com/Contest/List.aspx?keyword=${encodeURIComponent(majorKeyword)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '12px 0',
                  height: 44,
                  lineHeight: '20px',
                  borderRadius: 9999,
                  background: 'transparent',
                  border: `1px solid ${C.hairlineStrong}`,
                  color: C.ink,
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                  textDecoration: 'none',
                }}
              >
                씽굿에서 더 찾기
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 전환방법 카드 ──
function TransferCard({ r, selected, onSelect }) {
  return (
    <div
      onClick={onSelect}
      style={{
        border: `1px solid ${selected ? C.ink : C.hairline}`,
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 10,
        cursor: 'pointer',
        background: selected ? C.canvasSoft : C.surface,
        transition: 'all 0.15s',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: C.ink,
            letterSpacing: '-0.01em',
          }}
        >
          {r.type}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              padding: '3px 10px',
              borderRadius: 9999,
              background: C.surfaceStrong,
              color: C.ink,
              fontWeight: 500,
              letterSpacing: '0.01em',
            }}
          >
            {r.duration}
          </span>
          <span
            style={{
              fontSize: 11,
              padding: '3px 10px',
              borderRadius: 9999,
              background: C.surfaceStrong,
              color: C.ink,
              fontWeight: 500,
              letterSpacing: '0.01em',
            }}
          >
            {r.difficulty}
          </span>
        </div>
      </div>
      <p
        style={{
          fontSize: 14,
          color: C.body,
          margin: '0 0 12px',
          lineHeight: 1.7,
          letterSpacing: '0.01em',
        }}
      >
        {r.desc}
      </p>
      <span
        style={{
          fontSize: 11,
          color: selected ? C.ink : C.muted,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        {selected ? '✓ 선택됨 — 로드맵 탭에서 확인' : '로드맵 보기'}
      </span>
    </div>
  );
}
