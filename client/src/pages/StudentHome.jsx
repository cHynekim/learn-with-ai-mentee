import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import TopBar from '../components/TopBar.jsx';
import Mentee from '../components/Mentee.jsx';
import TeachInput from '../components/TeachInput.jsx';
import { toast } from '../components/Toast.jsx';
import NewNotebookSheet from '../components/NewNotebookSheet.jsx';

const GREETINGS = ['오늘은 뭘 알려주러 왔어?', '오늘 배운 거 나도 알려줘! 궁금해 죽겠어', '선배~ 오늘 수업에서 뭐 배웠어?'];

function greetingTime() {
  const h = new Date().getHours();
  if (h < 11) return '좋은 아침이야';
  if (h < 17) return '안녕';
  return '오늘도 수고했어';
}

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export default function StudentHome() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [subjects, setSubjects] = useState(null); // null = 불러오는 중
  const [subject, setSubject] = useState(null);
  const [creating, setCreating] = useState(false);
  const [unitId, setUnitId] = useState(null);
  const [home, setHome] = useState({ followups: [] });
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const line = useMemo(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)], []);

  useEffect(() => {
    const load = () => {
      api('/student/subjects').then((d) => setSubjects(d.subjects));
      api('/student/home').then(setHome);
    };
    load();
    window.addEventListener('notebooks-changed', load);
    return () => window.removeEventListener('notebooks-changed', load);
  }, []);

  const cur = subjects?.find((s) => s.id === subject);
  useEffect(() => {
    if (subjects?.length && !cur) setSubject(subjects[0].id);
    if (cur) setUnitId(cur.featuredUnit);
  }, [cur?.id, subjects]);

  const onCreated = (nb) => {
    setCreating(false);
    setSubject(nb.id);
    window.dispatchEvent(new Event('notebooks-changed'));
  };
  const unit = cur?.units.find((u) => u.id === unitId);

  const start = async (content) => {
    if (!unit) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append('subject', subject);
      form.append('unitId', unit.id);
      form.append('content', content);
      if (photo) form.append('photo', photo);
      const d = await api('/student/sessions', { method: 'POST', form });
      nav(`/s/${d.session.id}`, { state: { celebrations: d.celebrations } });
    } catch (e) {
      toast(e.message);
      setBusy(false);
    }
  };

  const review = async (f) => {
    setBusy(true);
    try {
      const d = await api('/student/sessions/review', { method: 'POST', body: { subject: f.subject, unitId: f.unitId } });
      nav(`/s/${d.session.id}`);
    } catch (e) {
      toast(e.message);
      setBusy(false);
    }
  };

  const followups = home.followups.filter((f) => f.notYet.length || f.confused.length || f.explained.length);

  return (
    <div className="page">
      <TopBar />
      <main className="home">
        {subjects && subjects.length === 0 ? (
          // 처음 만난 날(노트북이 아직 없음): 배배의 첫인사
          <section className="hello">
            <Mentee size={76} mood="happy" className="bob" />
            <h1 className="hello-title">안녕, 나는 배배야!</h1>
            <p className="hello-sub">
              배우는 걸 정말 좋아하는 {user.name} 선배의 후배야.
              <br />
              선배가 배운 걸 나한테 알려 주면, 나도 열심히 배울게!
            </p>
          </section>
        ) : (
          <section className="hello">
            <Mentee size={76} mood="curious" className="bob" />
            <h1 className="hello-title">{user.name} 선배, {greetingTime()}!</h1>
            <p className="hello-sub">{line}</p>
          </section>
        )}

        {followups.length > 0 && (
          <section className="followups" aria-label="배배가 먼저 묻는 질문">
            {followups.map((f) => {
              const target = f.confused[0] || f.notYet[0];
              return (
                <button key={f.subject} className="followup" onClick={() => review(f)} disabled={busy}>
                  <Mentee size={38} mood="confused" />
                  <div className="fu-text">
                    <div className="fu-tag">
                      {f.term} · {f.unitNo}단원 {f.unitTitle}
                    </div>
                    <div className="fu-q">
                      {target
                        ? f.confused.includes(target)
                          ? `지난번 '${target}' 아직 헷갈려… 한 번만 더 알려줄래?`
                          : `'${target}'은(는) 아직 못 들었어! 그것도 알려줄래?`
                        : `지난번에 배운 ${f.explained[0]}, 나 기억하는지 확인해 줄래?`}
                    </div>
                  </div>
                  <span className="fu-go">대답하러 가기</span>
                </button>
              );
            })}
          </section>
        )}

        {subjects && subjects.length === 0 && (
          <section className="first-notebook">
            <p className="fn-title">우리 같이 볼 노트북부터 만들어 볼까?</p>
            <p className="muted tiny">학교급·학년·학기·과목을 고르면 배울 단원이 정리된 노트북이 생겨요</p>
            <button className="btn btn-accent" onClick={() => setCreating(true)}>
              첫 노트북 만들기
            </button>
          </section>
        )}

        {subjects?.length > 0 && (
        <section className="composer">
          <div className="subject-row">
            <div role="radiogroup" aria-label="노트북 선택" className="subject-chips">
              {subjects.map((s) => (
                <button key={s.id} role="radio" aria-checked={subject === s.id} className={`chip ${subject === s.id ? 'on' : ''}`} onClick={() => setSubject(s.id)}>
                  {s.term}
                </button>
              ))}
            </div>
            {cur && (
              <select className="unit-select" value={unitId || ''} onChange={(e) => setUnitId(e.target.value)} aria-label="단원 선택">
                {cur.units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.no}. {u.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <TeachInput
            onSubmit={start}
            disabled={busy || !unit}
            autoFocus
            placeholder={`오늘 배운 ${cur?.name || ''} 내용을 배배에게 네 말로 정리해 줘`}
            leading={
              <>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
                <button
                  type="button"
                  className={`icon-btn attach-btn ${photo ? 'on' : ''}`}
                  onClick={() => (photo ? setPhoto(null) : fileRef.current.click())}
                  aria-label={photo ? '첨부한 사진 빼기' : '노트 사진 첨부 (선택)'}
                  title={photo ? '첨부 취소' : '노트 사진 첨부 (선택)'}
                  style={photo ? { transform: 'rotate(45deg)' } : undefined}
                >
                  <PlusIcon />
                </button>
                {photo && <span className="attach-name">{photo.name}</span>}
              </>
            }
          />
          <p className="hint">{busy ? '배배가 열심히 듣고 있어요…' : '붙여넣기는 할 수 없어요. 직접 쓰거나 말로 설명해 주세요'}</p>
        </section>
        )}
      </main>
      {creating && <NewNotebookSheet onClose={() => setCreating(false)} onCreated={onCreated} />}
    </div>
  );
}
