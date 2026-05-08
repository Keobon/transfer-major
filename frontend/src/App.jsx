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

  if (loading)
    return (
      <div style={{ textAlign: 'center', marginTop: 100, color: '#7c3aed' }}>
        로딩 중...
      </div>
    );

  if (!session) {
    return page === 'login' ? (
      <LoginPage onSwitch={() => setPage('signup')} />
    ) : (
      <SignupPage onSwitch={() => setPage('login')} />
    );
  }

  if (page === 'result' && profile && pdfResult) {
    return (
      <ResultPage session={session} profile={profile} pdfResult={pdfResult} />
    );
  }

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
