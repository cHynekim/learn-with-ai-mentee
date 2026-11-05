import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { toast } from '../components/Toast.jsx';

const ROLES = [
  { id: 'student', emoji: '🧑‍🎓', title: '학생', desc: 'AI 후배 배배에게 오늘 배운 걸 가르쳐요', color: 'lime' },
  { id: 'guardian', emoji: '👨‍👩‍👧', title: '부모님/선생님', desc: '아이들의 학습 리포트를 받고 응원해요', color: 'pink' },
];

export default function Signup() {
  const { user, setUser } = useAuth();
  const nav = useNavigate();
  const [role, setRole] = useState(null);
  const [name, setName] = useState(user?.name || '');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!role) return toast('역할을 골라 주세요');
    setBusy(true);
    try {
      const { user } = await api('/auth/signup', { method: 'POST', body: { role, name } });
      setUser(user);
      nav('/');
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <form className="signup card" onSubmit={submit}>
        <h1 className="h1">반가워요!<br />어떤 역할로 함께할까요?</h1>
        <div className="role-grid" role="radiogroup">
          {ROLES.map((r) => (
            <button
              type="button"
              key={r.id}
              role="radio"
              aria-checked={role === r.id}
              className={`role-card ${r.color} ${role === r.id ? 'on' : ''}`}
              onClick={() => setRole(r.id)}
            >
              <span className="role-title">{r.title}</span>
              <span className="role-desc">{r.desc}</span>
            </button>
          ))}
        </div>
        <label className="field">
          <span>{role === 'student' ? '배배가 부를 이름' : '이름'}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름을 입력해 주세요" required maxLength={30} />
        </label>
        <button className="btn btn-ink" disabled={busy}>
          {busy ? '가입 중…' : '시작하기'}
        </button>
      </form>
    </main>
  );
}
