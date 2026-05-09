import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';

// ── 디자인 토큰 ─────────────────────────────────
const C = {
  bg: '#F5F2EC',
  surface: '#FFFFFF',
  green: '#1A3A2F',
  greenMid: '#2D5A45',
  greenLt: '#4A7C5F',
  cream: '#F5F2EC',
  gold: '#B8975A',
  goldLt: '#D4AF7A',
  text: '#1A1A1A',
  textSub: '#5C5C5C',
  textMuted: '#9A9A9A',
  border: '#E0DAD0',
  danger: '#8B3A3A',
};

const scoreColor = (s) => (s >= 75 ? C.greenMid : s >= 50 ? C.gold : C.danger);
const scoreLabel = (s) =>
  s >= 75 ? '전환 가능성 높음' : s >= 50 ? '준비 필요' : '도전적 목표';

function parseEmployment(str) {
  if (!str) return '정보 없음';
  const num = (str || '').match(/\d+(\.\d+)?/);
  return num ? `${num[0]}%` : str;
}

const card = {
  background: '#FFFFFF',
  border: '1px solid #E0DAD0',
  borderRadius: 12,
  padding: '20px 24px',
  marginBottom: 16,
};

const sectionTitle = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: '#2D5A45',
  margin: '0 0 16px',
};

// ── 레이더 차트 ───────────────────────────────────
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
        <path key={i} d={path} fill="none" stroke="#E0DAD0" strokeWidth={1} />
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
            stroke="#E0DAD0"
            strokeWidth={1}
          />
        );
      })}
      <path
        d={toPath(requiredPts)}
        fill="#1A3A2F18"
        stroke="#1A3A2F"
        strokeWidth={1.5}
        strokeDasharray="4,3"
      />
      <path
        d={toPath(currentPts)}
        fill="#B8975A30"
        stroke="#B8975A"
        strokeWidth={2}
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
            fontSize="9"
            fill="#5C5C5C"
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

// ── 메인 컴포넌트 ─────────────────────────────────
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

  // ── 로딩 ──────────────────────────────────────
  if (loading)
    return (
      <div
        style={{
          minHeight: '100vh',
          background: C.green,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 20,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `radial-gradient(ellipse 70% 50% at 50% 100%, ${C.greenMid} 0%, transparent 70%)`,
            opacity: 0.6,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent 18px,${C.greenMid}20 18px,${C.greenMid}20 19px),repeating-linear-gradient(90deg,transparent,transparent 18px,${C.greenMid}20 18px,${C.greenMid}20 19px)`,
          }}
        />
        <div
          style={{
            position: 'relative',
            textAlign: 'center',
            animation: 'fadeUp 0.5s ease',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              border: `2px solid ${C.gold}40`,
              borderTopColor: C.gold,
              borderRadius: '50%',
              animation: 'spin 1.2s linear infinite',
              margin: '0 auto 28px',
            }}
          />
          <p
            style={{
              color: C.cream,
              fontSize: 15,
              fontWeight: 600,
              margin: '0 0 8px',
              letterSpacing: '0.02em',
            }}
          >
            {loadingMsg}
          </p>
          <p
            style={{
              color: `${C.cream}50`,
              fontSize: 10,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}
          >
            CONNECT · VERIFY · EMPOWER
          </p>
        </div>
      </div>
    );

  // ── 오류 ──────────────────────────────────────
  if (error)
    return (
      <div
        style={{
          minHeight: '100vh',
          background: C.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 40,
            textAlign: 'center',
            maxWidth: 400,
          }}
        >
          <p style={{ color: C.danger, fontSize: 14, marginBottom: 20 }}>
            오류: {error}
          </p>
          <button
            onClick={runAnalysis}
            style={{
              padding: '12px 32px',
              borderRadius: 8,
              background: C.green,
              color: C.cream,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.06em',
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
        background: C.bg,
        fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif",
      }}
    >
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} *{box-sizing:border-box}`}</style>

      {/* ── 헤더 ───────────────────────────── */}
      <div
        style={{
          background: C.green,
          height: 56,
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent 8px,${C.greenMid}25 8px,${C.greenMid}25 9px)`,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: C.cream,
              letterSpacing: '-0.02em',
            }}
          >
            내일
          </span>
          <span
            style={{
              fontSize: 15,
              fontWeight: 300,
              color: C.gold,
              letterSpacing: '0.1em',
            }}
          >
            환승
          </span>
          <div
            style={{
              width: 1,
              height: 14,
              background: `${C.cream}25`,
              margin: '0 4px',
            }}
          />
          <span
            style={{
              fontSize: 10,
              color: `${C.cream}60`,
              letterSpacing: '0.04em',
            }}
          >
            자신과 잘맞는 일을 찾는 것
          </span>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{
            position: 'relative',
            fontSize: 10,
            padding: '6px 14px',
            border: `1px solid ${C.cream}25`,
            borderRadius: 6,
            cursor: 'pointer',
            background: 'transparent',
            color: `${C.cream}70`,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Logout
        </button>
      </div>

      {/* ── 히어로 ─────────────────────────── */}
      <div
        style={{
          background: C.green,
          padding: '44px 24px 52px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `radial-gradient(ellipse 80% 60% at 50% 110%, ${C.greenMid}70 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `repeating-conic-gradient(${C.greenMid}08 0% 25%, transparent 0% 50%)`,
            backgroundSize: '28px 28px',
            pointerEvents: 'none',
          }}
        />
        <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative' }}>
          {/* 경로 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              marginBottom: 32,
            }}
          >
            <span style={{ fontSize: 12, color: `${C.cream}60` }}>
              {profile.current_major}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 16, height: 1, background: C.gold }} />
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: C.gold,
                }}
              />
              <div style={{ width: 16, height: 1, background: C.gold }} />
            </div>
            <span style={{ fontSize: 12, color: C.cream, fontWeight: 600 }}>
              {profile.target_major}
            </span>
          </div>
          {/* 점수 */}
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontSize: 9,
                color: `${C.cream}50`,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                margin: '0 0 6px',
              }}
            >
              Transferability Score
            </p>
            <div
              style={{
                fontSize: 96,
                fontWeight: 800,
                color: C.cream,
                lineHeight: 1,
                marginBottom: 6,
                letterSpacing: '-0.04em',
              }}
            >
              {sc}
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 300,
                  color: C.gold,
                  marginLeft: 6,
                }}
              >
                /100
              </span>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 16px',
                borderRadius: 99,
                border: `1px solid ${scoreColor(sc)}50`,
                background: `${scoreColor(sc)}15`,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: scoreColor(sc),
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  color:
                    scoreColor(sc) === C.greenMid ? C.goldLt : scoreColor(sc),
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                }}
              >
                {scoreLabel(sc)}
              </span>
            </div>
            <p
              style={{
                fontSize: 13,
                color: `${C.cream}80`,
                lineHeight: 1.75,
                maxWidth: 460,
                margin: '0 auto',
              }}
            >
              {result.summary}
            </p>
          </div>
        </div>
      </div>

      {/* ── 데이터 바 ───────────────────────── */}
      {result.majorDetail &&
        (result.majorDetail.employment || result.majorDetail.salary) && (
          <div style={{ background: C.gold, padding: '0 24px' }}>
            <div
              style={{
                maxWidth: 640,
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 28,
                height: 52,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  color: C.green,
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  opacity: 0.7,
                }}
              >
                커리어넷 공식
              </span>
              {result.majorDetail.employment && (
                <div
                  style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}
                >
                  <span
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: C.green,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {parseEmployment(result.majorDetail.employment)}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: `${C.green}70`,
                      letterSpacing: '0.06em',
                    }}
                  >
                    취업률
                  </span>
                </div>
              )}
              {result.majorDetail.employment && result.majorDetail.salary && (
                <div
                  style={{ width: 1, height: 24, background: `${C.green}25` }}
                />
              )}
              {result.majorDetail.salary && (
                <div
                  style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}
                >
                  <span
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: C.green,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {result.majorDetail.salary}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: `${C.green}70`,
                      letterSpacing: '0.06em',
                    }}
                  >
                    초임
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

      {/* ── 탭 ─────────────────────────────── */}
      <div
        style={{
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
          position: 'sticky',
          top: 56,
          zIndex: 90,
        }}
      >
        <div
          style={{
            maxWidth: 640,
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
                padding: '14px 16px',
                fontSize: 11,
                fontWeight: activeTab === key ? 700 : 400,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                background: 'transparent',
                color: activeTab === key ? C.green : C.textMuted,
                border: 'none',
                borderBottom: `2px solid ${activeTab === key ? C.green : 'transparent'}`,
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

      {/* ── 탭 콘텐츠 ──────────────────────── */}
      <div
        style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 60px' }}
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
                    gap: 24,
                    marginTop: 16,
                  }}
                >
                  {[
                    { color: C.gold, label: '현재 역량' },
                    { color: C.green, label: '목표 수준' },
                  ].map((it) => (
                    <div
                      key={it.label}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <div
                        style={{
                          width: 18,
                          height: 2,
                          background: it.color,
                          borderRadius: 1,
                        }}
                      />
                      <span style={{ fontSize: 11, color: C.textSub }}>
                        {it.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.strongPoints?.length > 0 && (
              <div style={card}>
                <p style={{ ...sectionTitle, color: C.greenMid }}>강점 역량</p>
                {result.strongPoints.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: i < result.strongPoints.length - 1 ? 20 : 0,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{ fontSize: 14, fontWeight: 600, color: C.text }}
                      >
                        {s.skill}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: C.greenMid,
                        }}
                      >
                        {s.percent}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: 3,
                        background: C.border,
                        borderRadius: 2,
                        marginBottom: 8,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${s.percent}%`,
                          background: `linear-gradient(90deg, ${C.greenMid}, ${C.greenLt})`,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: C.textSub,
                        margin: 0,
                        lineHeight: 1.75,
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
                <p style={{ ...sectionTitle, color: C.danger }}>
                  보완 필요 역량
                </p>
                {result.weakPoints.map((w, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: i < result.weakPoints.length - 1 ? 20 : 0,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{ fontSize: 14, fontWeight: 600, color: C.text }}
                      >
                        {w.skill}
                      </span>
                      <span style={{ fontSize: 11, color: C.textMuted }}>
                        현재 <b style={{ color: C.danger }}>{w.current}%</b> →
                        목표 <b style={{ color: C.greenMid }}>{w.required}%</b>
                      </span>
                    </div>
                    <div
                      style={{
                        height: 3,
                        background: C.border,
                        borderRadius: 2,
                        marginBottom: 8,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          height: '100%',
                          width: `${w.required}%`,
                          background: `${C.greenMid}20`,
                          borderRadius: 2,
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          height: '100%',
                          width: `${w.current}%`,
                          background: `linear-gradient(90deg, ${C.danger}, #C45050)`,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: C.textSub,
                        margin: 0,
                        lineHeight: 1.75,
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
                    fontSize: 11,
                    color: C.textMuted,
                    margin: '-8px 0 14px',
                    letterSpacing: '0.02em',
                  }}
                >
                  방법을 선택하면 맞춤 로드맵이 생성됩니다
                </p>
                <div
                  style={{
                    display: 'inline-block',
                    fontSize: 9,
                    fontWeight: 700,
                    color: C.greenMid,
                    background: `${C.greenMid}12`,
                    borderRadius: 4,
                    padding: '3px 10px',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    marginBottom: 12,
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
                    marginBottom: 4,
                  }}
                >
                  <p style={{ ...sectionTitle, margin: 0 }}>관련 부트캠프</p>
                  <span
                    style={{
                      fontSize: 9,
                      color: C.gold,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      background: `${C.gold}15`,
                      padding: '3px 8px',
                      borderRadius: 4,
                    }}
                  >
                    국민내일배움카드
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 11,
                    color: C.textMuted,
                    margin: '4px 0 16px',
                  }}
                >
                  {profile.target_major} 관련 국비지원 훈련과정
                </p>
                {result.trainingList.slice(0, 2).map((item, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '12px 0',
                      borderBottom: i < 1 ? `1px solid ${C.border}` : 'none',
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
                          fontSize: 13,
                          fontWeight: 600,
                          color: C.text,
                          flex: 1,
                          marginRight: 8,
                          lineHeight: 1.4,
                        }}
                      >
                        {item.name}
                      </span>
                      {item.cost && (
                        <span
                          style={{
                            fontSize: 12,
                            color: C.gold,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {item.cost}
                        </span>
                      )}
                    </div>
                    {item.institution && (
                      <p
                        style={{
                          fontSize: 11,
                          color: C.textMuted,
                          margin: '4px 0 0',
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
                    padding: '10px 0',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    background: 'transparent',
                    color: C.green,
                    border: `1px solid ${C.green}`,
                    cursor: 'pointer',
                    marginTop: 14,
                  }}
                >
                  전체 보기 ({result.trainingList.length}개) →
                </button>
              </div>
            )}

            <div style={card}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 4,
                }}
              >
                <p style={{ ...sectionTitle, margin: 0 }}>관련 공모전</p>
                <span
                  style={{
                    fontSize: 9,
                    color: C.gold,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    background: `${C.gold}15`,
                    padding: '3px 8px',
                    borderRadius: 4,
                  }}
                >
                  포트폴리오 강화
                </span>
              </div>
              <p
                style={{
                  fontSize: 11,
                  color: C.textMuted,
                  margin: '4px 0 16px',
                }}
              >
                {profile.target_major} 관련 공모전으로 경쟁력을 쌓아보세요
              </p>
              {result.contests?.length > 0 ? (
                result.contests.slice(0, 2).map((c, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '12px 0',
                      borderBottom: i < 1 ? `1px solid ${C.border}` : 'none',
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
                          fontSize: 13,
                          fontWeight: 600,
                          color: C.text,
                          flex: 1,
                          marginRight: 8,
                        }}
                      >
                        {c.name}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          background: `${C.gold}15`,
                          color: C.gold,
                          padding: '2px 8px',
                          borderRadius: 4,
                          flexShrink: 0,
                          fontWeight: 700,
                        }}
                      >
                        {c.category}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 11,
                        color: C.greenMid,
                        fontWeight: 600,
                        margin: '4px 0 0',
                      }}
                    >
                      {c.organizer}
                    </p>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: 12, color: C.textMuted }}>
                  공모전 정보를 불러오는 중이에요
                </p>
              )}
              {result.contests?.length > 0 && (
                <button
                  onClick={() => setActiveTab('contests')}
                  style={{
                    width: '100%',
                    padding: '10px 0',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    background: 'transparent',
                    color: C.green,
                    border: `1px solid ${C.green}`,
                    cursor: 'pointer',
                    marginTop: 14,
                  }}
                >
                  전체 보기 →
                </button>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <a
                  href={`https://www.wevity.com/?c=find&s=${encodeURIComponent(majorKeyword)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '8px 0',
                    borderRadius: 6,
                    background: `${C.gold}15`,
                    color: C.gold,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textDecoration: 'none',
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
                    padding: '8px 0',
                    borderRadius: 6,
                    background: `${C.greenMid}10`,
                    color: C.greenMid,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textDecoration: 'none',
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
              <div style={{ marginBottom: 24 }}>
                <p style={{ ...sectionTitle, marginBottom: 10 }}>
                  전환 방법 선택
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {result.transferRoutes.map((r) => (
                    <button
                      key={r.type}
                      onClick={() => handleSelectRoute(r.type)}
                      style={{
                        flex: 1,
                        padding: '12px 0',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                        background:
                          selectedRoute === r.type ? C.green : C.surface,
                        color: selectedRoute === r.type ? C.cream : C.textSub,
                        border: `1px solid ${selectedRoute === r.type ? C.green : C.border}`,
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
              <div style={{ textAlign: 'center', padding: 48 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    border: `2px solid ${C.border}`,
                    borderTopColor: C.green,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 16px',
                  }}
                />
                <p style={{ color: C.green, fontSize: 13, fontWeight: 600 }}>
                  맞춤 로드맵 생성 중...
                </p>
                <p
                  style={{
                    color: C.textMuted,
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
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
                  style={{ display: 'flex', gap: 16, marginBottom: 20 }}
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
                        background: i === 0 ? C.green : C.surface,
                        border: `2px solid ${i === 0 ? C.green : C.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: i === 0 ? C.cream : C.textMuted,
                        fontWeight: 700,
                        fontSize: 14,
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </div>
                    {i < currentRoadmapSteps.length - 1 && (
                      <div
                        style={{
                          width: 1,
                          flex: 1,
                          background: C.border,
                          marginTop: 4,
                          minHeight: 20,
                        }}
                      />
                    )}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: '16px 20px',
                    }}
                  >
                    <p
                      style={{
                        fontSize: 9,
                        color: C.gold,
                        fontWeight: 700,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        margin: '0 0 4px',
                      }}
                    >
                      {step.period}
                    </p>
                    <p
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: C.text,
                        margin: '0 0 12px',
                      }}
                    >
                      {step.title}
                    </p>
                    {(step.actions || []).map((action, j) => (
                      <div
                        key={j}
                        style={{ display: 'flex', gap: 10, marginBottom: 6 }}
                      >
                        <span
                          style={{
                            color: C.gold,
                            fontSize: 12,
                            flexShrink: 0,
                            marginTop: 2,
                          }}
                        >
                          ▸
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            color: C.textSub,
                            lineHeight: 1.65,
                          }}
                        >
                          {action}
                        </span>
                      </div>
                    ))}
                    {step.checkpoint && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: '8px 14px',
                          background: `${C.green}08`,
                          border: `1px solid ${C.green}18`,
                          borderRadius: 6,
                          fontSize: 12,
                          color: C.greenMid,
                        }}
                      >
                        <span style={{ fontWeight: 700 }}>완료 기준: </span>
                        {step.checkpoint}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            {!roadmapLoading && currentRoadmapSteps.length === 0 && (
              <div
                style={{ textAlign: 'center', padding: 48, color: C.textMuted }}
              >
                <p style={{ fontSize: 13 }}>위에서 전환 방법을 선택하면</p>
                <p
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginTop: 4,
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
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 500,
                        background: `${C.green}08`,
                        color: C.greenMid,
                        border: `1px solid ${C.green}18`,
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
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{ fontSize: 16, fontWeight: 700, color: C.text }}
                    >
                      {job.name}
                    </span>
                    {job.wage && (
                      <span
                        style={{
                          fontSize: 12,
                          color: C.gold,
                          fontWeight: 600,
                          background: `${C.gold}15`,
                          padding: '3px 10px',
                          borderRadius: 4,
                          flexShrink: 0,
                        }}
                      >
                        {job.wage}
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: C.textSub,
                      margin: '0 0 10px',
                      lineHeight: 1.75,
                    }}
                  >
                    {job.work}
                  </p>
                  {job.wlb && (
                    <span
                      style={{
                        fontSize: 10,
                        color: C.greenMid,
                        background: `${C.greenMid}10`,
                        padding: '2px 10px',
                        borderRadius: 4,
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                      }}
                    >
                      워라밸 {job.wlb}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div
                style={{ textAlign: 'center', padding: 48, color: C.textMuted }}
              >
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
                padding: 14,
                borderRadius: 8,
                background: 'transparent',
                border: `1px solid ${C.green}`,
                color: C.green,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                marginTop: 8,
              }}
            >
              커리어넷에서 더 탐색하기 →
            </a>
          </div>
        )}

        {/* ════════ TAB: 채용공고 ════════ */}
        {activeTab === 'recruit' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <p style={{ ...sectionTitle, marginBottom: 16 }}>
              워크넷 실시간 채용공고
            </p>
            {result.recruitList?.length > 0 ? (
              result.recruitList.map((item, i) => (
                <div key={i} style={card}>
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: C.text,
                      margin: '0 0 4px',
                    }}
                  >
                    {item.title}
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: C.greenMid,
                      fontWeight: 600,
                      margin: '0 0 12px',
                    }}
                  >
                    {item.company}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      flexWrap: 'wrap',
                      marginBottom: 12,
                    }}
                  >
                    {item.region && (
                      <span
                        style={{
                          fontSize: 11,
                          background: C.bg,
                          color: C.textSub,
                          padding: '2px 8px',
                          borderRadius: 4,
                          border: `1px solid ${C.border}`,
                        }}
                      >
                        {item.region}
                      </span>
                    )}
                    {item.jobType && (
                      <span
                        style={{
                          fontSize: 11,
                          background: `${C.greenMid}10`,
                          color: C.greenMid,
                          padding: '2px 8px',
                          borderRadius: 4,
                        }}
                      >
                        {item.jobType}
                      </span>
                    )}
                    {item.salary && (
                      <span
                        style={{
                          fontSize: 11,
                          background: `${C.gold}15`,
                          color: C.gold,
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontWeight: 600,
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
                    <span style={{ fontSize: 11, color: C.textMuted }}>
                      마감: {item.endDate || '상시채용'}
                    </span>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: 12,
                          color: C.green,
                          fontWeight: 700,
                          textDecoration: 'none',
                          letterSpacing: '0.04em',
                        }}
                      >
                        공고 보기 →
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{ textAlign: 'center', padding: 48, color: C.textMuted }}
              >
                <p>현재 관련 채용공고가 없습니다</p>
              </div>
            )}
          </div>
        )}

        {/* ════════ TAB: 부트캠프 ════════ */}
        {activeTab === 'training' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <p style={{ ...sectionTitle, marginBottom: 16 }}>
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
                      e.currentTarget.style.borderColor = C.green;
                      e.currentTarget.style.boxShadow = `0 4px 20px ${C.green}12`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = C.border;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: C.text,
                        flex: 1,
                        marginRight: 12,
                        lineHeight: 1.4,
                      }}
                    >
                      {item.name}
                    </span>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexShrink: 0,
                      }}
                    >
                      {item.cost && (
                        <span
                          style={{
                            fontSize: 12,
                            color: C.gold,
                            fontWeight: 700,
                          }}
                        >
                          {item.cost}
                        </span>
                      )}
                      {item.url && (
                        <span style={{ fontSize: 11, color: C.green }}>→</span>
                      )}
                    </div>
                  </div>
                  {item.institution && (
                    <p
                      style={{
                        fontSize: 12,
                        color: C.textSub,
                        margin: '0 0 8px',
                      }}
                    >
                      {item.institution}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: 10,
                        background: `${C.gold}15`,
                        color: C.gold,
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontWeight: 700,
                      }}
                    >
                      {item.subsidy}
                    </span>
                    {item.rating && (
                      <span
                        style={{
                          fontSize: 10,
                          background: `${C.greenMid}10`,
                          color: C.greenMid,
                          padding: '2px 8px',
                          borderRadius: 4,
                        }}
                      >
                        {item.rating}
                      </span>
                    )}
                    {item.period && (
                      <span style={{ fontSize: 10, color: C.textMuted }}>
                        {item.period}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{ textAlign: 'center', padding: 48, color: C.textMuted }}
              >
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
                padding: 14,
                borderRadius: 8,
                background: 'transparent',
                border: `1px solid ${C.green}`,
                color: C.green,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                marginTop: 8,
              }}
            >
              HRD-Net에서 더 보기 →
            </a>
          </div>
        )}

        {/* ════════ TAB: 공모전 ════════ */}
        {activeTab === 'contests' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <p style={{ ...sectionTitle, marginBottom: 4 }}>관련 공모전</p>
            <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 20 }}>
              {profile.target_major} 관련 공모전 — 클릭하면 위비티에서 관련
              공모전을 검색합니다
            </p>
            {result.contests?.length > 0 ? (
              result.contests.map((c, i) => {
                const searchUrl = `https://www.wevity.com/?c=find&s=${encodeURIComponent(c.category || majorKeyword)}`;
                return (
                  <div
                    key={i}
                    onClick={() => window.open(searchUrl, '_blank')}
                    style={{
                      ...card,
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = C.gold;
                      e.currentTarget.style.boxShadow = `0 4px 20px ${C.gold}18`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = C.border;
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
                          fontSize: 14,
                          fontWeight: 700,
                          color: C.text,
                          flex: 1,
                          marginRight: 12,
                          lineHeight: 1.4,
                        }}
                      >
                        {c.name}
                      </span>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 9,
                            background: `${C.gold}15`,
                            color: C.gold,
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontWeight: 700,
                          }}
                        >
                          {c.category}
                        </span>
                        <span style={{ fontSize: 11, color: C.textMuted }}>
                          →
                        </span>
                      </div>
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: C.greenMid,
                        fontWeight: 600,
                        margin: '0 0 10px',
                      }}
                    >
                      {c.organizer}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        gap: 6,
                        flexWrap: 'wrap',
                        marginBottom: c.tip ? 10 : 0,
                      }}
                    >
                      {c.period && (
                        <span
                          style={{
                            fontSize: 10,
                            background: C.bg,
                            color: C.textSub,
                            padding: '2px 8px',
                            borderRadius: 4,
                            border: `1px solid ${C.border}`,
                          }}
                        >
                          {c.period}
                        </span>
                      )}
                      {c.benefit && (
                        <span
                          style={{
                            fontSize: 10,
                            background: `${C.greenMid}10`,
                            color: C.greenMid,
                            padding: '2px 8px',
                            borderRadius: 4,
                          }}
                        >
                          {c.benefit}
                        </span>
                      )}
                    </div>
                    {c.tip && (
                      <p
                        style={{
                          fontSize: 12,
                          color: C.textSub,
                          margin: 0,
                          lineHeight: 1.65,
                        }}
                      >
                        💡 {c.tip}
                      </p>
                    )}
                  </div>
                );
              })
            ) : (
              <div
                style={{ textAlign: 'center', padding: 48, color: C.textMuted }}
              >
                <p>관련 공모전 정보가 없습니다</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <a
                href={`https://www.wevity.com/?c=find&s=${encodeURIComponent(majorKeyword)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '12px 0',
                  borderRadius: 8,
                  background: `${C.gold}15`,
                  color: C.gold,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
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
                  borderRadius: 8,
                  background: `${C.greenMid}12`,
                  color: C.greenMid,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
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

// ── 전환방법 카드 ─────────────────────────────────
function TransferCard({ r, selected, onSelect }) {
  const diffColor =
    r.difficulty === '높음'
      ? '#8B3A3A'
      : r.difficulty === '보통'
        ? '#B8975A'
        : '#2D5A45';
  const diffBg =
    r.difficulty === '높음'
      ? '#8B3A3A15'
      : r.difficulty === '보통'
        ? '#B8975A15'
        : '#2D5A4515';
  return (
    <div
      onClick={onSelect}
      style={{
        border: `1.5px solid ${selected ? C.green : C.border}`,
        borderRadius: 10,
        padding: '14px 18px',
        marginBottom: 10,
        cursor: 'pointer',
        background: selected ? `${C.green}05` : C.surface,
        transition: 'all 0.15s',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
          {r.type}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <span
            style={{
              fontSize: 10,
              padding: '2px 8px',
              borderRadius: 4,
              background: C.bg,
              color: C.textSub,
              border: `1px solid ${C.border}`,
            }}
          >
            {r.duration}
          </span>
          <span
            style={{
              fontSize: 10,
              padding: '2px 8px',
              borderRadius: 4,
              background: diffBg,
              color: diffColor,
              fontWeight: 600,
            }}
          >
            {r.difficulty}
          </span>
        </div>
      </div>
      <p
        style={{
          fontSize: 13,
          color: C.textSub,
          margin: '0 0 10px',
          lineHeight: 1.75,
        }}
      >
        {r.desc}
      </p>
      <span
        style={{
          fontSize: 10,
          color: selected ? C.green : C.textMuted,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {selected ? '✓ 선택됨 — 로드맵 탭에서 확인' : '로드맵 보기 →'}
      </span>
    </div>
  );
}
