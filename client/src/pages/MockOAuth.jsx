import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { PROVIDER_UI } from './Login.jsx';
import { toast } from '../components/Toast.jsx';

// 간편로그인 키가 설정되지 않은 로컬 환경에서 실제 OAuth 동의 화면 대신 보여주는 화면
export default function MockOAuth() {
  const { provider } = useParams();
  const { refresh } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const ui = PROVIDER_UI[provider] || PROVIDER_UI.google;

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api('/auth/mock', { method: 'POST', body: { provider, name, email } });
      const u = await refresh();
      nav(u?.role ? '/' : '/signup');
    } catch (err) {
      toast(err.message);
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-card card mock" onSubmit={submit}>
        <div className={`social ${ui.cls}`}>
          {ui.icon}
          <span>{ui.label.replace('로 시작하기', '')} 계정으로 로그인</span>
        </div>
        <p className="tiny muted">
          개발 모드: <code>server/.env</code>에 {provider.toUpperCase()}_CLIENT_ID 를 넣으면 실제 {ui.label.replace('로 시작하기', '')} 로그인으로 바뀌어요.
        </p>
        <label className="field">
          <span>이메일</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="me@example.com" />
        </label>
        <label className="field">
          <span>이름 (닉네임)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" />
        </label>
        <button className="btn btn-ink" type="submit">동의하고 계속하기</button>
      </form>
    </main>
  );
}
