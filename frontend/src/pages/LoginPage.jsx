import { useState } from 'react';
import { supabase } from '../supabase';

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
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 24 }}>
      <h2>로그인</h2>
      <input
        type="email"
        placeholder="이메일"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8 }}
      />
      <input
        type="password"
        placeholder="비밀번호"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8 }}
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button
        onClick={handleLogin}
        disabled={loading}
        style={{ width: '100%', padding: 8 }}
      >
        {loading ? '로그인 중...' : '로그인'}
      </button>
      <p style={{ marginTop: 16, textAlign: 'center' }}>
        계정이 없으신가요?{' '}
        <span onClick={onSwitch} style={{ cursor: 'pointer', color: 'blue' }}>
          회원가입
        </span>
      </p>
    </div>
  );
}
