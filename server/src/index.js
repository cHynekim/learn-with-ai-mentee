import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { migrate } from './db.js';
import authRoutes, { authenticate, requireUser } from './routes/auth.js';
import studentRoutes from './routes/student.js';
import guardianRoutes from './routes/guardian.js';

// 배포(production)에서는 필수 비밀값이 없거나 예시값이면 시작하지 않음 — 기본 시크릿으로 토큰이 위조되는 걸 막기 위해
if (process.env.NODE_ENV === 'production') {
  const placeholders = ['', 'change-me', 'dev-secret', 'dev-secret-change-me'];
  const problems = [];
  if (placeholders.includes(process.env.JWT_SECRET || '') || (process.env.JWT_SECRET || '').length < 32)
    problems.push('JWT_SECRET (32자 이상의 랜덤 값, 예: openssl rand -hex 32)');
  if (!process.env.DATABASE_URL) problems.push('DATABASE_URL');
  if (problems.length) {
    console.error(`[config] 배포 환경변수가 비어 있거나 예시값이에요: ${problems.join(', ')}`);
    process.exit(1);
  }
}

const app = express();
app.disable('x-powered-by');
// 앞단에 로드밸런서·리버스 프록시가 있을 때만 켬. 직접 노출된 서버에서 켜면 X-Forwarded-For 위조로 요청 제한을 우회할 수 있음
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
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
const port = Number(process.env.PORT) || 3000;
// 0.0.0.0: 컨테이너 밖(EC2 포트 매핑)에서도 접속되도록 모든 인터페이스에서 받음
app.listen(port, '0.0.0.0', () => console.log(`mentee server listening on 0.0.0.0:${port}`));
