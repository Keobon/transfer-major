import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

// 점수 색상
const scoreColor = (s) =>
  s >= 75 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444';
const scoreBg = (s) => (s >= 75 ? '#dcfce7' : s >= 50 ? '#fef3c7' : '#fee2e2');
const scoreLabel = (s) =>
  s >= 75 ? '전환 가능성 높음' : s >= 50 ? '준비 필요' : '도전적 목표';

// 레이더 차트 (SVG)
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

  const currentPts = data.map((d, i) => point(d.current, i));
  const requiredPts = data.map((d, i) => point(d.required, i));
  const toPath = (pts) =>
    pts
      .map(
        (p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`,
      )
      .join(' ') + 'Z';

  // 배경 원
  const circles = [25, 50, 75, 100].map((val) => {
    const pts = data.map((_, i) => point(val, i));
    return toPath(pts);
  });

  return (
    <svg
      width="240"
      height="240"
      viewBox="0 0 240 240"
      style={{ margin: '0 auto', display: 'block' }}
    >
      {/* 배경 격자 */}
      {circles.map((path, i) => (
        <path key={i} d={path} fill="none" stroke="#e5e7eb" strokeWidth={1} />
      ))}
      {/* 축선 */}
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
      {/* 목표 영역 */}
      <path
        d={toPath(requiredPts)}
        fill="rgba(124,58,237,0.1)"
        stroke="#7c3aed"
        strokeWidth={1.5}
        strokeDasharray="4,2"
      />
      {/* 현재 영역 */}
      <path
        d={toPath(currentPts)}
        fill="rgba(79,70,229,0.2)"
        stroke="#4f46e5"
        strokeWidth={2}
      />
      {/* 레이블 */}
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
  const [activeTab, setActiveTab] = useState('gap'); // gap | roadmap | jobs

  useEffect(() => {
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

      setLoadingMsg('Supabase에 결과 저장 중...');
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
          커리어넷 실제 데이터로 분석 중이에요
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
            background: `linear-gradient(135deg, ${sc >= 75 ? '#059669, #10b981' : sc >= 50 ? '#d97706, #f59e0b' : '#dc2626, #ef4444'})`,
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

        {/* 커리어넷 데이터 표시 */}
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
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {result.majorDetail.employment && (
                <div
                  style={{
                    flex: 1,
                    minWidth: 120,
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
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#166534',
                      margin: 0,
                    }}
                  >
                    {result.majorDetail.employment}
                  </p>
                </div>
              )}
              {result.majorDetail.salary && (
                <div
                  style={{
                    flex: 1,
                    minWidth: 120,
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
              {result.majorDetail.qualifications && (
                <div
                  style={{
                    flex: 1,
                    minWidth: 120,
                    background: '#f5f3ff',
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      color: '#7c3aed',
                      margin: '0 0 4px',
                    }}
                  >
                    관련 자격증
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: '#4c1d95',
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {result.majorDetail.qualifications}
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
          }}
        >
          {[
            ['gap', '역량 분석'],
            ['roadmap', '로드맵'],
            ['jobs', '관련 직업'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: activeTab === key ? 700 : 400,
                background: activeTab === key ? '#7c3aed' : 'transparent',
                color: activeTab === key ? '#fff' : '#6b7280',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* TAB: 역량 분석 */}
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
                        borderTop: '1px dashed #7c3aed',
                      }}
                    />
                    <span style={{ fontSize: 11, color: '#6b7280' }}>목표</span>
                  </div>
                </div>
              </div>
            )}

            {/* 강점 */}
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
                  <div key={i} style={{ marginBottom: 12 }}>
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
                      <span style={{ fontSize: 12, color: '#059669' }}>
                        {s.level}%
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
                          width: `${s.level}%`,
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
                        margin: '4px 0 0',
                      }}
                    >
                      {s.reason}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* 부족 역량 */}
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
                      <span
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 99,
                          background:
                            w.priority === '높음' ? '#fee2e2' : '#fef3c7',
                          color: w.priority === '높음' ? '#991b1b' : '#92400e',
                        }}
                      >
                        {w.priority}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        background: '#e5e7eb',
                        borderRadius: 3,
                        marginBottom: 4,
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.max(0, 100 - w.gap)}%`,
                          background:
                            'linear-gradient(90deg, #ef4444, #f97316)',
                          borderRadius: 3,
                        }}
                      />
                    </div>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                      {w.reason}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* 전환 루트 */}
            {result.transferRoutes && (
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
                    margin: '0 0 14px',
                  }}
                >
                  전환 방법 비교
                </h3>
                {result.transferRoutes.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 0',
                      borderBottom:
                        i < result.transferRoutes.length - 1
                          ? '1px solid #f3f4f6'
                          : 'none',
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        flexShrink: 0,
                        background:
                          i === 0 ? '#f5f3ff' : i === 1 ? '#eff6ff' : '#f0fdf4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color:
                            i === 0
                              ? '#7c3aed'
                              : i === 1
                                ? '#2563eb'
                                : '#059669',
                        }}
                      >
                        {r.type}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>
                          {r.duration}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            padding: '1px 6px',
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
                                  : '#166534',
                          }}
                        >
                          {r.difficulty}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>
                        {r.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 지금 당장 할 일 */}
            {result.urgentActions && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  borderRadius: 14,
                  padding: 20,
                  marginBottom: 16,
                }}
              >
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#fff',
                    margin: '0 0 12px',
                  }}
                >
                  지금 당장 해야 할 일
                </h3>
                {result.urgentActions.map((action, i) => (
                  <div
                    key={i}
                    style={{ display: 'flex', gap: 10, marginBottom: 8 }}
                  >
                    <span
                      style={{
                        color: '#c4b5fd',
                        fontWeight: 700,
                        fontSize: 14,
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}.
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: 'rgba(255,255,255,0.9)',
                        lineHeight: 1.5,
                      }}
                    >
                      {action}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: 로드맵 */}
        {activeTab === 'roadmap' && result.roadmap && (
          <div>
            {result.roadmap.map((step, i) => (
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
                      flexShrink: 0,
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
                      boxShadow:
                        i === 0 ? '0 4px 12px rgba(124,58,237,0.3)' : 'none',
                    }}
                  >
                    {i + 1}
                  </div>
                  {i < result.roadmap.length - 1 && (
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
                    marginBottom: i < result.roadmap.length - 1 ? 0 : 0,
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
                  {step.actions.map((action, j) => (
                    <div
                      key={j}
                      style={{ display: 'flex', gap: 8, marginBottom: 6 }}
                    >
                      <span
                        style={{
                          color: '#a78bfa',
                          fontSize: 13,
                          flexShrink: 0,
                          marginTop: 1,
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

            {/* 추천 자격증 */}
            {result.certifications?.length > 0 && (
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #ede9fe',
                  borderRadius: 14,
                  padding: 20,
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

        {/* TAB: 관련 직업 */}
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
                    {(job.work || '').slice(0, 80)}
                    {job.work?.length > 80 ? '...' : ''}
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
                <p style={{ fontSize: 12 }}>커리어넷에서 직접 확인해보세요</p>
              </div>
            )}

            {/* 커리어넷 바로가기 */}
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
      </div>
    </div>
  );
}
