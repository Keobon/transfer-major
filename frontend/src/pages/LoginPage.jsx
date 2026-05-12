import { useState } from 'react';
import { supabase } from '../supabase';
import logo from '../assets/logo.png';

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

export default function LoginPage({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ── 로직 원본 유지 ──
  const handleLogin = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setError(error.message);
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
        {/* 라벤더 오브 */}
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '-10%',
            width: 420,
            height: 420,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${C.gLavender}80 0%, rgba(200,184,224,0) 70%)`,
            filter: 'blur(30px)',
            animation: 'orbDrift1 10s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
        {/* 민트 오브 */}
        <div
          style={{
            position: 'absolute',
            bottom: '-5%',
            right: '-15%',
            width: 380,
            height: 380,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${C.gMint}70 0%, rgba(167,229,211,0) 70%)`,
            filter: 'blur(30px)',
            animation: 'orbDrift2 12s ease-in-out infinite',
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

        {/* 중앙 영역 — 히어로 카피 제거, 빈 공간으로 그라디언트 오브가 호흡하도록 둠 */}
        <div style={{ position: 'relative' }} />

        {/* 하단 데이터 배지 — "실시간 채용공고" 제거, 학과 DB + 훈련과정 2개만 유지 */}
        <div style={{ position: 'relative', display: 'flex', gap: 12 }}>
          {[
            { label: '학과 DB', value: '3,800+' },
            { label: '훈련과정', value: 'HRD-Net' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                flex: 1,
                padding: '14px 14px',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid rgba(255,255,255,0.08)`,
                borderRadius: 12,
              }}
            >
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 500,
                  color: C.onDark,
                  margin: '0 0 4px',
                  letterSpacing: '-0.01em',
                }}
              >
                {item.value}
              </p>
              <p
                style={{
                  fontSize: 10,
                  color: C.onDarkSoft,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  margin: 0,
                  fontWeight: 500,
                }}
              >
                {item.label}
              </p>
            </div>
          ))}
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
        {/* 미세한 피치 오브 */}
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            right: '-10%',
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${C.gPeach}40 0%, rgba(244,197,168,0) 70%)`,
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
            Welcome Back
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
            로그인
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
            계정에 로그인하여 분석 결과를 확인하세요
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
              placeholder="••••••••"
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
              <p style={{ color: C.error, fontSize: 13, margin: 0 }}>{error}</p>
            </div>
          )}

          {/* 잉크 핑(pill) — 단일 CTA */}
          <button
            onClick={handleLogin}
            disabled={loading}
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
              marginTop: 12,
              transition: 'background 0.15s, opacity 0.15s',
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = C.ink;
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = C.primary;
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
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
            계정이 없으신가요?{' '}
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
              회원가입
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
