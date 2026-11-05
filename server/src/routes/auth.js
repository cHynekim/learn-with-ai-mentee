import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { one, inviteCode } from '../db.js';

const r = Router();
// 'dev-secret'은 로컬 개발용 기본값. production에서는 index.js가 JWT_SECRET 없이 시작하지 않음
const SECRET = () => process.env.JWT_SECRET || 'dev-secret';
const CLIENT = () => process.env.CLIENT_URL || '';
const SERVER = () => process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3000}`;
// secure는 HTTPS일 때만 켜야 함. HTTP 배포에서 켜면 브라우저가 쿠키를 저장하지 않아 로그인이 안 됨
const baseCookie = { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', path: '/' };
const cookieOpts = { ...baseCookie, maxAge: 1000 * 60 * 60 * 24 * 30 };

const PROVIDERS = {
  google: {
    id: () => process.env.GOOGLE_CLIENT_ID,
    secret: () => process.env.GOOGLE_CLIENT_SECRET,
    authUrl: (p) =>
      `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({ ...p, response_type: 'code', scope: 'openid email profile' })}`,
    async profile(code, redirect_uri) {
      const tok = await (
        await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          body: new URLSearchParams({ code, client_id: this.id(), client_secret: this.secret(), redirect_uri, grant_type: 'authorization_code' }),
        })
      ).json();
      const me = await (await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${tok.access_token}` } })).json();
      return { providerId: me.sub, email: me.email, name: me.name, avatar: me.picture };
    },
  },
  naver: {
    id: () => process.env.NAVER_CLIENT_ID,
    secret: () => process.env.NAVER_CLIENT_SECRET,
    authUrl: (p) => `https://nid.naver.com/oauth2.0/authorize?${new URLSearchParams({ ...p, response_type: 'code' })}`,
    async profile(code, redirect_uri, state) {
      const tok = await (
        await fetch(
          `https://nid.naver.com/oauth2.0/token?${new URLSearchParams({ grant_type: 'authorization_code', client_id: this.id(), client_secret: this.secret(), code, state, redirect_uri })}`
        )
      ).json();
      const me = await (await fetch('https://openapi.naver.com/v1/nid/me', { headers: { Authorization: `Bearer ${tok.access_token}` } })).json();
      return { providerId: me.response.id, email: me.response.email, name: me.response.name || me.response.nickname, avatar: me.response.profile_image };
    },
  },
  kakao: {
    id: () => process.env.KAKAO_CLIENT_ID,
    secret: () => process.env.KAKAO_CLIENT_SECRET,
    authUrl: (p) => `https://kauth.kakao.com/oauth/authorize?${new URLSearchParams({ ...p, response_type: 'code' })}`,
    async profile(code, redirect_uri) {
      const body = { grant_type: 'authorization_code', client_id: this.id(), redirect_uri, code };
      if (this.secret()) body.client_secret = this.secret();
      const tok = await (await fetch('https://kauth.kakao.com/oauth/token', { method: 'POST', body: new URLSearchParams(body) })).json();
      const me = await (await fetch('https://kapi.kakao.com/v2/user/me', { headers: { Authorization: `Bearer ${tok.access_token}` } })).json();
      const p = me.kakao_account?.profile;
      // 카카오 기본 프로필(사진 없음)이면 is_default_image=true — 그때는 이니셜을 보여줌
      const avatar = p && !p.is_default_image ? p.thumbnail_image_url || p.profile_image_url : null;
      return { providerId: String(me.id), email: me.kakao_account?.email, name: p?.nickname, avatar };
    },
  },
};

export function issue(res, user) {
  res.cookie('token', jwt.sign({ uid: user.id }, SECRET(), { expiresIn: '30d' }), cookieOpts);
}

export async function authenticate(req, _res, next) {
  try {
    const { uid } = jwt.verify(req.cookies.token, SECRET());
    req.user = await one('SELECT * FROM users WHERE id=$1', [uid]);
  } catch {
    req.user = null;
  }
  next();
}

export const requireUser = (req, res, next) => (req.user ? next() : res.status(401).json({ error: '로그인이 필요해요' }));
export const requireRole = (...roles) => (req, res, next) =>
  req.user && roles.includes(req.user.role) ? next() : res.status(403).json({ error: '권한이 없어요' });

// 프로필 사진 주소는 https만 저장 (http면 https로 바꿔 시도 — HTTPS 페이지에서 http 이미지는 차단됨)
function safeAvatar(url) {
  if (typeof url !== 'string' || url.length > 1000) return null;
  const u = url.replace(/^http:\/\//, 'https://');
  return /^https:\/\/[^\s"'<>]+$/.test(u) ? u : null;
}

async function findOrCreate(provider, { providerId, email, name, avatar }) {
  return one(
    `INSERT INTO users (provider, provider_id, email, name, avatar_url) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (provider, provider_id) DO UPDATE SET email=COALESCE(EXCLUDED.email, users.email), avatar_url=EXCLUDED.avatar_url
     RETURNING *`,
    [provider, providerId, email || null, name || null, safeAvatar(avatar)]
  );
}

const publicUser = (u) =>
  u && {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    provider: u.provider,
    avatarUrl: u.avatar_url || null,
    inviteCode: u.role === 'student' ? u.invite_code : undefined,
  };

r.get('/providers', (_req, res) => {
  res.json({
    providers: Object.fromEntries(Object.entries(PROVIDERS).map(([k, p]) => [k, Boolean(p.id())])),
    demo: process.env.DEMO_MODE === 'true',
  });
});

r.get('/me', (req, res) => res.json({ user: publicUser(req.user) }));

r.get('/:provider', (req, res) => {
  const p = PROVIDERS[req.params.provider];
  if (!p) return res.status(404).end();
  if (!p.id()) return res.redirect(`${CLIENT()}/auth/mock/${req.params.provider}`);
  const state = crypto.randomBytes(12).toString('hex');
  res.cookie('oauth_state', state, { ...cookieOpts, maxAge: 10 * 60 * 1000 });
  res.redirect(p.authUrl({ client_id: p.id(), redirect_uri: `${SERVER()}/api/auth/${req.params.provider}/callback`, state }));
});

r.get('/:provider/callback', async (req, res) => {
  const p = PROVIDERS[req.params.provider];
  if (!p) return res.status(404).end();
  try {
    if (!req.query.code || req.query.state !== req.cookies.oauth_state) throw new Error('state mismatch');
    const profile = await p.profile(req.query.code, `${SERVER()}/api/auth/${req.params.provider}/callback`, req.query.state);
    const user = await findOrCreate(req.params.provider, profile);
    issue(res, user);
    res.redirect(`${CLIENT()}${user.role ? '/' : '/signup'}`);
  } catch (e) {
    console.error('[oauth]', e.message);
    res.redirect(`${CLIENT()}/login?error=oauth`);
  }
});

// 개발 환경: 간편로그인 키가 없을 때 쓰는 모의 로그인
r.post('/mock', async (req, res) => {
  const { provider, name, email } = req.body || {};
  if (!PROVIDERS[provider] || PROVIDERS[provider].id()) return res.status(400).json({ error: '사용할 수 없어요' });
  if (!email) return res.status(400).json({ error: '이메일을 입력해 주세요' });
  const user = await findOrCreate(provider, { providerId: `mock:${email}`, email, name });
  issue(res, user);
  res.json({ user: publicUser(user) });
});

// 시연용 계정 바로 입장
r.post('/demo', async (req, res) => {
  if (process.env.DEMO_MODE !== 'true') return res.status(404).end();
  const map = { student: 'demo-student', guardian: 'demo-guardian' };
  const user = await one('SELECT * FROM users WHERE provider=$1 AND provider_id=$2', ['demo', map[req.body?.who]]);
  if (!user) return res.status(404).json({ error: 'npm run seed 를 먼저 실행해 주세요' });
  issue(res, user);
  res.json({ user: publicUser(user) });
});

r.post('/signup', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: '로그인이 필요해요' });
  const { role, name } = req.body || {};
  if (!['student', 'guardian'].includes(role)) return res.status(400).json({ error: '역할을 선택해 주세요' });
  if (!name?.trim()) return res.status(400).json({ error: '이름을 입력해 주세요' });
  let user;
  for (let i = 0; i < 5 && !user; i++) {
    try {
      user = await one('UPDATE users SET role=$1, name=$2, invite_code=$3 WHERE id=$4 RETURNING *', [
        role,
        name.trim().slice(0, 30),
        role === 'student' ? inviteCode() : null,
        req.user.id,
      ]);
    } catch (e) {
      if (e.code !== '23505') throw e;
    }
  }
  res.json({ user: publicUser(user) });
});

r.post('/logout', (_req, res) => {
  res.clearCookie('token', baseCookie);
  res.json({ ok: true });
});

export { publicUser };
export default r;
