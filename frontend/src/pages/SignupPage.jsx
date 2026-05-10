import { useState } from 'react';
import { supabase } from '../supabase';

// ── 디자인 토큰 — 머스타드 뮤트 믹스 ────────────────
const C = {
  bg:       '#F7F3E8',   // 따뜻한 크림 옐로우
  surface:  '#FEFCF5',   // 밝은 아이보리
  green:    '#2C4A3E',   // 약간 밝아진 딥 그린
  greenMid: '#3D6B5A',
  gold:     '#C4973A',   // 머스타드 골드
  goldLt:   '#E8B84B',   // 밝은 머스타드
  mustard:  '#D4A837',   // 핵심 머스타드
  mustardBg:'#FFF8E1',   // 머스타드 배경
  cream:    '#FAF6EC',
  border:   '#E8DFC8',   // 옐로우 틴트 보더
  text:     '#1C1C1A',
  textSub:  '#5A5548',
  textMuted:'#9A9080',
  danger:   '#8B3A3A',
  success:  '#2C4A3E',
};

export default function SignupPage({ onSwitch }) {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [done, setDone]           = useState(false);   // 가입 완료 상태
  const [loading, setLoading]     = useState(false);

  // ── 로직: 가입 완료 시 done=true → 로그인 이동 버튼 표시
  const handleSignup = async () => {
    setLoading(true); setError('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else setDone(true);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        * { box-sizing: border-box; }
        input::placeholder { color: #C0B89A; }
        input:focus { outline: none; border-color: ${C.green} !important; box-shadow: 0 0 0 3px ${C.green}18; }
      `}</style>

      {/* 왼쪽 — 딥 그린 패널 */}
      <div style={{ width: '42%', background: C.green, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '48px 40px' }}>
        {/* 배경 패턴 */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-conic-gradient(${C.greenMid}18 0% 25%, transparent 0% 50%)`, backgroundSize: '28px 28px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(ellipse 80% 70% at 50% 110%, ${C.greenMid}90 0%, transparent 60%)`, pointerEvents: 'none' }} />
        {/* 머스타드 글로우 */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: `${C.mustard}12`, pointerEvents: 'none' }} />

        {/* 로고 */}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: C.cream, letterSpacing: '-0.02em' }}>내일</span>
            <span style={{ fontSize: 22, fontWeight: 300, color: C.goldLt, letterSpacing: '0.12em' }}>환승</span>
          </div>
          <p style={{ fontSize: 11, color: `${C.cream}65`, letterSpacing: '0.03em', margin: 0 }}>자신과 잘맞고 지속 가능한 일을 찾는 것</p>
        </div>

        {/* 단계 안내 */}
        <div style={{ position: 'relative' }}>
          <p style={{ fontSize: 9, color: C.goldLt, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 20px', opacity: 0.9 }}>3 Simple Steps</p>
          {[
            { step: '01', title: '계정 생성', desc: '이메일 인증으로 간편 가입' },
            { step: '02', title: '전공 정보 입력', desc: '현재 전공과 목표 전공 선택' },
            { step: '03', title: 'AI 분석 결과', desc: '맞춤 갭분석 · 로드맵 제공' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, marginBottom: i < 2 ? 20 : 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${C.goldLt}40`, background: `${C.mustard}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: C.goldLt, fontWeight: 700 }}>{item.step}</span>
              </div>
              <div style={{ paddingTop: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.cream, margin: '0 0 3px' }}>{item.title}</p>
                <p style={{ fontSize: 11, color: `${C.cream}55`, margin: 0 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 하단 배지 */}
        <div style={{ position: 'relative', padding: '14px 16px', background: `${C.mustard}12`, border: `1px solid ${C.goldLt}20`, borderRadius: 10 }}>
          <p style={{ fontSize: 11, color: `${C.cream}65`, lineHeight: 1.7, margin: 0 }}>커리어넷 · 워크넷 · HRD-Net<br />공식 데이터 기반 분석</p>
        </div>
      </div>

      {/* 오른쪽 — 폼 */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 40px', background: C.bg }}>
        <div style={{ width: '100%', maxWidth: 360, animation: 'fadeUp 0.4s ease' }}>

          {/* ── 가입 완료 상태 ── */}
          {done ? (
            <div style={{ animation: 'fadeIn 0.4s ease' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${C.mustard}20`, border: `2px solid ${C.mustard}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <span style={{ fontSize: 24 }}>✉️</span>
              </div>
              <p style={{ fontSize: 10, color: C.mustard, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 12px' }}>이메일 인증</p>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: '-0.02em', margin: '0 0 12px' }}>이메일을 확인해주세요</h2>
              <p style={{ fontSize: 13, color: C.textSub, margin: '0 0 8px', lineHeight: 1.7 }}>
                <b style={{ color: C.text }}>{email}</b>로<br />인증 링크를 발송했습니다.
              </p>
              <p style={{ fontSize: 12, color: C.textMuted, margin: '0 0 32px', lineHeight: 1.6 }}>
                이메일의 링크를 클릭하면 인증이 완료됩니다.<br />스팸함도 확인해보세요.
              </p>

              {/* 머스타드 안내 박스 */}
              <div style={{ padding: '14px 16px', background: C.mustardBg, border: `1px solid ${C.mustard}30`, borderRadius: 10, marginBottom: 24 }}>
                <p style={{ fontSize: 12, color: '#8B6914', fontWeight: 600, margin: '0 0 4px' }}>인증 완료 후</p>
                <p style={{ fontSize: 12, color: '#8B6914', margin: 0, opacity: 0.85 }}>아래 버튼을 눌러 로그인하세요</p>
              </div>

              <button onClick={onSwitch}
                style={{ width: '100%', padding: '14px 0', borderRadius: 8, background: C.green, color: C.cream, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                로그인 화면으로 →
              </button>
              <button onClick={() => { setDone(false); setEmail(''); setPassword(''); }}
                style={{ width: '100%', padding: '10px 0', borderRadius: 8, background: 'transparent', color: C.textMuted, border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 12 }}>
                다른 이메일로 다시 가입
              </button>
            </div>

          ) : (
            /* ── 가입 폼 ── */
            <>
              <p style={{ fontSize: 10, color: C.mustard, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 12px' }}>Get Started</p>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: '-0.02em', margin: '0 0 6px' }}>회원가입</h2>
              <p style={{ fontSize: 13, color: C.textSub, margin: '0 0 32px', lineHeight: 1.6 }}>무료로 시작하고 전공 전환 가능성을 확인하세요</p>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: C.green, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>이메일</label>
                <input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  style={{ display: 'block', width: '100%', padding: '13px 16px', border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.text, background: C.surface }} />
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: C.green, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>비밀번호</label>
                <input type="password" placeholder="8자 이상 입력" value={password} onChange={(e) => setPassword(e.target.value)}
                  style={{ display: 'block', width: '100%', padding: '13px 16px', border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.text, background: C.surface }} />
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: `${C.danger}10`, border: `1px solid ${C.danger}30`, borderRadius: 8, marginBottom: 14 }}>
                  <p style={{ color: C.danger, fontSize: 12, margin: 0 }}>{error}</p>
                </div>
              )}

              <button onClick={handleSignup} disabled={loading || !email || !password}
                style={{ width: '100%', padding: '14px 0', borderRadius: 8, background: email && password ? C.green : C.border, color: email && password ? C.cream : C.textMuted, border: 'none', cursor: email && password ? 'pointer' : 'default', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 8, transition: 'background 0.15s' }}>
                {loading ? '가입 중...' : '무료로 시작하기 →'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <span style={{ fontSize: 10, color: C.textMuted, letterSpacing: '0.1em' }}>OR</span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>

              <p style={{ textAlign: 'center', fontSize: 13, color: C.textSub, margin: 0 }}>
                이미 계정이 있으신가요?{' '}
                <span onClick={onSwitch} style={{ cursor: 'pointer', color: C.green, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3 }}>
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
