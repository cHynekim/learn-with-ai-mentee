import { many } from './db.js';
import { STICKERS } from './content.js';
import { listSubjects, getSubject, termLabel, schoolLabel } from './catalog.js';

// 학생의 과목별 개념 상태 집계 (개념별 가장 최근 상태). sharedOnly면 공유된 세션만.
export async function aggregateStatuses(studentId, subject, unitId, { sharedOnly = false } = {}) {
  const rows = await many(
    `SELECT DISTINCT ON (sc.concept_id) sc.concept_id, sc.status, sc.note, sc.fixed, sc.retry_ok
       FROM session_concepts sc JOIN sessions s ON s.id = sc.session_id
      WHERE s.student_id=$1 AND s.subject=$2 ${unitId ? 'AND s.unit_id=$3' : ''} ${sharedOnly ? 'AND s.shared' : ''}
      ORDER BY sc.concept_id, sc.updated_at DESC`,
    unitId ? [studentId, subject, unitId] : [studentId, subject]
  );
  return Object.fromEntries(rows.map((r) => [r.concept_id, r]));
}

export function groupConcepts(unit, statusRows) {
  const groups = { explained: [], confused: [], not_yet: [] };
  for (const c of unit.concepts) {
    const s = statusRows[c.id];
    const status = s?.status || 'not_yet';
    groups[status].push({ id: c.id, title: c.title, note: s?.note || null, fixed: Boolean(s?.fixed), retryOk: Boolean(s?.retry_ok) });
  }
  return groups;
}

// 단원 순서(1단원부터) + 소단원 번호(1-1.)로 정렬된 개념 목록
export function orderedUnits(subject, statusRows) {
  return subject.units.map((u, i) => {
    const concepts = u.concepts.map((c, j) => {
      const s = statusRows[c.id];
      return { id: c.id, no: `${i + 1}-${j + 1}`, title: c.title, status: s?.status || 'not_yet', note: s?.note || null, fixed: Boolean(s?.fixed), retryOk: Boolean(s?.retry_ok) };
    });
    return {
      id: u.id,
      no: i + 1,
      title: u.title,
      concepts,
      explained: concepts.filter((c) => c.status === 'explained').length,
      confused: concepts.filter((c) => c.status === 'confused').length,
      total: concepts.length,
    };
  });
}

async function stickersFor(sessionIds) {
  if (!sessionIds.length) return {};
  const rows = await many(
    `SELECT st.id, st.session_id, st.sticker, st.created_at, u.name AS from_name, u.role AS from_role
       FROM stickers st JOIN users u ON u.id = st.guardian_id
      WHERE st.session_id = ANY($1) ORDER BY st.id`,
    [sessionIds]
  );
  const map = {};
  for (const r of rows) (map[r.session_id] ||= []).push({ ...r, ...STICKERS[r.sticker] });
  return map;
}

export async function notebooksOverview(studentId, { sharedOnly = false } = {}) {
  const counts = await many(
    `SELECT subject, COUNT(*)::int AS sessions, MAX(created_at) AS last_at
       FROM sessions WHERE student_id=$1 AND status='done' ${sharedOnly ? 'AND shared' : ''} GROUP BY subject`,
    [studentId]
  );
  const bySubject = Object.fromEntries(counts.map((c) => [c.subject, c]));
  const out = [];
  for (const s of await listSubjects(studentId)) {
    const units = orderedUnits(s, await aggregateStatuses(studentId, s.id, null, { sharedOnly }));
    out.push({
      subject: s.id,
      name: s.name,
      term: termLabel(s),
      school: schoolLabel(s),
      level: s.level,
      grade: s.grade,
      semester: s.semester,
      custom: Boolean(s.custom),
      color: s.color,
      total: units.reduce((a, u) => a + u.total, 0),
      explained: units.reduce((a, u) => a + u.explained, 0),
      confused: units.reduce((a, u) => a + u.confused, 0),
      sessions: bySubject[s.id]?.sessions || 0,
      lastAt: bySubject[s.id]?.last_at || null,
    });
  }
  return out;
}

export async function notebookDetail(studentId, subjectId, { sharedOnly = false } = {}) {
  const subject = await getSubject(studentId, subjectId);
  if (!subject) return null;
  const units = orderedUnits(subject, await aggregateStatuses(studentId, subjectId, null, { sharedOnly }));
  const sessions = await many(
    `SELECT s.id, s.unit_id, s.kind, s.title, s.summary, s.shared, s.created_at, s.ended_at,
            (SELECT COUNT(*)::int FROM messages m WHERE m.session_id=s.id) AS message_count,
            (SELECT json_agg(json_build_object('concept_id', concept_id, 'status', status))
               FROM session_concepts WHERE session_id=s.id) AS concepts
       FROM sessions s
      WHERE s.student_id=$1 AND s.subject=$2 AND s.status='done' ${sharedOnly ? 'AND s.shared' : ''}
      ORDER BY s.created_at DESC`,
    [studentId, subjectId]
  );
  const st = await stickersFor(sessions.map((s) => s.id));
  const info = Object.fromEntries(units.flatMap((u) => u.concepts.map((c) => [c.id, c])));
  const unitOf = Object.fromEntries(units.map((u) => [u.id, u]));
  return {
    subject: { id: subject.id, name: subject.name, term: termLabel(subject), school: schoolLabel(subject), color: subject.color },
    units,
    sessions: sessions.map((s) => ({
      ...s,
      unit: unitOf[s.unit_id] ? { no: unitOf[s.unit_id].no, title: unitOf[s.unit_id].title } : null,
      concepts: (s.concepts || [])
        .map((c) => ({ ...c, title: info[c.concept_id]?.title, no: info[c.concept_id]?.no }))
        .sort((a, b) => (a.no || '').localeCompare(b.no || '', undefined, { numeric: true })),
      stickers: st[s.id] || [],
    })),
  };
}
