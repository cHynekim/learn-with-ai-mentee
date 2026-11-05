import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import Mentee from '../components/Mentee.jsx';
import { toast } from '../components/Toast.jsx';

export const PROVIDER_UI = {
  kakao: { label: '카카오로 시작하기', cls: 'kakao', icon: <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#191919" d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.7 6.7l-1 3.7c-.1.3.3.6.6.4l4.4-2.9c.4 0 .9.1 1.3.1 5.5 0 10-3.6 10-8S17.5 3 12 3z" /></svg> },
  naver: { label: '네이버로 시작하기', cls: 'naver', icon: <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#fff" d="M16.3 12.8 7.4 0H0v24h7.7V11.2L16.6 24H24V0h-7.7z" /></svg> },
  google: {
    label: 'Google로 시작하기',
    cls: 'google',
    icon: (
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5z" />
      </svg>
    ),
  },
};

export default function Login() {
  const { refresh } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [info, setInfo] = useState({ providers: {}, demo: false });

  useEffect(() => {
    api('/auth/providers').then(setInfo);
    if (params.get('error')) toast('로그인 중 문제가 생겼어요. 다시 시도해 주세요');
  }, []);

  const demo = async (who) => {
    try {
      await api('/auth/demo', { method: 'POST', body: { who } });
      await refresh();
      nav('/');
    } catch (e) {
      toast(e.message);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-hero">
        <Mentee size={88} mood="happy" className="bob" />
        <h1 className="display">
          배배에게 <mark>알려줘</mark>
        </h1>
        <p className="lead">오늘 배운 걸 AI 후배에게 가르치면서<br />내 말로 설명할 수 있는지 확인해 봐요</p>
      </div>

      <div className="auth-card card">
        {Object.entries(PROVIDER_UI).map(([k, p]) => (
          <a key={k} href={`/api/auth/${k}`} className={`social ${p.cls}`}>
            {p.icon}
            <span>{p.label}</span>
          </a>
        ))}
        <p className="tiny muted center">처음이라면 간편로그인 후 역할을 선택해 가입돼요</p>

        {info.demo && (
          <div className="demo-box">
            <div className="demo-label">시연용 계정으로 바로 입장</div>
            <div className="demo-row">
              <button className="btn" onClick={() => demo('student')}>학생 하늘</button>
              <button className="btn" onClick={() => demo('guardian')}>부모님/선생님</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
