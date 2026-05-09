import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';

const scoreLabel = (s) =>
  s >= 75 ? '전환 가능성 높음' : s >= 50 ? '준비 필요' : '도전적 목표';
const scoreGradient = (s) =>
  s >= 75
    ? '135deg, #059669, #10b981'
    : s >= 50
      ? '135deg, #d97706, #f59e0b'
      : '135deg, #dc2626, #ef4444';

function parseEmployment(str) {
  if (!str) return '정보 없음';
  const num = (str || '').match(/\d+(\.\d+)?/);
  return num ? `${num[0]}%` : str;
}

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
    return [cx + (r + 22) * Math.cos(a), cy + (r + 22) * Math.sin(a)];
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
        <path key={i} d={path} fill="none" stroke="#e5e7eb" strokeWidth={1} />
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
            stroke="#e5e7eb"
            strokeWidth={1}
          />
        );
      })}
      <path
        d={toPath(requiredPts)}
        fill="rgba(124,58,237,0.1)"
        stroke="#7c3aed"
        strokeWidth={1.5}
        strokeDasharray="4,2"
      />
      <path
        d={toPath(currentPts)}
        fill="rgba(79,70,229,0.2)"
        stroke="#4f46e5"
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
            fill="#374151"
            fontFamily="sans-serif"
          >
            {d.name}
          </text>
        );
      })}
    </svg>
  );
}

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
      await supabase
        .from('results')
        .upsert(
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

  if (loading)
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f8f7ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            border: '4px solid #ede9fe',
            borderTopColor: '#7c3aed',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#7c3aed', fontSize: 14, fontWeight: 500 }}>
          {loadingMsg}
        </p>
        <p style={{ color: '#a78bfa', fontSize: 12 }}>
          커리어넷 + 워크넷 실제 데이터로 분석 중이에요
        </p>
      </div>
    );

  if (error)
    return (
      <div
        style={{
          maxWidth: 560,
          margin: '80px auto',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#ef4444', marginBottom: 16 }}>오류: {error}</p>
        <button
          onClick={runAnalysis}
          style={{
            padding: '10px 24px',
            borderRadius: 8,
            background: '#7c3aed',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          다시 시도
        </button>
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
      ? [{ key: 'training', label: '훈련과정' }]
      : []),
  ];
  const majorKeyword = (profile.target_major || '')
    .replace(/학과|학부|전공|대학|계열/g, '')
    .trim();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8f7ff',
        fontFamily: "'Pretendard', sans-serif",
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid #ede9fe',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>
              환
            </span>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1e1b4b' }}>
            분석 결과
          </span>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{
            fontSize: 12,
            padding: '6px 12px',
            border: '1px solid #ede9fe',
            borderRadius: 6,
            cursor: 'pointer',
            background: '#fff',
            color: '#7c3aed',
          }}
        >
          로그아웃
        </button>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
        {/* 경로 표시 */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              background: '#fff',
              border: '1px solid #ede9fe',
              borderRadius: 99,
              padding: '8px 20px',
            }}
          >
            <span style={{ fontSize: 14, color: '#6b7280' }}>
              {profile.current_major}
            </span>
            <span style={{ fontSize: 18, color: '#a78bfa' }}>→</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#7c3aed' }}>
              {profile.target_major}
            </span>
          </div>
        </div>

        {/* 종합 점수 카드 */}
        <div
          style={{
            background: `linear-gradient(${scoreGradient(sc)})`,
            borderRadius: 20,
            padding: 32,
            textAlign: 'center',
            marginBottom: 20,
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          }}
        >
          <p
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.8)',
              margin: '0 0 8px',
            }}
          >
            전환 가능성 점수
          </p>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1,
              marginBottom: 6,
            }}
          >
            {sc}
          </div>
          <div
            style={{
              fontSize: 16,
              color: 'rgba(255,255,255,0.9)',
              marginBottom: 12,
            }}
          >
            {scoreLabel(sc)}
          </div>
          <p
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.85)',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {result.summary}
          </p>
        </div>

        {/* 커리어넷 실제 데이터 */}
        {result.majorDetail && (
          <div
            style={{
              background: '#fff',
              border: '1px solid #ede9fe',
              borderRadius: 14,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <p
              style={{
                fontSize: 12,
                color: '#7c3aed',
                fontWeight: 600,
                margin: '0 0 10px',
              }}
            >
              커리어넷 실제 데이터
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              {result.majorDetail.employment && (
                <div
                  style={{
                    flex: 1,
                    background: '#f0fdf4',
                    borderRadius: 10,
                    padding: 12,
                    textAlign: 'center',
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      color: '#059669',
                      margin: '0 0 4px',
                    }}
                  >
                    취업률
                  </p>
                  <p
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: '#166534',
                      margin: 0,
                    }}
                  >
                    {parseEmployment(result.majorDetail.employment)}
                  </p>
                </div>
              )}
              {result.majorDetail.salary && (
                <div
                  style={{
                    flex: 1,
                    background: '#fffbeb',
                    borderRadius: 10,
                    padding: 12,
                    textAlign: 'center',
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      color: '#d97706',
                      margin: '0 0 4px',
                    }}
                  >
                    졸업 후 초임
                  </p>
                  <p
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#92400e',
                      margin: 0,
                    }}
                  >
                    {result.majorDetail.salary}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 탭 네비게이션 */}
        <div
          style={{
            display: 'flex',
            background: '#fff',
            border: '1px solid #ede9fe',
            borderRadius: 12,
            padding: 4,
            marginBottom: 20,
            gap: 4,
            overflowX: 'auto',
          }}
        >
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                flex: '0 0 auto',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: activeTab === key ? 700 : 400,
                background: activeTab === key ? '#7c3aed' : 'transparent',
                color: activeTab === key ? '#fff' : '#6b7280',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════
            TAB: 역량 분석
        ══════════════════════════════════ */}
        {activeTab === 'gap' && (
          <div>
            {/* 레이더 차트 */}
            {result.skillRadar && (
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #ede9fe',
                  borderRadius: 14,
                  padding: 20,
                  marginBottom: 16,
                }}
              >
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#1e1b4b',
                    margin: '0 0 16px',
                  }}
                >
                  역량 분석 레이더
                </h3>
                <RadarChart data={result.skillRadar} />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 20,
                    marginTop: 12,
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 3,
                        background: '#4f46e5',
                        borderRadius: 2,
                      }}
                    />
                    <span style={{ fontSize: 11, color: '#6b7280' }}>현재</span>
                  </div>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 3,
                        background: '#7c3aed',
                        borderRadius: 2,
                      }}
                    />
                    <span style={{ fontSize: 11, color: '#6b7280' }}>목표</span>
                  </div>
                </div>
              </div>
            )}

            {/* 강점 역량 */}
            {result.strongPoints?.length > 0 && (
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #ede9fe',
                  borderRadius: 14,
                  padding: 20,
                  marginBottom: 16,
                }}
              >
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#059669',
                    margin: '0 0 14px',
                  }}
                >
                  강점 역량
                </h3>
                {result.strongPoints.map((s, i) => (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#1e1b4b',
                        }}
                      >
                        {s.skill}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: '#059669',
                          fontWeight: 600,
                        }}
                      >
                        {s.percent}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        background: '#e5e7eb',
                        borderRadius: 3,
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${s.percent}%`,
                          background:
                            'linear-gradient(90deg, #059669, #34d399)',
                          borderRadius: 3,
                          transition: 'width 0.5s',
                        }}
                      />
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: '#6b7280',
                        margin: '6px 0 0',
                        lineHeight: 1.6,
                      }}
                    >
                      {s.reason}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* 보완 역량 */}
            {result.weakPoints?.length > 0 && (
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #ede9fe',
                  borderRadius: 14,
                  padding: 20,
                  marginBottom: 16,
                }}
              >
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#ef4444',
                    margin: '0 0 14px',
                  }}
                >
                  보완 필요 역량
                </h3>
                {result.weakPoints.map((w, i) => (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#1e1b4b',
                        }}
                      >
                        {w.skill}
                      </span>
                      <span style={{ fontSize: 11, color: '#ef4444' }}>
                        현재 {w.current}% → 목표 {w.required}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        background: '#e5e7eb',
                        borderRadius: 3,
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${w.current}%`,
                          background:
                            'linear-gradient(90deg, #ef4444, #f97316)',
                          borderRadius: 3,
                        }}
                      />
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: '#6b7280',
                        margin: '6px 0 0',
                        lineHeight: 1.6,
                      }}
                    >
                      {w.reason}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* 전환 방법 비교 */}
            {result.transferRoutes?.length > 0 && (
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #ede9fe',
                  borderRadius: 14,
                  padding: 20,
                  marginBottom: 16,
                }}
              >
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#1e1b4b',
                    margin: '0 0 4px',
                  }}
                >
                  전환 방법 비교
                </h3>
                <p
                  style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 12px' }}
                >
                  방법을 선택하면 맞춤 로드맵이 제공됩니다
                </p>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#7c3aed',
                    background: '#f5f3ff',
                    borderRadius: 6,
                    padding: '4px 10px',
                    marginBottom: 12,
                    display: 'inline-block',
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

            {/* 관련 부트캠프 · 훈련과정 (HRD-Net 연계) */}
            {result.trainingList?.length > 0 && (
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #ede9fe',
                  borderRadius: 14,
                  padding: 20,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <h3
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#1e1b4b',
                      margin: 0,
                    }}
                  >
                    관련 부트캠프 · 훈련과정
                  </h3>
                  <span
                    style={{
                      fontSize: 11,
                      background: '#f5f3ff',
                      color: '#7c3aed',
                      padding: '3px 8px',
                      borderRadius: 99,
                    }}
                  >
                    국민내일배움카드
                  </span>
                </div>
                <p
                  style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 14px' }}
                >
                  {profile.target_major} 관련 국비지원 훈련과정이에요
                </p>
                {result.trainingList.slice(0, 3).map((item, i) => (
                  <div
                    key={i}
                    style={{
                      border: '1px solid #f3f4f6',
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#1e1b4b',
                          flex: 1,
                          marginRight: 8,
                        }}
                      >
                        {item.name}
                      </span>
                      {item.cost && (
                        <span
                          style={{
                            fontSize: 11,
                            background: '#fffbeb',
                            color: '#d97706',
                            padding: '2px 8px',
                            borderRadius: 99,
                            flexShrink: 0,
                            fontWeight: 600,
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
                          color: '#6b7280',
                          margin: '0 0 6px',
                        }}
                      >
                        {item.institution}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: 11,
                          background: '#f5f3ff',
                          color: '#7c3aed',
                          padding: '2px 6px',
                          borderRadius: 99,
                        }}
                      >
                        {item.subsidy}
                      </span>
                      {item.rating && (
                        <span
                          style={{
                            fontSize: 11,
                            background: '#f0fdf4',
                            color: '#059669',
                            padding: '2px 6px',
                            borderRadius: 99,
                          }}
                        >
                          {item.rating}
                        </span>
                      )}
                      {item.period && (
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>
                          {item.period}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => setActiveTab('training')}
                  style={{
                    width: '100%',
                    padding: '10px 0',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    background: 'transparent',
                    color: '#7c3aed',
                    border: '1.5px solid #7c3aed',
                    cursor: 'pointer',
                    marginTop: 4,
                  }}
                >
                  전체 훈련과정 보기 ({result.trainingList.length}개) →
                </button>
              </div>
            )}

            {/* ── 관련 공모전 (GPT 생성 실제 공모전) ── */}
            <div
              style={{
                background: '#fff',
                border: '1px solid #ede9fe',
                borderRadius: 14,
                padding: 20,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 4,
                }}
              >
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#1e1b4b',
                    margin: 0,
                  }}
                >
                  관련 공모전
                </h3>
                <span
                  style={{
                    fontSize: 11,
                    background: '#fef3c7',
                    color: '#92400e',
                    padding: '3px 8px',
                    borderRadius: 99,
                  }}
                >
                  포트폴리오 강화
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 14px' }}>
                {profile.target_major} 관련 공모전 참가로 포트폴리오를
                쌓아보세요
              </p>

              {result.contests?.length > 0 ? (
                result.contests.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      border: '1px solid #f3f4f6',
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 8,
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
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#1e1b4b',
                          flex: 1,
                          marginRight: 8,
                        }}
                      >
                        {c.name}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          background: '#fef3c7',
                          color: '#92400e',
                          padding: '2px 8px',
                          borderRadius: 99,
                          flexShrink: 0,
                        }}
                      >
                        {c.category}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: '#7c3aed',
                        fontWeight: 500,
                        margin: '0 0 4px',
                      }}
                    >
                      {c.organizer}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        flexWrap: 'wrap',
                        marginBottom: 6,
                      }}
                    >
                      {c.period && (
                        <span
                          style={{
                            fontSize: 11,
                            background: '#f3f4f6',
                            color: '#6b7280',
                            padding: '2px 8px',
                            borderRadius: 99,
                          }}
                        >
                          {c.period}
                        </span>
                      )}
                      {c.benefit && (
                        <span
                          style={{
                            fontSize: 11,
                            background: '#f0fdf4',
                            color: '#059669',
                            padding: '2px 8px',
                            borderRadius: 99,
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
                          color: '#6b7280',
                          margin: 0,
                          lineHeight: 1.5,
                        }}
                      >
                        💡 {c.tip}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p
                  style={{
                    fontSize: 12,
                    color: '#9ca3af',
                    textAlign: 'center',
                    padding: '16px 0',
                  }}
                >
                  관련 공모전 정보를 불러오는 중이에요
                </p>
              )}

              {/* 공모전 더 찾기 버튼 */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <a
                  href={`https://www.wevity.com/?c=find&s=${encodeURIComponent(majorKeyword)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '8px 0',
                    borderRadius: 8,
                    background: '#fef3c7',
                    color: '#92400e',
                    fontSize: 12,
                    fontWeight: 600,
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
                    padding: '8px 0',
                    borderRadius: 8,
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  씽굿에서 더 찾기
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════
            TAB: 로드맵
        ══════════════════════════════════ */}
        {activeTab === 'roadmap' && (
          <div>
            {result.transferRoutes && (
              <div style={{ marginBottom: 20 }}>
                <p
                  style={{
                    fontSize: 11,
                    color: '#7c3aed',
                    fontWeight: 600,
                    margin: '0 0 8px',
                  }}
                >
                  전환 방법 선택
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {result.transferRoutes.map((r) => (
                    <button
                      key={r.type}
                      onClick={() => handleSelectRoute(r.type)}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 600,
                        background:
                          selectedRoute === r.type ? '#7c3aed' : '#fff',
                        color: selectedRoute === r.type ? '#fff' : '#6b7280',
                        border:
                          selectedRoute === r.type
                            ? 'none'
                            : '1px solid #ede9fe',
                        cursor: 'pointer',
                      }}
                    >
                      {r.type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {roadmapLoading && (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    border: '3px solid #ede9fe',
                    borderTopColor: '#7c3aed',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 12px',
                  }}
                />
                <p style={{ color: '#7c3aed', fontSize: 14 }}>
                  AI가 맞춤 로드맵을 생성하는 중...
                </p>
                <p style={{ color: '#a78bfa', fontSize: 12 }}>
                  실제 준비 절차 기반으로 작성 중이에요
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
                        background:
                          i === 0
                            ? 'linear-gradient(135deg, #7c3aed, #4f46e5)'
                            : '#fff',
                        border: i === 0 ? 'none' : '2px solid #ede9fe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: i === 0 ? '#fff' : '#7c3aed',
                        fontWeight: 700,
                        fontSize: 15,
                      }}
                    >
                      {i + 1}
                    </div>
                    {i < currentRoadmapSteps.length - 1 && (
                      <div
                        style={{
                          width: 2,
                          flex: 1,
                          background: '#ede9fe',
                          marginTop: 4,
                        }}
                      />
                    )}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      background: '#fff',
                      border: '1px solid #ede9fe',
                      borderRadius: 14,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: '#7c3aed',
                        fontWeight: 600,
                        marginBottom: 4,
                      }}
                    >
                      {step.period}
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#1e1b4b',
                        marginBottom: 10,
                      }}
                    >
                      {step.title}
                    </div>
                    {(step.actions || []).map((action, j) => (
                      <div
                        key={j}
                        style={{ display: 'flex', gap: 8, marginBottom: 6 }}
                      >
                        <span
                          style={{
                            color: '#a78bfa',
                            fontSize: 13,
                            flexShrink: 0,
                          }}
                        >
                          ▸
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            color: '#4b5563',
                            lineHeight: 1.5,
                          }}
                        >
                          {action}
                        </span>
                      </div>
                    ))}
                    {step.checkpoint && (
                      <div
                        style={{
                          marginTop: 10,
                          padding: '8px 12px',
                          background: '#f5f3ff',
                          borderRadius: 8,
                          fontSize: 12,
                          color: '#7c3aed',
                        }}
                      >
                        완료 기준: {step.checkpoint}
                      </div>
                    )}
                  </div>
                </div>
              ))}

            {!roadmapLoading && currentRoadmapSteps.length === 0 && (
              <div
                style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}
              >
                <p style={{ marginBottom: 8 }}>위에서 전환 방법을 선택하면</p>
                <p>맞춤 로드맵이 생성됩니다</p>
              </div>
            )}

            {!roadmapLoading && result.certifications?.length > 0 && (
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #ede9fe',
                  borderRadius: 14,
                  padding: 20,
                  marginTop: 8,
                }}
              >
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#1e1b4b',
                    margin: '0 0 12px',
                  }}
                >
                  추천 자격증
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {result.certifications.map((cert, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 99,
                        fontSize: 13,
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
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

        {/* ══════════════════════════════════
            TAB: 관련 직업 (커리어넷)
        ══════════════════════════════════ */}
        {activeTab === 'jobs' && (
          <div>
            {result.relatedJobs?.length > 0 ? (
              result.relatedJobs.map((job, i) => (
                <div
                  key={i}
                  style={{
                    background: '#fff',
                    border: '1px solid #ede9fe',
                    borderRadius: 14,
                    padding: 18,
                    marginBottom: 12,
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
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#1e1b4b',
                      }}
                    >
                      {job.name}
                    </div>
                    {job.wage && (
                      <span
                        style={{
                          fontSize: 12,
                          color: '#d97706',
                          background: '#fffbeb',
                          padding: '3px 10px',
                          borderRadius: 99,
                        }}
                      >
                        {job.wage}
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: '#6b7280',
                      margin: '0 0 8px',
                      lineHeight: 1.5,
                    }}
                  >
                    {job.work}
                  </p>
                  {job.wlb && (
                    <span
                      style={{
                        fontSize: 11,
                        color: '#059669',
                        background: '#f0fdf4',
                        padding: '2px 8px',
                        borderRadius: 99,
                      }}
                    >
                      워라밸 {job.wlb}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div
                style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}
              >
                <p>관련 직업 정보를 불러올 수 없어요</p>
                <p style={{ fontSize: 12, marginTop: 8 }}>
                  커리어넷에서 직접 확인해보세요
                </p>
              </div>
            )}
            <a
              href="https://www.career.go.kr"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: 16,
                borderRadius: 12,
                background: '#fff',
                border: '1.5px solid #7c3aed',
                color: '#7c3aed',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
                marginTop: 16,
              }}
            >
              커리어넷에서 더 많은 직업 탐색하기 →
            </a>
          </div>
        )}

        {/* ══════════════════════════════════
            TAB: 채용공고 (워크넷)
        ══════════════════════════════════ */}
        {activeTab === 'recruit' && (
          <div>
            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>
              워크넷 실시간 채용공고
            </p>
            {result.recruitList?.length > 0 ? (
              result.recruitList.map((item, i) => (
                <div
                  key={i}
                  style={{
                    background: '#fff',
                    border: '1px solid #ede9fe',
                    borderRadius: 14,
                    padding: 18,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#1e1b4b',
                      marginBottom: 6,
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: '#7c3aed',
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    {item.company}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                      marginBottom: 8,
                    }}
                  >
                    {item.region && (
                      <span
                        style={{
                          fontSize: 11,
                          background: '#f3f4f6',
                          color: '#6b7280',
                          padding: '2px 8px',
                          borderRadius: 99,
                        }}
                      >
                        {item.region}
                      </span>
                    )}
                    {item.jobType && (
                      <span
                        style={{
                          fontSize: 11,
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          padding: '2px 8px',
                          borderRadius: 99,
                        }}
                      >
                        {item.jobType}
                      </span>
                    )}
                    {item.salary && (
                      <span
                        style={{
                          fontSize: 11,
                          background: '#fffbeb',
                          color: '#d97706',
                          padding: '2px 8px',
                          borderRadius: 99,
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
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>
                      마감: {item.endDate || '상시채용'}
                    </span>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: 12,
                          color: '#7c3aed',
                          fontWeight: 600,
                          textDecoration: 'none',
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
                style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}
              >
                <p>현재 관련 채용공고가 없습니다</p>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════
            TAB: 훈련과정 (HRD-Net)
        ══════════════════════════════════ */}
        {activeTab === 'training' && (
          <div>
            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>
              국민내일배움카드 훈련과정
            </p>
            {result.trainingList?.length > 0 ? (
              result.trainingList.map((item, i) => (
                <div
                  key={i}
                  style={{
                    background: '#fff',
                    border: '1px solid #ede9fe',
                    borderRadius: 14,
                    padding: 18,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#1e1b4b',
                      marginBottom: 6,
                    }}
                  >
                    {item.name}
                  </div>
                  <div
                    style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}
                  >
                    {item.institution}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                      marginBottom: 8,
                    }}
                  >
                    {item.cost && (
                      <span
                        style={{
                          fontSize: 12,
                          background: '#fffbeb',
                          color: '#d97706',
                          padding: '3px 10px',
                          borderRadius: 99,
                          fontWeight: 600,
                        }}
                      >
                        {item.cost}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 11,
                        background: '#f5f3ff',
                        color: '#7c3aed',
                        padding: '2px 8px',
                        borderRadius: 99,
                      }}
                    >
                      {item.subsidy}
                    </span>
                    {item.rating && (
                      <span
                        style={{
                          fontSize: 11,
                          background: '#f0fdf4',
                          color: '#059669',
                          padding: '2px 8px',
                          borderRadius: 99,
                        }}
                      >
                        {item.rating}
                      </span>
                    )}
                  </div>
                  {item.period && (
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
                      {item.period}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div
                style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}
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
                padding: 16,
                borderRadius: 12,
                background: '#fff',
                border: '1.5px solid #7c3aed',
                color: '#7c3aed',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
                marginTop: 16,
              }}
            >
              HRD-Net에서 더 많은 훈련과정 보기 →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// 전환방법 카드 컴포넌트
function TransferCard({ r, selected, onSelect }) {
  return (
    <div
      onClick={onSelect}
      style={{
        border: `1.5px solid ${selected ? '#7c3aed' : '#f3f4f6'}`,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        cursor: 'pointer',
        background: selected ? '#faf5ff' : '#fff',
        transition: 'all 0.15s',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, color: '#1e1b4b' }}>
          {r.type}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 99,
              background: '#f3f4f6',
              color: '#6b7280',
            }}
          >
            {r.duration}
          </span>
          <span
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 99,
              background:
                r.difficulty === '높음'
                  ? '#fee2e2'
                  : r.difficulty === '보통'
                    ? '#fef3c7'
                    : '#dcfce7',
              color:
                r.difficulty === '높음'
                  ? '#991b1b'
                  : r.difficulty === '보통'
                    ? '#92400e'
                    : '#166634',
            }}
          >
            난이도 {r.difficulty}
          </span>
        </div>
      </div>
      <p
        style={{
          fontSize: 13,
          color: '#4b5563',
          margin: '0 0 8px',
          lineHeight: 1.6,
        }}
      >
        {r.desc}
      </p>
      <span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 500 }}>
        이 방법으로 로드맵 보기 →
      </span>
    </div>
  );
}
