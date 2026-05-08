import { useState } from 'react';
import { supabase } from '../supabase';

export default function SignupPage({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else setMessage('이메일을 확인해서 인증 링크를 클릭해주세요!');
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 24 }}>
      <h2>회원가입</h2>
      <input
        type="email"
        placeholder="이메일"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8 }}
      />
      <input
        type="password"
        placeholder="비밀번호 (8자 이상)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8 }}
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}
      <button
        onClick={handleSignup}
        disabled={loading}
        style={{ width: '100%', padding: 8 }}
      >
        {loading ? '가입 중...' : '회원가입'}
      </button>
      <p style={{ marginTop: 16, textAlign: 'center' }}>
        이미 계정이 있으신가요?{' '}
        <span onClick={onSwitch} style={{ cursor: 'pointer', color: 'blue' }}>
          로그인
        </span>
      </p>
    </div>
  );
}
