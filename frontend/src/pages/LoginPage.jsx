import { useState } from 'react';
import { supabase } from '../supabase';

const C = {
  bg: '#F7F3E8',
  surface: '#FEFCF5',
  green: '#2C4A3E',
  greenMid: '#3D6B5A',
  gold: '#C4973A',
  goldLt: '#E8B84B',
  mustard: '#D4A837',
  mustardBg: '#FFF8E1',
  cream: '#FAF6EC',
  border: '#E8DFC8',
  text: '#1C1C1A',
  textSub: '#5A5548',
  textMuted: '#9A9080',
  danger: '#8B3A3A',
};

export default function LoginPage({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        background: C.bg,
        display: 'flex',
        fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif",
      }}
    >
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        input::placeholder { color: #C0B89A; }
        input:focus { outline: none; border-color: ${C.green} !important; box-shadow: 0 0 0 3px ${C.green}18; }
      `}</style>

      {/* 왼쪽 — 딥 그린 패널 */}
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
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `repeating-conic-gradient(${C.greenMid}18 0% 25%, transparent 0% 50%)`,
            backgroundSize: '28px 28px',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `radial-gradient(ellipse 80% 70% at 50% 110%, ${C.greenMid}90 0%, transparent 60%)`,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: `${C.mustard}12`,
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
                color: C.goldLt,
                letterSpacing: '0.12em',
              }}
            >
              환승
            </span>
          </div>
          <p
            style={{
              fontSize: 11,
              color: `${C.cream}65`,
              letterSpacing: '0.03em',
              margin: 0,
            }}
          >
            자신과 잘맞고 지속 가능한 일을 찾는 것
          </p>
        </div>

        {/* 히어로 카피 */}
        <div style={{ position: 'relative' }}>
          <p
            style={{
              fontSize: 9,
              color: C.goldLt,
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              margin: '0 0 16px',
              opacity: 0.9,
            }}
          >
            Major Transfer Analysis
          </p>
          <h1
            style={{
              fontSize: 30,
              fontWeight: 800,
              color: C.cream,
              lineHeight: 1.25,
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
              color: `${C.cream}65`,
              lineHeight: 1.85,
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
        <div style={{ position: 'relative', display: 'flex', gap: 10 }}>
          {[
            { label: '학과 DB', value: '3,800+' },
            { label: '채용공고', value: '실시간' },
            { label: '훈련과정', value: 'HRD-Net' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                flex: 1,
                padding: '10px 10px',
                background: `${C.mustard}12`,
                border: `1px solid ${C.goldLt}18`,
                borderRadius: 8,
              }}
            >
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.goldLt,
                  margin: '0 0 2px',
                }}
              >
                {item.value}
              </p>
              <p
                style={{
                  fontSize: 9,
                  color: `${C.cream}50`,
                  letterSpacing: '0.08em',
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
          background: C.bg,
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
              color: C.mustard,
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
              margin: '0 0 32px',
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
                border: `1.5px solid ${C.border}`,
                borderRadius: 8,
                fontSize: 14,
                color: C.text,
                background: C.surface,
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
                border: `1.5px solid ${C.border}`,
                borderRadius: 8,
                fontSize: 14,
                color: C.text,
                background: C.surface,
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
                marginBottom: 14,
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
              background: C.green,
              color: C.cream,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginTop: 8,
              transition: 'opacity 0.15s',
              opacity: loading ? 0.7 : 1,
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
              style={{
                fontSize: 10,
                color: C.textMuted,
                letterSpacing: '0.1em',
              }}
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
