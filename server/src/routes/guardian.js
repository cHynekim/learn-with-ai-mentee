import { Router } from 'express';
import { one, many, q } from '../db.js';
import { STICKERS } from '../content.js';
import { listSubjects } from '../catalog.js';
import { requireRole } from './auth.js';
import { notebooksOverview, notebookDetail } from '../service.js';
import { guardianInsight } from '../prompts.js';
import { llmLimit } from '../limits.js';

const r = Router();
r.use(requireRole('guardian'));

async function linkedStudent(req, res) {
  const s = await one(
    `SELECT u.id, u.name FROM guardian_links g JOIN users u ON u.id=g.student_id WHERE g.guardian_id=$1 AND g.student_id=$2`,
    [req.user.id, req.params.sid]
  );
  if (!s) res.status(404).json({ error: '연결된 학생이 아니에요' });
  return s;
}

r.get('/students', async (req, res) => {
  const students = await many(
    `SELECT u.id, u.name,
            (SELECT COUNT(*)::int FROM sessions s WHERE s.student_id=u.id AND s.shared) AS shared_sessions,
            (SELECT MAX(created_at) FROM sessions s WHERE s.student_id=u.id AND s.shared) AS last_at
       FROM guardian_links g JOIN users u ON u.id=g.student_id
      WHERE g.guardian_id=$1 ORDER BY u.name`,
    [req.user.id]
  );
  for (const s of students) s.notebooks = await notebooksOverview(s.id, { sharedOnly: true });
  res.json({ students, stickers: STICKERS });
});

r.post('/link', async (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  const student = await one(`SELECT id, name FROM users WHERE invite_code=$1 AND role='student'`, [code]);
  if (!student) return res.status(404).json({ error: '코드를 다시 확인해 주세요' });
  await q('INSERT INTO guardian_links (guardian_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.user.id, student.id]);
  res.json({ student });
});

r.get('/students/:sid/notebooks', async (req, res) => {
  const s = await linkedStudent(req, res);
  if (!s) return;
  res.json({ student: s, notebooks: await notebooksOverview(s.id, { sharedOnly: true }) });
});

r.get('/students/:sid/notebooks/:subject', async (req, res) => {
  const s = await linkedStudent(req, res);
  if (!s) return;
  const d = await notebookDetail(s.id, req.params.subject, { sharedOnly: true });
  if (!d) return res.status(404).json({ error: '노트북이 없어요' });
  res.json({ student: s, ...d, stickerSet: STICKERS });
});

r.post('/sessions/:id/stickers', async (req, res) => {
  const { sticker } = req.body || {};
  if (!STICKERS[sticker]) return res.status(400).json({ error: '응원 스티커만 붙일 수 있어요' });
  const ok = await one(
    `SELECT s.id FROM sessions s JOIN guardian_links g ON g.student_id=s.student_id
      WHERE s.id=$1 AND s.shared AND g.guardian_id=$2`,
    [req.params.id, req.user.id]
  );
  if (!ok) return res.status(404).json({ error: '대화를 찾을 수 없어요' });
  const row = await one('INSERT INTO stickers (session_id, guardian_id, sticker) VALUES ($1,$2,$3) RETURNING *', [ok.id, req.user.id, sticker]);
  res.json({ sticker: { ...row, ...STICKERS[sticker], from_name: req.user.name, from_role: req.user.role } });
});

r.post('/students/:sid/insight', llmLimit, async (req, res) => {
  const s = await linkedStudent(req, res);
  if (!s) return;
  const type = req.body?.type;
  if (!['today', 'persona', 'help'].includes(type)) return res.status(400).json({ error: 'type 오류' });

  const sessions = await many(
    `SELECT id, subject, title, summary, created_at FROM sessions
      WHERE student_id=$1 AND shared AND status='done' ORDER BY created_at DESC LIMIT 6`,
    [s.id]
  );
  if (!sessions.length) {
    return res.json({
      title: '',
      text: `${s.name} 학생이 아직 공유한 학습이 없어요. 첫 리포트가 도착하면 바로 분석해 드릴게요! 🌱 그동안 "오늘은 후배에게 뭘 알려줬어?" 하고 따뜻하게 물어봐 주세요.`,
    });
  }
  const overview = await notebooksOverview(s.id, { sharedOnly: true });
  const subjects = await listSubjects(s.id);
  const nameOf = Object.fromEntries(subjects.map((x) => [x.id, x.name]));
  const detail = await Promise.all(subjects.map((x) => notebookDetail(s.id, x.id, { sharedOnly: true })));
  const latest = sessions[0];
  const latestStudentMsgs = await many(`SELECT content FROM messages WHERE session_id=$1 AND role='student' ORDER BY id`, [latest.id]);

  const ctx = [
    '[과목별 개념 현황]',
    ...detail.flatMap((d) =>
      d.units
        .filter((u) => u.explained || u.confused || d.sessions.some((s) => s.unit_id === u.id))
        .map((u) => {
          const by = (st) => u.concepts.filter((c) => c.status === st).map((c) => c.title).join(', ') || '없음';
          return `${d.subject.term} ${u.no}단원 「${u.title}」 — 설명한 개념: ${by('explained')} / 헷갈린 부분: ${by('confused')} / 다음에 볼 개념: ${by('not_yet')}`;
        })
    ),
    '',
    '[최근 학습 기록 (최신순)]',
    ...sessions.map(
      (x) => `- ${new Date(x.created_at).toLocaleDateString('ko-KR')} ${nameOf[x.subject] || ''}: ${x.summary?.summary || x.title} (잘한 점: ${(x.summary?.did_well || []).join(', ')})`
    ),
    '',
    `[가장 최근 학습에서 학생이 후배에게 직접 한 설명]`,
    latestStudentMsgs.map((m) => `"${m.content}"`).join('\n').slice(0, 2500),
    '',
    `학습 횟수: ${overview.map((o) => `${o.name} ${o.sessions}회`).join(', ')}`,
  ].join('\n');

  res.json(await guardianInsight({ type, studentName: s.name, context: ctx }));
});

export default r;
