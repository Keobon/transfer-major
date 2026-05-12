import { useState } from 'react';
import { supabase } from '../supabase';
import { logo } from '../assets';

// ── ElevenLabs 에디토리얼 디자인 토큰 ──
const C = {
  canvas: '#f5f5f5',
  canvasSoft: '#fafafa',
  surface: '#ffffff',
  surfaceStrong: '#f0efed',
  surfaceDark: '#0c0a09',
  ink: '#0c0a09',
  primary: '#292524',
  body: '#4e4e4e',
  muted: '#777169',
  mutedSoft: '#a8a29e',
  hairline: '#e7e5e4',
  hairlineStrong: '#d6d3d1',
  onPrimary: '#ffffff',
  onDark: '#ffffff',
  onDarkSoft: '#a8a29e',
  gMint: '#a7e5d3',
  gPeach: '#f4c5a8',
  gLavender: '#c8b8e0',
  gSky: '#a8c8e8',
  gRose: '#e8b8c4',
  error: '#dc2626',
};

export default function SignupPage({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── 로직 원본 유지 ──
  const handleSignup = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else setDone(true);
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.canvas,
        display: 'flex',
        fontFamily:
          "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif",
      }}
    >
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes orbDrift1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(40px,-30px) scale(1.1)}}
        @keyframes orbDrift2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-30px,40px) scale(1.05)}}
        * { box-sizing: border-box; }
        input::placeholder { color: ${C.mutedSoft}; }
        input:focus { outline: none; border-color: ${C.ink} !important; border-width: 2px !important; }
      `}</style>

      {/* ── 왼쪽: 다크 잉크 패널 + 그라디언트 오브 ── */}
      <div
        style={{
          width: '42%',
          background: C.surfaceDark,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 56px',
        }}
      >
        {/* 로즈 오브 */}
        <div
          style={{
            position: 'absolute',
            top: '15%',
            right: '-15%',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${C.gRose}70 0%, rgba(232,184,196,0) 70%)`,
            filter: 'blur(30px)',
            animation: 'orbDrift1 11s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
        {/* 스카이 오브 */}
        <div
          style={{
            position: 'absolute',
            bottom: '0%',
            left: '-20%',
            width: 440,
            height: 440,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${C.gSky}60 0%, rgba(168,200,232,0) 70%)`,
            filter: 'blur(30px)',
            animation: 'orbDrift2 13s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />

        {/* 로고 — 모노그램 + 텍스트 */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginBottom: 14,
            }}
          >
            <img
              src={logo}
              alt="Transfer Tomorrow"
              style={{ height: 36, width: 'auto', display: 'block' }}
            />
            <div
              style={{
                fontSize: 22,
                fontWeight: 300,
                color: C.onDark,
                letterSpacing: '-0.03em',
              }}
            >
              내일<span style={{ fontWeight: 500 }}>환승</span>
            </div>
          </div>
          <p
            style={{
              fontSize: 12,
              color: C.onDarkSoft,
              letterSpacing: '0.02em',
              margin: 0,
              fontWeight: 400,
            }}
          >
            자신과 잘맞고 지속 가능한 일을 찾는 것
          </p>
        </div>

        {/* 단계 안내 */}
        <div style={{ position: 'relative' }}>
          <p
            style={{
              fontSize: 11,
              color: C.onDarkSoft,
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              margin: '0 0 28px',
            }}
          >
            3 Simple Steps
          </p>
          {[
            {
              step: '01',
              title: '계정 생성',
              desc: '이메일 인증으로 간편 가입',
            },
            {
              step: '02',
              title: '전공 정보 입력',
              desc: '현재 전공과 목표 전공 선택',
            },
            {
              step: '03',
              title: 'AI 분석 결과',
              desc: '맞춤 갭분석 · 로드맵 제공',
            },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 18,
                marginBottom: i < 2 ? 24 : 0,
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: `1px solid rgba(255,255,255,0.15)`,
                  background: 'rgba(255,255,255,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: C.onDark,
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                  }}
                >
                  {item.step}
                </span>
              </div>
              <div style={{ paddingTop: 4 }}>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: C.onDark,
                    margin: '0 0 4px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {item.title}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: C.onDarkSoft,
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 하단 배지 */}
        <div
          style={{
            position: 'relative',
            padding: '16px 18px',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: 12,
          }}
        >
          <p
            style={{
              fontSize: 12,
              color: C.onDarkSoft,
              lineHeight: 1.65,
              margin: 0,
              letterSpacing: '0.01em',
            }}
          >
            커리어넷 · 워크넷 · HRD-Net
            <br />
            공식 데이터 기반 분석
          </p>
        </div>
      </div>

      {/* ── 오른쪽: 폼 ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '64px 48px',
          background: C.canvas,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 라벤더 오브 */}
        <div
          style={{
            position: 'absolute',
            bottom: '-15%',
            right: '-10%',
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${C.gLavender}40 0%, rgba(200,184,224,0) 70%)`,
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            width: '100%',
            maxWidth: 380,
            animation: 'fadeUp 0.4s ease',
            position: 'relative',
          }}
        >
          {/* ── 가입 완료 상태 ── */}
          {done ? (
            <div style={{ animation: 'fadeIn 0.4s ease' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: C.surfaceStrong,
                  border: `1px solid ${C.hairlineStrong}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 28,
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 8l8 6 8-6M4 8v9a1 1 0 001 1h14a1 1 0 001-1V8M4 8l1-1h14l1 1"
                    stroke={C.ink}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p
                style={{
                  fontSize: 11,
                  color: C.muted,
                  fontWeight: 600,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  margin: '0 0 16px',
                }}
              >
                이메일 인증
              </p>
              <h2
                style={{
                  fontSize: 32,
                  fontWeight: 300,
                  color: C.ink,
                  letterSpacing: '-0.03em',
                  margin: '0 0 16px',
                  lineHeight: 1.17,
                }}
              >
                이메일을 확인해주세요
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: C.body,
                  margin: '0 0 12px',
                  lineHeight: 1.7,
                  letterSpacing: '0.01em',
                }}
              >
                <span style={{ color: C.ink, fontWeight: 500 }}>{email}</span>
                로
                <br />
                인증 링크를 발송했습니다.
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: C.muted,
                  margin: '0 0 32px',
                  lineHeight: 1.6,
                  letterSpacing: '0.01em',
                }}
              >
                이메일의 링크를 클릭하면 인증이 완료됩니다.
                <br />
                스팸함도 확인해보세요.
              </p>

              {/* 안내 박스 */}
              <div
                style={{
                  padding: '14px 18px',
                  background: C.canvasSoft,
                  border: `1px solid ${C.hairline}`,
                  borderRadius: 12,
                  marginBottom: 28,
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    color: C.ink,
                    fontWeight: 500,
                    margin: '0 0 4px',
                    letterSpacing: '0.01em',
                  }}
                >
                  인증 완료 후
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: C.body,
                    margin: 0,
                    letterSpacing: '0.01em',
                  }}
                >
                  아래 버튼을 눌러 로그인하세요
                </p>
              </div>

              <button
                onClick={onSwitch}
                style={{
                  width: '100%',
                  padding: '10px 20px',
                  height: 44,
                  borderRadius: 9999,
                  background: C.primary,
                  color: C.onPrimary,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                  marginBottom: 12,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.ink)}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = C.primary)
                }
              >
                로그인 화면으로
              </button>
              <button
                onClick={() => {
                  setDone(false);
                  setEmail('');
                  setPassword('');
                }}
                style={{
                  width: '100%',
                  padding: '10px 20px',
                  height: 40,
                  borderRadius: 9999,
                  background: 'transparent',
                  color: C.ink,
                  border: `1px solid ${C.hairlineStrong}`,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                }}
              >
                다른 이메일로 다시 가입
              </button>
            </div>
          ) : (
            /* ── 가입 폼 ── */
            <>
              <p
                style={{
                  fontSize: 11,
                  color: C.muted,
                  fontWeight: 600,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  margin: '0 0 16px',
                }}
              >
                Get Started
              </p>
              <h2
                style={{
                  fontSize: 36,
                  fontWeight: 300,
                  color: C.ink,
                  letterSpacing: '-0.03em',
                  margin: '0 0 10px',
                  lineHeight: 1.17,
                }}
              >
                회원가입
              </h2>
              <p
                style={{
                  fontSize: 15,
                  color: C.body,
                  margin: '0 0 40px',
                  lineHeight: 1.6,
                  letterSpacing: '0.01em',
                }}
              >
                무료로 시작하고 전공 전환 가능성을 확인하세요
              </p>

              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 500,
                    color: C.ink,
                    letterSpacing: '0.02em',
                    marginBottom: 10,
                  }}
                >
                  이메일
                </label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${C.hairlineStrong}`,
                    borderRadius: 8,
                    fontSize: 15,
                    color: C.ink,
                    background: C.surface,
                    height: 44,
                    letterSpacing: '0.01em',
                  }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 500,
                    color: C.ink,
                    letterSpacing: '0.02em',
                    marginBottom: 10,
                  }}
                >
                  비밀번호
                </label>
                <input
                  type="password"
                  placeholder="8자 이상 입력"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${C.hairlineStrong}`,
                    borderRadius: 8,
                    fontSize: 15,
                    color: C.ink,
                    background: C.surface,
                    height: 44,
                    letterSpacing: '0.01em',
                  }}
                />
              </div>

              {error && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: `${C.error}08`,
                    border: `1px solid ${C.error}30`,
                    borderRadius: 8,
                    marginBottom: 14,
                  }}
                >
                  <p style={{ color: C.error, fontSize: 13, margin: 0 }}>
                    {error}
                  </p>
                </div>
              )}

              <button
                onClick={handleSignup}
                disabled={loading || !email || !password}
                style={{
                  width: '100%',
                  padding: '10px 20px',
                  height: 44,
                  borderRadius: 9999,
                  background: email && password ? C.primary : C.surfaceStrong,
                  color: email && password ? C.onPrimary : C.mutedSoft,
                  border: 'none',
                  cursor: email && password ? 'pointer' : 'default',
                  fontSize: 15,
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                  marginTop: 12,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (email && password && !loading)
                    e.currentTarget.style.background = C.ink;
                }}
                onMouseLeave={(e) => {
                  if (email && password && !loading)
                    e.currentTarget.style.background = C.primary;
                }}
              >
                {loading ? '가입 중...' : '무료로 시작하기'}
              </button>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  margin: '32px 0',
                }}
              >
                <div style={{ flex: 1, height: 1, background: C.hairline }} />
                <span
                  style={{
                    fontSize: 11,
                    color: C.muted,
                    letterSpacing: '0.1em',
                  }}
                >
                  OR
                </span>
                <div style={{ flex: 1, height: 1, background: C.hairline }} />
              </div>

              <p
                style={{
                  textAlign: 'center',
                  fontSize: 14,
                  color: C.body,
                  margin: 0,
                  letterSpacing: '0.01em',
                }}
              >
                이미 계정이 있으신가요?{' '}
                <span
                  onClick={onSwitch}
                  style={{
                    cursor: 'pointer',
                    color: C.ink,
                    fontWeight: 500,
                    textDecoration: 'underline',
                    textUnderlineOffset: 3,
                  }}
                >
                  로그인
                </span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
