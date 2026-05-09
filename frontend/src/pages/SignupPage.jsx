import { useState } from 'react';
import { supabase } from '../supabase';

const C = {
  green: '#1A3A2F',
  greenMid: '#2D5A45',
  cream: '#F5F2EC',
  gold: '#B8975A',
  border: '#E0DAD0',
  text: '#1A1A1A',
  textSub: '#5C5C5C',
  danger: '#8B3A3A',
  success: '#2D5A45',
};

export default function SignupPage({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // ── 로직 원본 유지 ──────────────────────────────
  const handleSignup = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else setMessage('이메일을 확인해서 인증 링크를 클릭해주세요!');
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

        {/* 단계 안내 */}
        <div style={{ position: 'relative' }}>
          <p
            style={{
              fontSize: 10,
              color: `${C.cream}50`,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              margin: '0 0 20px',
            }}
          >
            3 Simple Steps
          </p>
          {[
            { step: '01', title: '계정 생성', desc: '이메일로 간편 가입' },
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
              style={{ display: 'flex', gap: 16, marginBottom: i < 2 ? 20 : 0 }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: `1px solid ${C.gold}50`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    color: C.gold,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                  }}
                >
                  {item.step}
                </span>
              </div>
              <div>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: C.cream,
                    margin: '0 0 3px',
                  }}
                >
                  {item.title}
                </p>
                <p style={{ fontSize: 11, color: `${C.cream}55`, margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 하단 */}
        <div
          style={{
            position: 'relative',
            padding: '16px',
            background: `${C.cream}06`,
            border: `1px solid ${C.cream}12`,
            borderRadius: 10,
          }}
        >
          <p
            style={{
              fontSize: 11,
              color: `${C.cream}60`,
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            커리어넷 · 워크넷 · HRD-Net
            <br />
            공식 데이터 기반 분석
          </p>
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
            Get Started
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
            회원가입
          </h2>
          <p
            style={{
              fontSize: 13,
              color: C.textSub,
              margin: '0 0 36px',
              lineHeight: 1.6,
            }}
          >
            무료로 시작하고 전공 전환 가능성을 확인하세요
          </p>

          {/* 성공 메시지 */}
          {message && (
            <div
              style={{
                padding: '14px 16px',
                background: `${C.success}10`,
                border: `1px solid ${C.success}30`,
                borderRadius: 10,
                marginBottom: 20,
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  color: C.success,
                  fontWeight: 600,
                  margin: '0 0 4px',
                }}
              >
                이메일을 확인해주세요
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: C.success,
                  margin: 0,
                  opacity: 0.8,
                }}
              >
                {message}
              </p>
            </div>
          )}

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
              placeholder="8자 이상 입력"
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
                background: '#8B3A3A10',
                border: '1px solid #8B3A3A30',
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
            onClick={handleSignup}
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
            {loading ? '가입 중...' : '무료로 시작하기 →'}
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
            이미 계정이 있으신가요?{' '}
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
              로그인
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
