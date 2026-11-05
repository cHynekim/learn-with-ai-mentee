import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { migrate } from './db.js';
import authRoutes, { authenticate, requireUser } from './routes/auth.js';
import studentRoutes from './routes/student.js';
import guardianRoutes from './routes/guardian.js';

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(authenticate);

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/student', requireUser, studentRoutes);
app.use('/api/guardian', requireUser, guardianRoutes);

// 배포 시: 빌드된 React 앱을 같은 서버에서 서빙
const dist = path.resolve(import.meta.dirname, '../../client/dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: '잠시 문제가 생겼어요. 다시 시도해 주세요.' });
});

await migrate();
const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`🐣 mentee server on http://localhost:${port}`));
