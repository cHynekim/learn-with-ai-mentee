import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, fmtDate } from '../api.js';
import TopBar, { NotebookStrip } from '../components/TopBar.jsx';
import Mentee from '../components/Mentee.jsx';
import { UnitAccordion, StickerRow, ExplainedTags, SummaryPoints, SessionCalendar } from './Notebook.jsx';
import { toast } from '../components/Toast.jsx';

const QUICK = [
  { type: 'today', short: '오늘 학습 요약', label: '오늘 학생의 학습 요약' },
  { type: 'persona', short: '학생 분석', label: '우리 학생은 어떤 학생일까?' },
  { type: 'help', short: '학습 도움', label: '학생의 학습을 도와주려면?' },
];

export default function GuardianStudent() {
  const { sid } = useParams();
  const nav = useNavigate();
  const [overview, setOverview] = useState(null);
  const [subject, setSubject] = useState(null);
  const [detail, setDetail] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [picker, setPicker] = useState(null);

  useEffect(() => {
    api(`/guardian/students/${sid}/notebooks`)
      .then((d) => {
        setOverview(d);
        const first = d.notebooks.find((n) => n.sessions > 0) || d.notebooks[0];
        setSubject(first?.subject);
      })
      .catch(() => nav('/'));
  }, [sid]);

  useEffect(() => {
    if (!subject) return;
    setDetail(null);
    api(`/guardian/students/${sid}/notebooks/${subject}`).then(setDetail);
  }, [subject, sid]);

  const ask = async (q) => {
    setSheet({ ...q, loading: true });
    try {
      const r = await api(`/guardian/students/${sid}/insight`, { method: 'POST', body: { type: q.type } });
      setSheet({ ...q, text: r.text });
    } catch (e) {
      setSheet(null);
      toast(e.message);
    }
  };

  const stick = async (sessionId, sticker) => {
    try {
      const r = await api(`/guardian/sessions/${sessionId}/stickers`, { method: 'POST', body: { sticker } });
      setDetail((d) => ({
        ...d,
        sessions: d.sessions.map((s) => (s.id === sessionId ? { ...s, stickers: [...s.stickers, r.sticker] } : s)),
      }));
      setPicker(null);
      toast(`${r.sticker.label} 스티커를 보냈어요`);
    } catch (e) {
      toast(e.message);
    }
  };

  if (!overview) return <div className="boot">불러오는 중…</div>;
  const name = overview.student.name;

  return (
    <div className="page has-quick">
      <TopBar showShelf={false} backTo="/" />
      <main className="guardian">
        <section className="gs-head">
          <div className="sc-avatar lg">{name[0]}</div>
          <div>
            <h1 className="h1">{name}의 노트북</h1>
            <p className="muted tiny">{name} 학생이 직접 확인하고 공유한 리포트만 보여요</p>
          </div>
        </section>

        <NotebookStrip notebooks={overview.notebooks} activeId={subject} onOpen={(n) => setSubject(n.subject)} />

        {overview.notebooks.length === 0 ? (
          <p className="muted">{name} 학생이 아직 노트북을 만들지 않았어요. 첫 노트북이 생기면 여기에서 볼 수 있어요!</p>
        ) : !detail ? (
          <p className="muted">불러오는 중…</p>
        ) : (
          <>
            <h2 className="h2">{detail.subject.term}</h2>
            <UnitAccordion key={subject} units={detail.units} />

            <h2 className="h2">대화 요약</h2>
            <SessionCalendar
              key={`cal-${subject}`}
              sessions={detail.sessions}
              emptyText="아직 공유된 대화가 없어요. 곧 도착할 거예요!"
              renderCard={(s) => (
                <article key={s.id} className="session-card card">
                  <div className="sc-top">
                    <span className="sc-date">{fmtDate(s.created_at)}</span>
                    {s.kind === 'review' && <span className="tag">복습</span>}
                  </div>
                  {s.unit && <div className="sc-unit">{s.unit.no}단원 · {s.unit.title}</div>}
                  <div className="sc-title">{s.summary?.headline || s.title}</div>
                  {s.summary?.summary && <p className="sc-sum">{s.summary.summary}</p>}
                  {s.summary?.did_well?.length > 0 && (
                    <ul className="did-well">
                      {s.summary.did_well.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  )}
                  <ExplainedTags concepts={s.concepts} />
                  <SummaryPoints growth={s.summary?.growth} tasks={s.summary?.review_tasks} />
                  <StickerRow stickers={s.stickers} />
                  <div className="cheer">
                    {picker === s.id ? (
                      <div className="sticker-picker" role="group" aria-label="응원 스티커 고르기">
                        {Object.entries(detail.stickerSet).map(([k, v]) => (
                          <button key={k} className="sp-item" onClick={() => stick(s.id, k)}>
                            <span>{v.emoji}</span>
                            <small>{v.label}</small>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button className="btn btn-sm" onClick={() => setPicker(s.id)}>
                        응원 스티커 붙이기
                      </button>
                    )}
                  </div>
                </article>
              )}
            />
          </>
        )}
      </main>

      <nav className="quick-menu" aria-label="AI 분석 퀵메뉴">
        {QUICK.map((q) => (
          <button key={q.type} className="qm-btn" onClick={() => ask(q)}>
            {q.short}
          </button>
        ))}
      </nav>

      {sheet && (
        <div className="sheet-wrap" onClick={() => !sheet.loading && setSheet(null)}>
          <div className="sheet card" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={sheet.label}>
            <div className="sheet-handle" />
            <div className="sheet-title">
              {sheet.label.replace('학생', name)}
            </div>
            {sheet.loading ? (
              <div className="sheet-loading">
                <Mentee size={56} mood="curious" className="bob" />
                <p>{name}의 이야기를 살펴보고 있어요…</p>
              </div>
            ) : (
              <>
                <p className="sheet-text">{sheet.text}</p>
                <p className="tiny muted">AI가 {name}의 설명 내용을 바탕으로 응원의 시선으로 정리했어요</p>
                <button className="btn btn-ink" onClick={() => setSheet(null)}>닫기</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
