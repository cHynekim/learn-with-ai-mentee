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
                          <span className="c-state">{c.fixed ? '고쳐냄' : c.retryOk && c.status === 'confused' ? '다시 설명함' : SHORT[c.status]}</span>
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

/** 요약 속 성장 포인트·개념 보완 과제 (격려하는 관점으로 작성된 문장들) */
export function SummaryPoints({ growth, tasks }) {
  if (!growth?.length && !tasks?.length) return null;
  return (
    <div className="sum-points">
      {growth?.length > 0 && (
        <div className="sp-block grow">
          <div className="sp-label">성장 포인트</div>
          <ul>{growth.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}
      {tasks?.length > 0 && (
        <div className="sp-block task">
          <div className="sp-label">다음 학습 전까지 개념 보완 과제</div>
          <ul>{tasks.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const ChevronSide = ({ dir }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={dir === 'left' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} />
  </svg>
);

/** 대화 기록 달력: 활동한 날은 배경색, 날짜를 누르면 그날의 대화 기록 카드가 아래에 나옴 */
export function SessionCalendar({ sessions, renderCard, emptyText }) {
  const byDay = new Map();
  for (const s of sessions) {
    const k = dayKey(new Date(s.created_at));
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k).push(s);
  }
  const latest = sessions[0] ? new Date(sessions[0].created_at) : new Date();
  const [month, setMonth] = useState(() => new Date(latest.getFullYear(), latest.getMonth(), 1));
  const [selected, setSelected] = useState(() => (sessions[0] ? dayKey(latest) : null));

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(first.getDay()).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  const todayKey = dayKey(new Date());
  const monthCount = [...byDay.keys()].filter((k) => k.startsWith(`${month.getFullYear()}-${month.getMonth() + 1}-`)).length;
  const move = (n) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  const daySessions = (selected && byDay.get(selected)) || [];
  const [, sm, sd] = selected ? selected.split("-") : [];
  const [bursts, setBursts] = useState([]);

  // 그날 받은 스티커 중 맨 앞(첫 대화 카드의 첫 스티커) 이모지
  const firstSticker = (k) => (byDay.get(k) || []).flatMap((s) => s.stickers || [])[0]?.emoji;

  const pick = (k, e) => {
    setSelected(k);
    const emoji = firstSticker(k);
    if (!emoji) return;
    const r = e.currentTarget.getBoundingClientRect();
    const id = Date.now() + Math.random();
    const pieces = Array.from({ length: 12 }, (_, i) => ({
      i,
      dx: Math.round((Math.random() - 0.5) * 160), // 좌우로 퍼지는 정도
      rise: 120 + Math.round(Math.random() * 120), // 떠오르는 높이
      size: 20 + Math.round(Math.random() * 16),
      delay: Math.round(Math.random() * 260),
      dur: 1100 + Math.round(Math.random() * 600),
      rot: Math.round((Math.random() - 0.5) * 50),
    }));
    setBursts((b) => [...b, { id, emoji, x: r.left + r.width / 2, y: r.top + r.height / 2, pieces }]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 2200);
  };

  return (
    <div className="cal-wrap">
      <div className="calendar">
        <div className="cal-head">
          <button className="icon-btn" onClick={() => move(-1)} aria-label="이전 달">
            <ChevronSide dir="left" />
          </button>
          <div className="cal-title">
            {month.getFullYear()}년 {month.getMonth() + 1}월
            <small>{monthCount ? `${monthCount}일 활동` : '활동 없음'}</small>
          </div>
          <button className="icon-btn" onClick={() => move(1)} aria-label="다음 달">
            <ChevronSide dir="right" />
          </button>
        </div>
        <div className="cal-grid" role="grid">
          {WEEK.map((w, i) => (
            <div key={w} className={`cal-week ${i === 0 ? 'sun' : ''}`}>{w}</div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={`b${i}`} />;
            const k = dayKey(d);
            const has = byDay.has(k);
            const sticker = has && firstSticker(k);
            return (
              <button
                key={k}
                className={`cal-day ${has ? 'has' : ''} ${selected === k ? 'sel' : ''} ${todayKey === k ? 'today' : ''}`}
                onClick={(e) => pick(k, e)}
                aria-label={`${d.getMonth() + 1}월 ${d.getDate()}일${has ? `, 대화 ${byDay.get(k).length}개` : ''}${sticker ? ', 응원 스티커 있음' : ''}`}
                aria-pressed={selected === k}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="cal-day-title">
          {sm}월 {sd}일 {daySessions.length ? `· 대화 ${daySessions.length}개` : ''}
        </div>
      )}
      {selected && daySessions.length === 0 && <p className="muted tiny">{sessions.length ? '이 날은 대화 기록이 없어요' : emptyText || '아직 대화 기록이 없어요'}</p>}
      {!selected && sessions.length === 0 && <p className="muted">{emptyText || '아직 대화 기록이 없어요'}</p>}
      <div className="session-list">{daySessions.map(renderCard)}</div>

      {/* 스티커가 떠오르며 사라지는 이펙트 */}
      {bursts.map((b) => (
        <div key={b.id} className="sticker-burst" style={{ left: b.x, top: b.y }} aria-hidden>
          {b.pieces.map((p) => (
            <span
              key={p.i}
              style={{
                fontSize: p.size,
                animationDelay: `${p.delay}ms`,
                animationDuration: `${p.dur}ms`,
                '--dx': `${p.dx}px`,
                '--rise': `${-p.rise}px`,
                '--rot': `${p.rot}deg`,
              }}
            >
              {b.emoji}
            </span>
          ))}
        </div>
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
        <SessionCalendar
          key={`cal-${subject}`}
          sessions={d.sessions}
          emptyText="아직 대화가 없어요. 홈에서 배배에게 알려줘 볼까요?"
          renderCard={(s) => (
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
              <SummaryPoints growth={s.summary?.growth} tasks={s.summary?.review_tasks} />
              <StickerRow stickers={s.stickers} />
            </Link>
          )}
        />
      </main>
    </div>
  );
}
