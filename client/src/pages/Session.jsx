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
  const [note, setNote] = useState(null); // 열어 본 개념 노트
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
      const r = await api(`/student/sessions/${id}/finish`, { method: 'POST' });
      if (r.retry) {
        // 마치기 전에 배배가 헷갈렸던 개념을 한 번 더 물어봄 → 대답한 뒤 다시 '수업 마치기'
        setData((d) => ({ ...d, messages: [...d.messages, r.message] }));
        setPopId(r.message.id);
        setFinishing(false);
        return;
      }
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
                      <span key={c.conceptId} className={`earned-chip ${c.fixed ? 'fixed' : ''} ${c.retry ? 'retry' : ''}`}>
                        {c.retry ? `다시 설명 · ${c.title}` : c.title}
                      </span>
                    ))}
                  </div>
                )}
                {m.meta?.attachments?.map((a) => (
                  <button key={a.conceptId} className="note-attach" onClick={() => setNote(a)}>
                    <FileIcon />
                    <span className="na-text">
                      <b>개념 노트 · {a.no}. {a.title}</b>
                      <small>읽어 보고, 나중에 배배에게 다시 설명해 줘</small>
                    </span>
                  </button>
                ))}
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
      {note && <ConceptNoteSheet note={note} onClose={() => setNote(null)} />}
    </div>
  );
}

const FileIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </svg>
);

function noteText(n) {
  return [
    `[개념 노트] ${n.no}. ${n.title}`,
    `단원: ${n.unitTitle}`,
    '',
    '■ 핵심',
    n.key,
    n.example && '',
    n.example && '■ 예시',
    n.example,
    n.misconception && '',
    n.misconception && '■ 헷갈리기 쉬운 점',
    n.misconception,
    '',
    '읽은 뒤에는 내 말로 다시 정리해서 배배에게 설명해 보세요!',
  ]
    .filter((x) => x !== undefined && x !== null && x !== false)
    .join('\n');
}

/** 대화 중 헷갈린 개념을 스스로 정리해 볼 수 있는 개념 노트 (파일로 저장 가능) */
function ConceptNoteSheet({ note, onClose }) {
  const download = () => {
    const blob = new Blob([noteText(note)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `개념노트_${note.no}_${note.title.replace(/[\\/:*?"<>|\s]+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet card cn-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`개념 노트 ${note.title}`}>
        <div className="sheet-handle" />
        <div className="cn-label">개념 노트 · {note.unitTitle}</div>
        <div className="sheet-title">
          {note.no}. {note.title}
        </div>
        <section className="cn-block">
          <h3>핵심</h3>
          <p>{note.key}</p>
        </section>
        {note.example && (
          <section className="cn-block">
            <h3>예시</h3>
            <p>{note.example}</p>
          </section>
        )}
        {note.misconception && (
          <section className="cn-block warn">
            <h3>헷갈리기 쉬운 점</h3>
            <p>{note.misconception}</p>
          </section>
        )}
        <p className="tiny muted">읽은 뒤에는 내 말로 다시 정리해서 배배에게 설명해 보세요. 대화를 마치기 전에 배배가 한 번 더 물어볼 거예요.</p>
        <div className="cn-actions">
          <button className="btn" onClick={download}>파일로 저장</button>
          <button className="btn btn-ink" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}
