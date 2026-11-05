import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, fmtDate } from '../api.js';
import { useAuth } from '../App.jsx';
import TopBar from '../components/TopBar.jsx';
import { toast } from '../components/Toast.jsx';

export default function GuardianHome() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [students, setStudents] = useState(null);
  const [code, setCode] = useState('');
  const who = '아이';

  const load = () => api('/guardian/students').then((d) => setStudents(d.students));
  useEffect(() => {
    load();
  }, []);

  const link = async (e) => {
    e.preventDefault();
    try {
      const { student } = await api('/guardian/link', { method: 'POST', body: { code } });
      toast(`${student.name} 연결 완료! 🎉`);
      setCode('');
      load();
    } catch (err) {
      toast(err.message);
    }
  };

  return (
    <div className="page">
      <TopBar showShelf={false} />
      <main className="guardian">
        <section className="g-hello">
          <h1 className="h1">
            {user.name}님, 안녕하세요
          </h1>
          <p className="muted">
            {who}가 AI 후배에게 가르친 이야기가 도착해요. 응원 스티커로 마음을 전해 주세요!
          </p>
        </section>

        <h2 className="h2">연결된 아이들</h2>
        {!students && <p className="muted">불러오는 중…</p>}
        {students?.length === 0 && <p className="muted">아직 연결된 {who}가 없어요. 아래에서 연결 코드를 입력해 주세요.</p>}
        <div className="student-list">
          {students?.map((s) => (
            <button key={s.id} className="student-card card" onClick={() => nav(`/g/student/${s.id}`)}>
              <div className="sc-avatar">{s.name[0]}</div>
              <div className="sc-main">
                <div className="sc-name">{s.name}</div>
                <div className="tiny muted">
                  {s.last_at ? `최근 공유 ${fmtDate(s.last_at)}` : '아직 공유된 리포트가 없어요'} · 리포트 {s.shared_sessions}개
                </div>
                <div className="sc-subjects">
                  {s.notebooks.map((n) => (
                    <span key={n.subject} className="mini-progress">
                      {n.term} · {n.explained}/{n.total}
                    </span>
                  ))}
                </div>
              </div>
              <span className="chev">›</span>
            </button>
          ))}
        </div>

        <form className="link-box card" onSubmit={link}>
          <div className="lb-title">{who} 연결하기</div>
          <p className="tiny muted">{who}의 앱 우측 상단 프로필 → '연결 코드'를 입력해 주세요</p>
          <div className="lb-row">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="예: HANEUL" maxLength={6} />
            <button className="btn btn-ink" disabled={code.length < 6}>연결</button>
          </div>
        </form>
      </main>
    </div>
  );
}
