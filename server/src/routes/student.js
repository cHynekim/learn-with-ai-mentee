import { Router } from 'express';
import { readFileSync } from 'node:fs';
import { one, many, q } from '../db.js';
import { listSubjects, getSubject, findUnit, unitNo, termLabel, publicSubject, createNotebook, deleteNotebooks, ensureUnitDetails } from '../catalog.js';
import { requireRole, isDemoUser } from './auth.js';
import { aggregateStatuses, groupConcepts, notebooksOverview, notebookDetail } from '../service.js';
import { menteeReply, menteeOpener, sessionSummary } from '../prompts.js';
import { llmLimit } from '../limits.js';
import { notePhoto, AI_VIEWABLE } from '../uploads.js';

const r = Router();
r.use(requireRole('student'));

const clean = (s) => String(s || '').trim().slice(0, 2000);

async function ownSession(req, res) {
  const s = await one('SELECT * FROM sessions WHERE id=$1 AND student_id=$2', [req.params.id, req.user.id]);
  if (!s) res.status(404).json({ error: '대화를 찾을 수 없어요' });
  return s;
}

async function sessionStatusMap(sessionId) {
  const rows = await many('SELECT concept_id, status FROM session_concepts WHERE session_id=$1', [sessionId]);
  return Object.fromEntries(rows.map((r) => [r.concept_id, r.status]));
}

async function sessionRows(sessionId) {
  const rows = await many('SELECT concept_id, status, note, fixed, needs_retry, retry_asked, retry_ok FROM session_concepts WHERE session_id=$1', [sessionId]);
  return Object.fromEntries(rows.map((r) => [r.concept_id, r]));
}

// 헷갈린 개념에 붙여 주는 개념 노트 (준비된 단원 내용으로 만듦 — LLM 호출 없음)
function conceptNote(unit, unitNumber, conceptId) {
  const i = unit.concepts.findIndex((c) => c.id === conceptId);
  const c = unit.concepts[i];
  return {
    conceptId: c.id,
    no: `${unitNumber}-${i + 1}`,
    title: c.title,
    unitTitle: unit.title,
    key: c.key || '',
    example: c.example || '',
    misconception: c.misconception || '',
  };
}

const RETRY_NOTE = '개념 노트를 보고 다시 설명해 볼 개념이에요';

// 학생 메시지 → 후배 답변 + 개념 평가 반영
async function runTurn({ session, user, image }) {
  const subject = await getSubject(user.id, session.subject);
  const unit = await ensureUnitDetails(subject, session.unit_id);
  const unitNumber = unitNo(subject, unit.id);
  const history = await many('SELECT role, content FROM messages WHERE session_id=$1 ORDER BY id', [session.id]);
  const rows = await sessionRows(session.id);
  const agg = await aggregateStatuses(user.id, session.subject, session.unit_id);
  const statusMap = {
    ...Object.fromEntries(Object.entries(agg).map(([k, v]) => [k, v.status])),
    ...Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, v.status])),
  };
  const retryIds = Object.values(rows).filter((r) => r.needs_retry && !r.retry_ok).map((r) => r.concept_id);

  const out = await menteeReply({ subject, unit, statusMap, studentName: user.name, kind: session.kind, history, image, retryIds });

  const titleOf = (id) => unit.concepts.find((c) => c.id === id).title;
  const celebrations = [];
  const attachments = [];
  const flag = async (id, note) => {
    // 이번 대화에서 처음 헷갈린 개념 → '헷갈림'으로 저장하고 개념 노트를 건넴
    await q(
      `INSERT INTO session_concepts (session_id, concept_id, status, note, fixed, needs_retry) VALUES ($1,$2,'confused',$3,false,true)
       ON CONFLICT (session_id, concept_id) DO UPDATE SET status='confused', note=EXCLUDED.note, fixed=false, needs_retry=true, updated_at=now()`,
      [session.id, id, note]
    );
    rows[id] = { ...(rows[id] || {}), status: 'confused', needs_retry: true };
    attachments.push(conceptNote(unit, unitNumber, id));
  };

  for (const ev of out.evaluations) {
    const id = ev.concept_id;
    const row = rows[id];
    const note = ev.note ? String(ev.note).slice(0, 200) : null;
    if (row?.needs_retry) {
      // 헷갈렸던 개념을 다시 잘 설명함 → 칭찬은 하되 노트북에는 '헷갈리는 부분'으로 남김
      if (ev.status === 'explained' && !row.retry_ok) {
        await q(`UPDATE session_concepts SET retry_ok=true, note=$3, updated_at=now() WHERE session_id=$1 AND concept_id=$2`, [session.id, id, note]);
        row.retry_ok = true;
        celebrations.push({ conceptId: id, title: titleOf(id), retry: true, note });
      }
      continue;
    }
    if (row?.status === 'explained') continue; // 한 번 해낸 개념은 내리지 않음
    if (ev.status === 'confused') {
      await flag(id, note || RETRY_NOTE);
      continue;
    }
    const fixed = agg[id]?.status === 'confused'; // 지난 대화에서 헷갈렸던 걸 이번에 해냄
    await q(
      `INSERT INTO session_concepts (session_id, concept_id, status, note, fixed) VALUES ($1,$2,'explained',$3,$4)
       ON CONFLICT (session_id, concept_id) DO UPDATE SET status='explained', note=EXCLUDED.note, fixed=EXCLUDED.fixed, updated_at=now()`,
      [session.id, id, note, fixed]
    );
    rows[id] = { ...(rows[id] || {}), status: 'explained' };
    celebrations.push({ conceptId: id, title: titleOf(id), fixed, note });
  }
  // 답하지 못한 개념도 개념 노트를 건네고 나중에 다시 물어봄
  for (const id of out.stuck || []) {
    if (rows[id]?.status === 'explained' || rows[id]?.needs_retry) continue;
    await flag(id, RETRY_NOTE);
  }

  const msg = await one(`INSERT INTO messages (session_id, role, content, meta) VALUES ($1,'mentee',$2,$3) RETURNING *`, [
    session.id,
    out.reply,
    JSON.stringify({ celebrations, attachments }),
  ]);
  const concepts = await sessionStatusMap(session.id);
  // 단원의 모든 개념을 이번 대화에서 한 번씩 확인했으면(설명함/헷갈림) → 클라이언트가 자동으로 수업 마치기를 진행
  const complete = unit.concepts.every((c) => concepts[c.id]);
  return { message: msg, celebrations, concepts, complete };
}

// 대화를 마치기 전, 헷갈렸던 개념을 한 번 더 물어보는 배배의 말
function retryQuestion(titles) {
  const list = titles.map((t) => `'${t}'`).join(', ');
  return `선배, 끝나기 전에 하나만 더! 아까 ${list} 이야기할 때 내가 잘 못 알아들었거든… 개념 노트도 봤을 테니까, 아까 설명 못 해준 거 한 번만 더 설명해 줄 수 있어? 🥺`;
}

r.get('/home', async (req, res) => {
  // 다음 접속 때 후배가 먼저 질문: 완료된 대화가 있는 과목의 빈 개념·헷갈린 개념
  const followups = [];
  for (const s of await listSubjects(req.user.id)) {
    const last = await one(`SELECT status, kind, unit_id, created_at FROM sessions WHERE student_id=$1 AND subject=$2 ORDER BY id DESC LIMIT 1`, [req.user.id, s.id]);
    if (!last || last.status !== 'done') continue;
    const unit = findUnit(s, last.unit_id);
    const g = groupConcepts(unit, await aggregateStatuses(req.user.id, s.id, unit.id));
    followups.push({
      subject: s.id,
      subjectName: s.name,
      term: termLabel(s),
      unitId: unit.id,
      unitNo: unitNo(s, unit.id),
      unitTitle: unit.title,
      confused: g.confused.map((c) => c.title),
      notYet: g.not_yet.map((c) => c.title),
      explained: g.explained.map((c) => c.title),
      lastAt: last.created_at,
    });
  }
  const active = await one(`SELECT id, subject, title FROM sessions WHERE student_id=$1 AND status='active' ORDER BY id DESC LIMIT 1`, [req.user.id]);
  res.json({ followups, active });
});

r.post('/sessions', llmLimit, notePhoto, async (req, res) => {
  const { subject, unitId } = req.body;
  const content = clean(req.body.content);
  const s = await getSubject(req.user.id, subject);
  const unit = s && findUnit(s, unitId);
  if (!unit) return res.status(400).json({ error: '과목을 선택해 주세요' });
  if (content.length < 2) return res.status(400).json({ error: '오늘 배운 내용을 적어 주세요' });
  const session = await one(
    `INSERT INTO sessions (student_id, subject, unit_id, kind, photo_path, title) VALUES ($1,$2,$3,'teach',$4,$5) RETURNING *`,
    [req.user.id, subject, unit.id, req.file?.filename || null, unit.title]
  );
  await q(`INSERT INTO messages (session_id, role, content) VALUES ($1,'student',$2)`, [session.id, content]);
  let image;
  // AI가 볼 수 있는 이미지(jpg·png·webp)만 전달. HEIC·PDF는 첨부로만 저장
  if (req.file && AI_VIEWABLE.has(req.file.kind)) image = `data:${req.file.detectedMime};base64,${readFileSync(req.file.path).toString("base64")}`;
  const turn = await runTurn({ session, user: req.user, image });
  res.json({ session, ...turn });
});

r.post('/sessions/review', llmLimit, async (req, res) => {
  const { subject } = req.body || {};
  const s = await getSubject(req.user.id, subject);
  if (!s) return res.status(400).json({ error: '과목을 선택해 주세요' });
  const unit = await ensureUnitDetails(s, findUnit(s, req.body.unitId).id);
  const agg = await aggregateStatuses(req.user.id, subject, unit.id);
  const statusMap = Object.fromEntries(Object.entries(agg).map(([k, v]) => [k, v.status]));
  const session = await one(
    `INSERT INTO sessions (student_id, subject, unit_id, kind, title) VALUES ($1,$2,$3,'review',$4) RETURNING *`,
    [req.user.id, subject, unit.id, `${unit.title} 복습`]
  );
  const opener = await menteeOpener({ subject: s, unit, statusMap, studentName: req.user.name });
  await q(`INSERT INTO messages (session_id, role, content) VALUES ($1,'mentee',$2)`, [session.id, opener]);
  res.json({ session });
});

r.get('/sessions/:id', async (req, res) => {
  const session = await ownSession(req, res);
  if (!session) return;
  const messages = await many('SELECT id, role, content, meta, created_at FROM messages WHERE session_id=$1 ORDER BY id', [session.id]);
  const s = await getSubject(req.user.id, session.subject);
  const unit = findUnit(s, session.unit_id);
  res.json({
    session,
    messages,
    concepts: await sessionStatusMap(session.id),
    unit: { id: unit.id, no: unitNo(s, unit.id), title: unit.title, concepts: unit.concepts.map((c) => ({ id: c.id, title: c.title })) },
    subject: { id: s.id, name: s.name, term: termLabel(s) },
  });
});

r.post('/sessions/:id/messages', llmLimit, async (req, res) => {
  const session = await ownSession(req, res);
  if (!session) return;
  if (session.status !== 'active') return res.status(400).json({ error: '이미 끝난 대화예요' });
  const content = clean(req.body?.content);
  if (!content) return res.status(400).json({ error: '내용을 입력해 주세요' });
  const studentMsg = await one(`INSERT INTO messages (session_id, role, content) VALUES ($1,'student',$2) RETURNING *`, [session.id, content]);
  const turn = await runTurn({ session, user: req.user });
  res.json({ studentMessage: studentMsg, ...turn });
});

r.post('/sessions/:id/finish', llmLimit, async (req, res) => {
  const session = await ownSession(req, res);
  if (!session) return;
  if (session.status !== 'done') {
    const s = await getSubject(req.user.id, session.subject);
    const unit = findUnit(s, session.unit_id);
    const rows = await sessionRows(session.id);
    // 헷갈렸던 개념이 남아 있으면, 마치기 전에 배배가 한 번 더 물어봄 (개념마다 한 번만)
    const pending = Object.values(rows).filter((r) => r.needs_retry && !r.retry_asked && !r.retry_ok);
    if (pending.length) {
      await q(`UPDATE session_concepts SET retry_asked=true WHERE session_id=$1 AND concept_id = ANY($2)`, [session.id, pending.map((r) => r.concept_id)]);
      const titles = pending.map((r) => unit.concepts.find((c) => c.id === r.concept_id)?.title).filter(Boolean);
      const message = await one(`INSERT INTO messages (session_id, role, content, meta) VALUES ($1,'mentee',$2,$3) RETURNING *`, [
        session.id,
        retryQuestion(titles),
        JSON.stringify({ retryAsk: pending.map((r) => r.concept_id) }),
      ]);
      return res.json({ retry: true, message });
    }
    const history = await many('SELECT role, content FROM messages WHERE session_id=$1 ORDER BY id', [session.id]);
    const summary = await sessionSummary({
      subject: s,
      unit,
      history,
      details: rows,
      studentName: req.user.name,
    });
    await q(`UPDATE sessions SET status='done', ended_at=now(), summary=$2, title=COALESCE($3, title) WHERE id=$1`, [
      session.id,
      JSON.stringify(summary),
      summary.title || null,
    ]);
  }
  res.json({ ok: true });
});

r.get('/sessions/:id/result', async (req, res) => {
  const session = await ownSession(req, res);
  if (!session) return;
  const s = await getSubject(req.user.id, session.subject);
  const unit = findUnit(s, session.unit_id);
  const rows = await many('SELECT concept_id, status, note, fixed, retry_ok FROM session_concepts WHERE session_id=$1', [session.id]);
  res.json({
    session,
    subject: { id: s.id, name: s.name, term: termLabel(s) },
    unit: { id: unit.id, no: unitNo(s, unit.id), title: unit.title },
    groups: groupConcepts(unit, Object.fromEntries(rows.map((r) => [r.concept_id, r]))),
  });
});

r.post('/sessions/:id/share', async (req, res) => {
  const session = await ownSession(req, res);
  if (!session) return;
  await q('UPDATE sessions SET shared=$2 WHERE id=$1', [session.id, req.body?.shared !== false]);
  res.json({ ok: true });
});

r.get('/subjects', async (req, res) => res.json({ subjects: (await listSubjects(req.user.id)).map(publicSubject) }));

r.get('/notebooks', async (req, res) => res.json({ notebooks: await notebooksOverview(req.user.id) }));

// 새 노트북: 학교급·학년·학기·과목 → AI가 단원 구성을 만들어 저장
r.post('/notebooks', llmLimit, async (req, res) => {
  try {
    const nb = await createNotebook(req.user.id, req.body || {});
    res.json({ notebook: publicSubject(nb) });
  } catch (e) {
    if (!e.status) throw e;
    res.status(e.status).json({ error: e.message });
  }
});

r.post('/notebooks/delete', async (req, res) => {
  // 시연용 계정은 여러 사람이 동시에 쓰므로 노트북 삭제를 막음
  if (isDemoUser(req.user)) return res.status(403).json({ error: '시연용 계정에서는 노트북을 삭제할 수 없어요' });
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : [];
  if (!ids.length) return res.status(400).json({ error: '삭제할 노트북을 선택해 주세요' });
  res.json({ deleted: await deleteNotebooks(req.user.id, ids) });
});

r.get('/notebooks/:subject', async (req, res) => {
  const d = await notebookDetail(req.user.id, req.params.subject);
  if (!d) return res.status(404).json({ error: '노트북이 없어요' });
  res.json(d);
});

r.get('/guardians', async (req, res) => {
  res.json({
    guardians: await many(
      `SELECT u.id, u.name, u.role FROM guardian_links g JOIN users u ON u.id=g.guardian_id WHERE g.student_id=$1`,
      [req.user.id]
    ),
  });
});

export default r;
