import { Router } from 'express';
import multer from 'multer';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { one, many, q } from '../db.js';
import { listSubjects, getSubject, findUnit, unitNo, termLabel, publicSubject, createNotebook, deleteNotebooks, ensureUnitDetails } from '../catalog.js';
import { requireRole } from './auth.js';
import { aggregateStatuses, groupConcepts, notebooksOverview, notebookDetail } from '../service.js';
import { menteeReply, menteeOpener, sessionSummary } from '../prompts.js';

const UPLOAD_DIR = path.resolve('uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname) || '.jpg'}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)),
});

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

// 학생 메시지 → 후배 답변 + 개념 평가 반영
async function runTurn({ session, user, image }) {
  const subject = await getSubject(user.id, session.subject);
  const unit = await ensureUnitDetails(subject, session.unit_id);
  const history = await many('SELECT role, content FROM messages WHERE session_id=$1 ORDER BY id', [session.id]);
  const sessionMap = await sessionStatusMap(session.id);
  const agg = await aggregateStatuses(user.id, session.subject, session.unit_id);
  const statusMap = { ...Object.fromEntries(Object.entries(agg).map(([k, v]) => [k, v.status])), ...sessionMap };

  const out = await menteeReply({ subject, unit, statusMap, studentName: user.name, kind: session.kind, history, image });

  const celebrations = [];
  for (const ev of out.evaluations) {
    const cur = sessionMap[ev.concept_id];
    if (cur === 'explained') continue; // 한 번 해낸 개념은 내리지 않음
    const wasConfused = cur === 'confused' || agg[ev.concept_id]?.status === 'confused';
    const fixed = ev.status === 'explained' && wasConfused;
    await q(
      `INSERT INTO session_concepts (session_id, concept_id, status, note, fixed) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (session_id, concept_id) DO UPDATE SET status=EXCLUDED.status, note=EXCLUDED.note, fixed=EXCLUDED.fixed, updated_at=now()`,
      [session.id, ev.concept_id, ev.status, ev.note?.slice(0, 200) || null, fixed]
    );
    if (ev.status === 'explained') {
      const c = unit.concepts.find((c) => c.id === ev.concept_id);
      celebrations.push({ conceptId: c.id, title: c.title, fixed, note: ev.note });
    }
  }
  const msg = await one(`INSERT INTO messages (session_id, role, content, meta) VALUES ($1,'mentee',$2,$3) RETURNING *`, [
    session.id,
    out.reply,
    JSON.stringify({ celebrations }),
  ]);
  return { message: msg, celebrations, concepts: await sessionStatusMap(session.id) };
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

r.post('/sessions', upload.single('photo'), async (req, res) => {
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
  if (req.file) image = `data:${req.file.mimetype};base64,${readFileSync(req.file.path).toString('base64')}`;
  const turn = await runTurn({ session, user: req.user, image });
  res.json({ session, ...turn });
});

r.post('/sessions/review', async (req, res) => {
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

r.post('/sessions/:id/messages', async (req, res) => {
  const session = await ownSession(req, res);
  if (!session) return;
  if (session.status !== 'active') return res.status(400).json({ error: '이미 끝난 대화예요' });
  const content = clean(req.body?.content);
  if (!content) return res.status(400).json({ error: '내용을 입력해 주세요' });
  const studentMsg = await one(`INSERT INTO messages (session_id, role, content) VALUES ($1,'student',$2) RETURNING *`, [session.id, content]);
  const turn = await runTurn({ session, user: req.user });
  res.json({ studentMessage: studentMsg, ...turn });
});

r.post('/sessions/:id/finish', async (req, res) => {
  const session = await ownSession(req, res);
  if (!session) return;
  if (session.status !== 'done') {
    const s = await getSubject(req.user.id, session.subject);
    const unit = findUnit(s, session.unit_id);
    const history = await many('SELECT role, content FROM messages WHERE session_id=$1 ORDER BY id', [session.id]);
    const summary = await sessionSummary({
      subject: s,
      unit,
      history,
      statuses: await sessionStatusMap(session.id),
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
  const rows = await many('SELECT concept_id, status, note, fixed FROM session_concepts WHERE session_id=$1', [session.id]);
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
r.post('/notebooks', async (req, res) => {
  try {
    const nb = await createNotebook(req.user.id, req.body || {});
    res.json({ notebook: publicSubject(nb) });
  } catch (e) {
    if (!e.status) throw e;
    res.status(e.status).json({ error: e.message });
  }
});

r.post('/notebooks/delete', async (req, res) => {
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
