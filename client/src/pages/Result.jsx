import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { api } from '../api.js';
import TopBar from '../components/TopBar.jsx';
import Mentee from '../components/Mentee.jsx';
import { toast } from '../components/Toast.jsx';
import { SummaryPoints } from './Notebook.jsx';

export default function Result() {
  const { id } = useParams();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    api(`/student/sessions/${id}/result`).then((r) => {
      setD(r);
      if (r.groups.explained.length)
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.3 }, colors: ['#34C38F', '#FFD54F', '#7DDBB5', '#FFE79A'], disableForReducedMotion: true });
    });
  }, [id]);

  if (!d) return <div className="boot">불러오는 중…</div>;
  const { session, groups, subject, unit } = d;
  const s = session.summary || {};

  // 한 번 누르면 바로 공유하고 노트북으로 이동 (이미 공유된 리포트면 이동만)
  const share = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      if (!session.shared) {
        await api(`/student/sessions/${id}/share`, { method: 'POST', body: { shared: true } });
        toast('부모님·선생님께 리포트를 보냈어요');
      }
      nav(`/notebook/${subject.id}`);
    } catch (e) {
      toast(e.message);
      setSharing(false);
    }
  };

  return (
    <div className="page">
      <TopBar />
      <main className="result">
        <section className="res-hero card">
          <Mentee size={90} mood="happy" className="bob" />
          <div className="res-sub">{subject.term} · {unit.no}. {unit.title}</div>
          <h1 className="res-headline">{s.headline || '오늘도 멋지게 가르쳐 줬어!'}</h1>
          <div className="res-score">
            <b>{groups.explained.length}</b>
            <span>개의 개념을 내 말로 설명했어요</span>
          </div>
        </section>

        <section className="res-block">
          <h2 className="h2">해낸 것</h2>
          {groups.explained.length ? (
            <div className="trophies">
              {groups.explained.map((c) => (
                <div key={c.id} className={`trophy ${c.fixed ? 'fixed' : ''}`}>
                  <div className="t-title">{c.title}</div>
                  {c.note && <div className="t-note">{c.note}</div>}
                  {c.fixed && <div className="t-badge">헷갈렸던 걸 고쳐냈어요</div>}
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">배배와 끝까지 대화를 나눴어요! 다음엔 개념을 하나씩 꺼내 볼까요?</p>
          )}
          {s.did_well?.length > 0 && (
            <ul className="did-well">
              {s.did_well.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          )}
        </section>

        {(groups.confused.length > 0 || s.growth?.length > 0) && (
          <section className="res-block">
            <h2 className="h2">성장 포인트</h2>
            {groups.confused.length > 0 && (
              <div className="chips-wrap">
                {groups.confused.map((c) => (
                  <span key={c.id} className="tag tag-warn">
                    {c.title}
                    {c.retryOk ? ' · 다시 설명함' : ''}
                  </span>
                ))}
              </div>
            )}
            <SummaryPoints growth={s.growth} />
          </section>
        )}

        {s.review_tasks?.length > 0 && (
          <section className="res-block">
            <h2 className="h2">다음 학습 전까지 개념 보완 과제</h2>
            <SummaryPoints tasks={s.review_tasks} />
            <p className="tiny muted">대화 중에 받은 개념 노트를 다시 읽고, 내 말로 정리해 봐요</p>
          </section>
        )}

        {groups.not_yet.length > 0 && (
          <section className="res-block">
            <h2 className="h2">다음 학습 추천</h2>
            {s.next_tip && <p className="muted">{s.next_tip}</p>}
            <div className="chips-wrap">
              {groups.not_yet.map((c) => <span key={c.id} className="tag">{c.title}</span>)}
            </div>
            <p className="tiny muted">다음에 접속하면 배배가 먼저 물어볼 거예요</p>
          </section>
        )}

        {s.summary && (
          <section className="res-block">
            <h2 className="h2">리포트 미리보기</h2>
            <p className="report-text">{s.summary}</p>
            <p className="tiny muted">내가 먼저 확인하고, 원할 때 부모님·선생님께 공유해요. 공유하면 응원 스티커를 받을 수 있어요!</p>
          </section>
        )}

        <div className="res-actions">
          <button className="btn btn-accent" onClick={share} disabled={sharing}>
            {sharing ? '공유하는 중…' : session.shared ? '공유하기' : '확인했어요, 공유하기'}
          </button>
          <Link className="btn btn-ink" to="/">홈으로</Link>
        </div>
      </main>
    </div>
  );
}
