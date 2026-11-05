import { useState } from 'react';
import { api } from '../api.js';
import { toast } from './Toast.jsx';

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
          <span className="muted tiny">{busy ? '배배가 단원 구성을 정리하고 있어요… (10초 정도 걸려요)' : '단원과 소단원은 교육과정에 맞춰 자동으로 채워져요'}</span>
        </div>

        <button className="btn btn-ink" disabled={!ready || busy}>
          {busy ? '만드는 중…' : '노트북 만들기'}
        </button>
      </form>
    </div>
  );
}
