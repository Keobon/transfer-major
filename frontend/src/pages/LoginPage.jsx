import { useState } from 'react';
import { supabase } from '../supabase';

// ── 디자인 토큰 ─────────────────────────────────
const C = {
  green: '#1A3A2F',
  greenMid: '#2D5A45',
  cream: '#F5F2EC',
  gold: '#B8975A',
  border: '#E0DAD0',
  text: '#1A1A1A',
  textSub: '#5C5C5C',
  danger: '#8B3A3A',
};

export default function LoginPage({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ── 로직 원본 유지 ──────────────────────────────
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
        background: C.cream,
        display: 'flex',
        fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif",
      }}
    >
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        input::placeholder { color: #B0ABA4; }
        input:focus { outline: none; border-color: #1A3A2F !important; box-shadow: 0 0 0 3px #1A3A2F18; }
      `}</style>

      {/* 왼쪽 — 그린 패널 */}
      <div
        style={{
          width: '42%',
          background: C.green,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 40px',
        }}
      >
        {/* 토포그래픽 패턴 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `repeating-conic-gradient(${C.greenMid}10 0% 25%, transparent 0% 50%)`,
            backgroundSize: '32px 32px',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `radial-gradient(ellipse 80% 70% at 50% 110%, ${C.greenMid}80 0%, transparent 60%)`,
            pointerEvents: 'none',
          }}
        />

        {/* 로고 */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 4,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: C.cream,
                letterSpacing: '-0.02em',
              }}
            >
              내일
            </span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 300,
                color: C.gold,
                letterSpacing: '0.12em',
              }}
            >
              환승
            </span>
          </div>
          <p
            style={{
              fontSize: 10,
              color: `${C.cream}70`,
              letterSpacing: '0.04em',
              margin: 0,
            }}
          >
            자신과 잘맞고 지속 가능한 일을 찾는 것
          </p>
        </div>

        {/* 중앙 카피 */}
        <div style={{ position: 'relative' }}>
          <p
            style={{
              fontSize: 10,
              color: `${C.cream}50`,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              margin: '0 0 16px',
            }}
          >
            내일환승 — 전공 갭 분석
          </p>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: C.cream,
              lineHeight: 1.2,
              margin: '0 0 16px',
              letterSpacing: '-0.02em',
            }}
          >
            나의 내일,
            <br />
            지속 가능한 일로
          </h1>
          <p
            style={{
              fontSize: 13,
              color: `${C.cream}70`,
              lineHeight: 1.8,
              margin: 0,
            }}
          >
            커리어넷 · 워크넷 실제 데이터와
            <br />
            AI 분석으로 나에게 맞는 전공을
            <br />
            정확하게 진단합니다
          </p>
        </div>

        {/* 하단 데이터 배지 */}
        <div style={{ position: 'relative', display: 'flex', gap: 16 }}>
          {[
            { label: '학과 DB', value: '3,800+' },
            { label: '채용공고', value: '실시간' },
            { label: '훈련과정', value: 'HRD-Net' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                flex: 1,
                padding: '10px 12px',
                background: `${C.cream}08`,
                border: `1px solid ${C.cream}15`,
                borderRadius: 8,
              }}
            >
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.gold,
                  margin: '0 0 2px',
                }}
              >
                {item.value}
              </p>
              <p
                style={{
                  fontSize: 9,
                  color: `${C.cream}50`,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  margin: 0,
                }}
              >
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 오른쪽 — 폼 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 40px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 360,
            animation: 'fadeUp 0.4s ease',
          }}
        >
          <p
            style={{
              fontSize: 10,
              color: C.gold,
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              margin: '0 0 12px',
            }}
          >
            Welcome Back
          </p>
          <h2
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: C.text,
              letterSpacing: '-0.02em',
              margin: '0 0 6px',
            }}
          >
            로그인
          </h2>
          <p
            style={{
              fontSize: 13,
              color: C.textSub,
              margin: '0 0 36px',
              lineHeight: 1.6,
            }}
          >
            계정에 로그인하여 분석 결과를 확인하세요
          </p>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 700,
                color: C.green,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: 8,
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
                padding: '13px 16px',
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                fontSize: 14,
                color: C.text,
                background: '#FAFAF8',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label
              style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 700,
                color: C.green,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: 8,
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
                padding: '13px 16px',
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                fontSize: 14,
                color: C.text,
                background: '#FAFAF8',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
            />
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: `${C.danger}10`,
                border: `1px solid ${C.danger}30`,
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <p style={{ color: C.danger, fontSize: 12, margin: 0 }}>
                {error}
              </p>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 0',
              borderRadius: 8,
              background: loading ? C.greenMid : C.green,
              color: C.cream,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginTop: 8,
              transition: 'background 0.15s',
            }}
          >
            {loading ? '로그인 중...' : '로그인 →'}
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              margin: '24px 0',
            }}
          >
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span
              style={{ fontSize: 10, color: '#B0ABA4', letterSpacing: '0.1em' }}
            >
              OR
            </span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          <p
            style={{
              textAlign: 'center',
              fontSize: 13,
              color: C.textSub,
              margin: 0,
            }}
          >
            계정이 없으신가요?{' '}
            <span
              onClick={onSwitch}
              style={{
                cursor: 'pointer',
                color: C.green,
                fontWeight: 700,
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
