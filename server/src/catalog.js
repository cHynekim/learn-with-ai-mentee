// 노트북(과목) 카탈로그: 기본 제공 노트북(content.js) + 학생이 만든 노트북(DB)
import { one, many, q } from './db.js';
import { SUBJECTS } from './content.js';
import { chatJson } from './ai.js';

export const LEVELS = {
  elementary: { label: '초등', school: '초등학교', maxGrade: 6 },
  middle: { label: '중등', school: '중학교', maxGrade: 3 },
  high: { label: '고등', school: '고등학교', maxGrade: 3 },
};
const PALETTE = ['#E07A5F', '#7B6FD6', '#1E8C8C', '#D16BA5', '#C27C0E', '#3B86C9', '#23A576', '#D95B5B'];

export const termLabel = (s) => `${s.grade}-${s.semester} ${s.name}`;
export const schoolLabel = (s) => `${LEVELS[s.level].school} ${s.grade}학년 ${s.semester}학기`;

function fromRow(r) {
  return {
    id: `nb-${r.id}`,
    rowId: r.id,
    custom: true,
    name: r.subject,
    level: r.level,
    grade: r.grade,
    semester: r.semester,
    color: r.color,
    featuredUnit: r.units[0]?.id,
    units: r.units,
  };
}

export async function listSubjects(studentId) {
  const rows = await many('SELECT * FROM notebooks WHERE student_id=$1 ORDER BY id', [studentId]);
  const hidden = new Set((await many('SELECT subject_id FROM hidden_notebooks WHERE student_id=$1', [studentId])).map((r) => r.subject_id));
  return [...Object.values(SUBJECTS).filter((s) => !hidden.has(s.id)), ...rows.map(fromRow)];
}

export async function getSubject(studentId, subjectId) {
  if (SUBJECTS[subjectId]) {
    const hidden = await one('SELECT 1 FROM hidden_notebooks WHERE student_id=$1 AND subject_id=$2', [studentId, subjectId]);
    return hidden ? null : SUBJECTS[subjectId];
  }
  const m = /^nb-(\d+)$/.exec(subjectId || '');
  if (!m) return null;
  const row = await one('SELECT * FROM notebooks WHERE id=$1 AND student_id=$2', [m[1], studentId]);
  return row ? fromRow(row) : null;
}

export const findUnit = (s, unitId) => s.units.find((u) => u.id === unitId) || s.units.find((u) => u.id === s.featuredUnit) || s.units[0];
export const unitNo = (s, unitId) => s.units.findIndex((u) => u.id === unitId) + 1;

export function publicSubject(s) {
  return {
    id: s.id,
    name: s.name,
    color: s.color,
    level: s.level,
    term: termLabel(s),
    school: schoolLabel(s),
    custom: Boolean(s.custom),
    featuredUnit: s.featuredUnit,
    units: s.units.map((u, i) => ({
      id: u.id,
      no: i + 1,
      title: u.title,
      concepts: u.concepts.map((c, j) => ({ id: c.id, no: `${i + 1}-${j + 1}`, title: c.title })),
    })),
  };
}

// ---------- 새 노트북 만들기 / 수정 / 삭제 ----------
function validate(input) {
  const level = String(input.level || '');
  const grade = Number(input.grade);
  const semester = Number(input.semester);
  const subject = String(input.subject || '').trim().slice(0, 20);
  const L = LEVELS[level];
  if (!L) throw httpError(400, '학교급을 선택해 주세요');
  if (!Number.isInteger(grade) || grade < 1 || grade > L.maxGrade) throw httpError(400, '학년을 다시 확인해 주세요');
  if (![1, 2].includes(semester)) throw httpError(400, '학기를 선택해 주세요');
  if (!subject) throw httpError(400, '과목을 입력해 주세요');
  return { level, grade, semester, subject };
}

const sameBuiltin = ({ level, grade, semester, subject }) =>
  Object.values(SUBJECTS).find((s) => s.level === level && s.grade === grade && s.semester === semester && s.name === subject);

async function generateUnits({ level, grade, semester, subject }) {
  const outline = await chatJson(
    [
      {
        role: 'system',
        content: `너는 한국 교육과정 전문가야. 2022 개정 교육과정 기준으로 해당 학교급·학년·학기 교과에서 일반적으로 다루는 단원 구성을 순서대로 정리해. 특정 출판사가 아닌 공통 흐름으로.
JSON으로만 답해: {"valid":true,"subject":"정식 과목명","units":[{"title":"단원명","concepts":["소단원(개념)명"]}]}
단원 3~7개, 단원마다 소단원 3~6개. 소단원은 학생이 설명할 수 있는 개념 단위로.
과목이 존재하지 않거나 해당 학년·학기에 배우지 않으면 {"valid":false,"reason":"짧은 이유"}`,
      },
      { role: 'user', content: `${LEVELS[level].school} ${grade}학년 ${semester}학기 ${subject}` },
    ],
    { maxTokens: 2500, temperature: 0.3 }
  ).catch(() => null);
  if (!outline) throw httpError(502, '단원 구성을 불러오지 못했어요. 잠시 후 다시 시도해 주세요');
  if (!outline.valid || !outline.units?.length) throw httpError(422, outline.reason || '해당 학년·학기에서 배우는 과목인지 확인해 주세요');
  return outline.units.slice(0, 8).map((u, i) => ({
    id: `u${i + 1}`,
    title: String(u.title).slice(0, 60),
    concepts: (u.concepts || []).slice(0, 8).map((t, j) => ({ id: `u${i + 1}c${j + 1}`, title: String(t).slice(0, 60) })),
  }));
}

function fillDetailsInBackground(nb) {
  for (const u of nb.units) ensureUnitDetails(nb, u.id).catch((e) => console.error('[unit details]', e.message));
}

export async function createNotebook(studentId, input) {
  const v = validate(input);
  const builtin = sameBuiltin(v);
  if (builtin) {
    // 삭제했던 기본 노트북이면 다시 꺼내 준다
    const r = await q('DELETE FROM hidden_notebooks WHERE student_id=$1 AND subject_id=$2', [studentId, builtin.id]);
    if (r.rowCount) return builtin;
    throw httpError(409, '이미 같은 노트북이 있어요');
  }
  const dup = await one('SELECT id FROM notebooks WHERE student_id=$1 AND level=$2 AND grade=$3 AND semester=$4 AND subject=$5', [studentId, v.level, v.grade, v.semester, v.subject]);
  if (dup) throw httpError(409, '이미 같은 노트북이 있어요');

  const units = await generateUnits(v);
  const count = (await one('SELECT COUNT(*)::int AS n FROM notebooks WHERE student_id=$1', [studentId])).n;
  const row = await one(
    `INSERT INTO notebooks (student_id, level, grade, semester, subject, color, units) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [studentId, v.level, v.grade, v.semester, v.subject, PALETTE[count % PALETTE.length], JSON.stringify(units)]
  );
  const nb = fromRow(row);
  fillDetailsInBackground(nb); // 개념별 핵심·흔한 착각은 백그라운드에서 채움 (첫 대화 때 없으면 그때 기다림)
  return nb;
}

/** 노트북 삭제: 학생이 만든 노트북은 지우고, 기본 노트북은 숨긴다. 대화 기록도 함께 삭제 */
export async function deleteNotebooks(studentId, subjectIds) {
  let deleted = 0;
  for (const id of new Set(subjectIds)) {
    if (SUBJECTS[id]) {
      const r = await q('INSERT INTO hidden_notebooks (student_id, subject_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [studentId, id]);
      deleted += r.rowCount;
    } else {
      const m = /^nb-(\d+)$/.exec(id || '');
      if (!m) continue;
      const r = await q('DELETE FROM notebooks WHERE id=$1 AND student_id=$2', [m[1], studentId]);
      deleted += r.rowCount;
    }
    await q('DELETE FROM sessions WHERE student_id=$1 AND subject=$2', [studentId, id]);
  }
  return deleted;
}

const pending = new Map();
/** 학생이 만든 노트북의 단원에 개념 설명(핵심/예시/흔한 착각)이 없으면 AI로 채운다 */
export function ensureUnitDetails(nb, unitId) {
  if (!nb.custom) return Promise.resolve(findUnit(nb, unitId));
  const idx = nb.units.findIndex((u) => u.id === unitId);
  const unit = nb.units[idx];
  if (!unit || unit.concepts.every((c) => c.key)) return Promise.resolve(unit);
  const k = `${nb.rowId}:${unitId}`;
  if (pending.has(k)) return pending.get(k);
  const p = (async () => {
    const out = await chatJson(
      [
        {
          role: 'system',
          content: `너는 ${schoolLabel(nb)} ${nb.name} 교사야. 단원 「${unit.title}」의 각 소단원에 대해 학생이 자기 말로 설명해야 할 핵심을 정리해.
JSON으로만: {"concepts":[{"title":"소단원명 그대로","key":"핵심 내용 1~2문장","example":"짧은 예시","misconception":"학생들이 흔히 하는 착각"}]}
소단원 순서와 개수를 그대로 유지해.`,
        },
        { role: 'user', content: unit.concepts.map((c, i) => `${i + 1}. ${c.title}`).join('\n') },
      ],
      { maxTokens: 2500, temperature: 0.3 }
    );
    const concepts = unit.concepts.map((c, i) => {
      const d = out.concepts?.[i] || {};
      return { ...c, key: String(d.key || c.title), example: String(d.example || ''), misconception: String(d.misconception || '') };
    });
    await q(`UPDATE notebooks SET units = jsonb_set(units, $2::text[], $3::jsonb) WHERE id=$1`, [nb.rowId, [String(idx), 'concepts'], JSON.stringify(concepts)]);
    unit.concepts = concepts;
    return unit;
  })().finally(() => pending.delete(k));
  pending.set(k, p);
  return p;
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}
