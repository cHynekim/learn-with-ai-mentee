import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, fmtDate } from '../api.js';
import TopBar from '../components/TopBar.jsx';

const STATE_LABEL = { explained: '설명한 개념', confused: '헷갈리는 부분', not_yet: '아직 꺼내지 않은 개념' };
const SHORT = { explained: '설명함', confused: '헷갈림', not_yet: '아직' };

const Chevron = () => (
  <svg className="chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export function Legend() {
  return (
    <div className="legend" aria-hidden>
      {Object.entries(STATE_LABEL).map(([k, v]) => (
        <span key={k}>
          <i className={`s-${k}`} />
          {v}
        </span>
      ))}
    </div>
  );
}

/** 단원별 아코디언. 1단원부터 순서대로, 소단원은 "1-1." 형식, 상태는 li 배경색으로 구분 */
export function UnitAccordion({ units }) {
  const [open, setOpen] = useState(() => {
    const touched = units.filter((u) => u.explained || u.confused).map((u) => u.id);
    return new Set(touched.length ? touched : [units[0]?.id]);
  });
  const toggle = (id) =>
    setOpen((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <>
      <Legend />
      <div className="units">
        {units.map((u) => {
          const isOpen = open.has(u.id);
          return (
            <section key={u.id} className={`unit ${isOpen ? 'open' : ''}`}>
              <button className="unit-head" onClick={() => toggle(u.id)} aria-expanded={isOpen} aria-controls={`unit-${u.id}`}>
                <span className="unit-no">{u.no}.</span>
                <span className="unit-title">{u.title}</span>
                <span className="unit-meta">
                  {u.explained}/{u.total}
                </span>
                <Chevron />
              </button>
              <div className="unit-body" id={`unit-${u.id}`}>
                <div>
                  <ol className="concept-list">
                    {u.concepts.map((c) => (
                      <li key={c.id} className={`concept s-${c.status}`} aria-disabled={c.status === 'not_yet'} title={STATE_LABEL[c.status]}>
                        <div className="c-row">
                          <span className="c-no">{c.no}.</span>
                          <span className="c-title">{c.title}</span>
                          <span className="c-state">{c.fixed ? '고쳐냄' : SHORT[c.status]}</span>
                        </div>
                        {c.note && c.status !== 'not_yet' && <div className="c-note">{c.note}</div>}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

export function StickerRow({ stickers }) {
  if (!stickers?.length) return null;
  return (
    <div className="sticker-row">
      {stickers.map((s) => (
        <span key={s.id} className="sticker" title={s.label}>
          {s.emoji}
          <small>{s.from_name}</small>
        </span>
      ))}
    </div>
  );
}

export function ExplainedTags({ concepts }) {
  const list = concepts.filter((c) => c.status === 'explained');
  if (!list.length) return null;
  return (
    <div className="chips-wrap">
      {list.map((c) => (
        <span key={c.concept_id} className="tag tag-ok">
          {c.no}. {c.title}
        </span>
      ))}
    </div>
  );
}

export default function Notebook() {
  const { subject } = useParams();
  const [d, setD] = useState(null);

  useEffect(() => {
    setD(null);
    api(`/student/notebooks/${subject}`).then(setD);
  }, [subject]);

  if (!d) return <div className="boot">불러오는 중…</div>;

  return (
    <div className="page">
      <TopBar />
      <main className="notebook" style={{ '--nb': d.subject.color }}>
        <header className="nb-head">
          <div className="nb-head-cover" />
          <div>
            <h1 className="h1">{d.subject.term}</h1>
            <p className="muted tiny">{d.subject.school} · {d.units.length}개 단원</p>
          </div>
        </header>

        <UnitAccordion key={subject} units={d.units} />

        <h2 className="h2">배배와의 대화 기록</h2>
        {d.sessions.length === 0 && <p className="muted">아직 대화가 없어요. 홈에서 배배에게 알려줘 볼까요?</p>}
        <div className="session-list">
          {d.sessions.map((s) => (
            <Link key={s.id} to={`/s/${s.id}`} className="session-card card">
              <div className="sc-top">
                <span className="sc-date">{fmtDate(s.created_at)}</span>
                {s.kind === 'review' && <span className="tag">복습</span>}
                <span className={`tag ${s.shared ? 'tag-ok' : ''}`}>{s.shared ? '공유됨' : '나만 보기'}</span>
              </div>
              {s.unit && <div className="sc-unit">{s.unit.no}단원 · {s.unit.title}</div>}
              <div className="sc-title">{s.title}</div>
              {s.summary?.summary && <p className="sc-sum">{s.summary.summary}</p>}
              <ExplainedTags concepts={s.concepts} />
              <StickerRow stickers={s.stickers} />
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
