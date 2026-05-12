import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import OnboardingPage from './pages/OnboardingPage';
import ResultPage from './pages/ResultPage';
import logo from './assets/logo.png';

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

  // ── 로딩 화면 — ElevenLabs 에디토리얼 스타일 ──────
  if (loading)
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          fontFamily:
            "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif",
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <style>{`
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
          @keyframes orbDrift1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(40px,-30px) scale(1.1)}}
          @keyframes orbDrift2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-30px,40px) scale(1.05)}}
        `}</style>

        {/* 파스텔 그라디언트 오브 — 라벤더 */}
        <div
          style={{
            position: 'absolute',
            top: '15%',
            left: '20%',
            width: 360,
            height: 360,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, #c8b8e0 0%, rgba(200,184,224,0) 70%)',
            filter: 'blur(20px)',
            animation: 'orbDrift1 8s ease-in-out infinite',
            opacity: 0.7,
          }}
        />
        {/* 파스텔 그라디언트 오브 — 피치 */}
        <div
          style={{
            position: 'absolute',
            bottom: '20%',
            right: '15%',
            width: 320,
            height: 320,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, #f4c5a8 0%, rgba(244,197,168,0) 70%)',
            filter: 'blur(20px)',
            animation: 'orbDrift2 9s ease-in-out infinite',
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
          {/* 로고 모노그램 + 텍스트 — 디스플레이 300 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              marginBottom: 40,
            }}
          >
            <img
              src={logo}
              alt="Transfer Tomorrow"
              style={{ height: 40, width: 'auto', display: 'block' }}
            />
            <div
              style={{
                fontSize: 28,
                fontWeight: 300,
                color: '#0c0a09',
                letterSpacing: '-0.04em',
              }}
            >
              내일<span style={{ fontWeight: 500 }}>환승</span>
            </div>
          </div>

          {/* 로딩 인디케이터 — 잉크 컬러 */}
          <div
            style={{
              width: 32,
              height: 32,
              border: '1.5px solid #e7e5e4',
              borderTopColor: '#0c0a09',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 24px',
            }}
          />

          <p
            style={{
              fontSize: 13,
              color: '#777169',
              letterSpacing: '0.04em',
              margin: 0,
              fontWeight: 400,
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
