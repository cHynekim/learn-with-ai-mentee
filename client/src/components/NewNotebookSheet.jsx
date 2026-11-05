import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { toast } from './Toast.jsx';
import Mentee from './Mentee.jsx';

const LEVELS = [
  { id: 'elementary', label: '초등', max: 6 },
  { id: 'middle', label: '중등', max: 3 },
  { id: 'high', label: '고등', max: 3 },
];
const SUGGEST = ['국어', '영어', '수학', '사회', '과학', '역사'];

/** 새 노트북 만들기: 학교급 → 학년 → 학기 → 과목 */
export default function NewNotebookSheet({ onClose, onCreated }) {
  const [level, setLevel] = useState('middle');
  const [grade, setGrade] = useState(null);
  const [semester, setSemester] = useState(null);
  const [subject, setSubject] = useState('');
  const [busy, setBusy] = useState(false);
  const L = LEVELS.find((l) => l.id === level);
  const ready = grade && semester && subject.trim();

  const pickLevel = (id) => {
    setLevel(id);
    if (grade > LEVELS.find((l) => l.id === id).max) setGrade(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    try {
      const { notebook } = await api('/student/notebooks', { method: 'POST', body: { level, grade, semester, subject: subject.trim() } });
      toast(`${notebook.term} 노트북을 만들었어요`);
      onCreated(notebook);
    } catch (err) {
      toast(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="sheet-wrap" onClick={() => !busy && onClose()}>
      <form className="sheet card nn-form" onClick={(e) => e.stopPropagation()} onSubmit={submit} role="dialog" aria-label="새 노트북 만들기">
        <div className="sheet-handle" />
        <div className="sheet-title">새 노트북</div>

        <fieldset className="nn-field">
          <legend>학교급</legend>
          <div className="seg" role="radiogroup">
            {LEVELS.map((l) => (
              <button type="button" key={l.id} role="radio" aria-checked={level === l.id} className={`chip ${level === l.id ? 'on' : ''}`} onClick={() => pickLevel(l.id)}>
                {l.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="nn-field">
          <legend>학년</legend>
          <div className="seg" role="radiogroup">
            {Array.from({ length: L.max }, (_, i) => i + 1).map((g) => (
              <button type="button" key={g} role="radio" aria-checked={grade === g} className={`chip ${grade === g ? 'on' : ''}`} onClick={() => setGrade(g)}>
                {g}학년
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="nn-field">
          <legend>학기</legend>
          <div className="seg" role="radiogroup">
            {[1, 2].map((s) => (
              <button type="button" key={s} role="radio" aria-checked={semester === s} className={`chip ${semester === s ? 'on' : ''}`} onClick={() => setSemester(s)}>
                {s}학기
              </button>
            ))}
          </div>
        </fieldset>

        <label className="field nn-field">
          <span>과목</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="예: 과학" maxLength={20} />
        </label>
        <div className="seg nn-suggest">
          {SUGGEST.map((s) => (
            <button type="button" key={s} className={`chip ${subject === s ? 'on' : ''}`} onClick={() => setSubject(s)}>
              {s}
            </button>
          ))}
        </div>

        <div className="nn-preview">
          <span className="nn-cover">{grade && semester ? `${grade}-${semester}` : '?-?'} {subject.trim() || '과목'}</span>
          <span className="muted tiny">단원과 소단원은 교육과정에 맞춰 자동으로 채워져요</span>
        </div>

        <button className="btn btn-ink" disabled={!ready || busy}>
          {busy ? '만드는 중…' : '노트북 만들기'}
        </button>
      </form>
      {busy && <CreatingModal term={`${grade}-${semester} ${subject.trim()}`} />}
    </div>
  );
}

const STEPS = ['교육과정을 찾아보는 중', '단원을 순서대로 정리하는 중', '소단원을 나누는 중', '노트북 표지를 꾸미는 중'];

/** 노트북을 만드는 동안 띄우는 로딩 모달 (보통 10초 안팎) */
function CreatingModal({ term }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false); // 바로 끝나는 경우(준비된 노트북) 깜빡이지 않게 잠깐 뒤에 표시
  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 300);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2600);
    return () => {
      clearTimeout(show);
      clearInterval(t);
    };
  }, []);
  if (!visible) return null;
  return (
    <div className="loading-modal" role="alertdialog" aria-modal="true" aria-label="노트북을 만드는 중" onClick={(e) => e.stopPropagation()}>
      <div className="lm-card">
        <Mentee size={84} mood="curious" className="bob" />
        <div className="lm-title">{term} 노트북을 만들고 있어요</div>
        <div className="lm-step" aria-live="polite">
          배배가 {STEPS[step]}…
        </div>
        <div className="lm-bar">
          <span />
        </div>
        <div className="tiny muted">10초 정도 걸려요. 창을 닫지 말고 잠시만 기다려 주세요</div>
      </div>
    </div>
  );
}
