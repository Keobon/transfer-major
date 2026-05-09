import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import OnboardingPage from './pages/OnboardingPage';
import ResultPage from './pages/ResultPage';

function App() {
  const [session, setSession] = useState(null);
  const [page, setPage] = useState('login');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [pdfResult, setPdfResult] = useState(null);

  // ── 로직 원본 유지 ──────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (data) setProfile(data);
  };

  // ── 로딩 화면 (디자인 교체) ──────────────────────
  if (loading)
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#1A3A2F',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif",
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
        {/* 배경 패턴 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `repeating-conic-gradient(#2D5A4510 0% 25%, transparent 0% 50%)`,
            backgroundSize: '32px 32px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `radial-gradient(ellipse 70% 50% at 50% 100%, #2D5A45 0%, transparent 70%)`,
            opacity: 0.6,
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
              display: 'flex',
              alignItems: 'baseline',
              gap: 4,
              justifyContent: 'center',
              marginBottom: 32,
            }}
          >
            <span
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: '#F5F2EC',
                letterSpacing: '-0.02em',
              }}
            >
              내일
            </span>
            <span
              style={{
                fontSize: 24,
                fontWeight: 300,
                color: '#B8975A',
                letterSpacing: '0.12em',
              }}
            >
              환승
            </span>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              border: '2px solid #B8975A40',
              borderTopColor: '#B8975A',
              borderRadius: '50%',
              animation: 'spin 1.2s linear infinite',
              margin: '0 auto 20px',
            }}
          />
          <p
            style={{
              fontSize: 11,
              color: '#F5F2EC70',
              letterSpacing: '0.04em',
              margin: 0,
            }}
          >
            자신과 잘맞고 지속 가능한 일을 찾는 것
          </p>
        </div>
      </div>
    );

  // ── 인증 전 ─────────────────────────────────────
  if (!session) {
    return page === 'login' ? (
      <LoginPage onSwitch={() => setPage('signup')} />
    ) : (
      <SignupPage onSwitch={() => setPage('login')} />
    );
  }

  // ── 결과 페이지 ─────────────────────────────────
  if (page === 'result' && profile && pdfResult) {
    return (
      <ResultPage session={session} profile={profile} pdfResult={pdfResult} />
    );
  }

  // ── 온보딩 ──────────────────────────────────────
  return (
    <OnboardingPage
      session={session}
      onComplete={(newProfile, newPdfResult) => {
        setProfile(newProfile);
        setPdfResult(newPdfResult);
        setPage('result');
      }}
    />
  );
}

export default App;
