import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import TopBar from '../components/TopBar.jsx';
import Mentee from '../components/Mentee.jsx';
import TeachInput from '../components/TeachInput.jsx';
import Celebrate from '../components/Celebrate.jsx';
import { toast } from '../components/Toast.jsx';

export default function Session() {
  const { id } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const [data, setData] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [queue, setQueue] = useState(loc.state?.celebrations || []);
  const [popId, setPopId] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    api(`/student/sessions/${id}`).then(setData).catch(() => nav('/'));
    if (loc.state?.celebrations) window.history.replaceState({}, '');
  }, [id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [data?.messages.length, thinking]);

  if (!data) return <div className="boot">불러오는 중…</div>;
  const { session, messages, concepts, unit, subject } = data;
  const done = session.status === 'done';
  const explainedCount = Object.values(concepts).filter((s) => s === 'explained').length;

  const send = async (content) => {
    const temp = { id: `t${Date.now()}`, role: 'student', content };
    setData((d) => ({ ...d, messages: [...d.messages, temp] }));
    setThinking(true);
    try {
      const r = await api(`/student/sessions/${id}/messages`, { method: 'POST', body: { content } });
      setData((d) => ({
        ...d,
        messages: [...d.messages.filter((m) => m.id !== temp.id), r.studentMessage, r.message],
        concepts: r.concepts,
      }));
      if (r.celebrations.length) {
        setQueue((q) => [...q, ...r.celebrations]);
        setPopId(r.message.id);
      }
    } catch (e) {
      toast(e.message);
      setData((d) => ({ ...d, messages: d.messages.filter((m) => m.id !== temp.id) }));
    } finally {
      setThinking(false);
    }
  };

  const finish = async () => {
    setFinishing(true);
    try {
      await api(`/student/sessions/${id}/finish`, { method: 'POST' });
      nav(`/s/${id}/result`);
    } catch (e) {
      toast(e.message);
      setFinishing(false);
    }
  };

  return (
    <div className="page chat-page">
      <TopBar />
      <div className="chat-head">
        <div className="ch-info">
          <span className="ch-term">{subject.term}</span>
          <span className="ch-unit">{session.kind === 'review' ? '복습 · ' : ''}{unit.no}. {unit.title}</span>
        </div>
        <div className="ch-progress" aria-label={`이번 대화에서 ${explainedCount}개 개념 설명`}>
          {unit.concepts.map((c) => (
            <span key={c.id} className={`dot ${concepts[c.id] || ''}`} title={`${c.title}${concepts[c.id] === 'explained' ? ' ✓' : concepts[c.id] === 'confused' ? ' ?' : ''}`} />
          ))}
          <b>{explainedCount}</b>
        </div>
        {!done ? (
          <button className="btn btn-sm btn-ink" onClick={finish} disabled={finishing || thinking || messages.length < 2}>
            {finishing ? '정리 중…' : '수업 마치기'}
          </button>
        ) : (
          <button className="btn btn-sm" onClick={() => nav(`/s/${id}/result`)}>결과 보기</button>
        )}
      </div>

      <main className="chat">
        {messages.map((m) => {
          const cele = m.meta?.celebrations || [];
          return m.role === 'mentee' ? (
            <div key={m.id} className={`msg mentee-msg ${popId === m.id ? 'pop' : ''}`}>
              <Mentee size={38} mood={cele.length ? 'happy' : 'curious'} />
              <div>
                <div className="bubble">{m.content}</div>
                {cele.length > 0 && (
                  <div className="earned">
                    {cele.map((c) => (
                      <span key={c.conceptId} className={`earned-chip ${c.fixed ? 'fixed' : ''}`}>
                        {c.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div key={m.id} className="msg student-msg">
              <div className="bubble">{m.content}</div>
            </div>
          );
        })}
        {thinking && (
          <div className="msg mentee-msg">
            <Mentee size={38} mood="curious" />
            <div className="bubble typing" aria-label="배배가 생각 중">
              <i /><i /><i />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </main>

      {!done ? (
        <footer className="chat-foot">
          <TeachInput onSubmit={send} disabled={thinking || finishing} placeholder="배배에게 설명해 주기…" autoFocus />
        </footer>
      ) : (
        <footer className="chat-foot done-foot">이 대화는 끝났어요 · 노트북에 저장됨</footer>
      )}

      <Celebrate items={queue} onDone={() => setQueue((q) => q.slice(1))} />
    </div>
  );
}
