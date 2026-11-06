// LLM을 부르는 API 요청 제한 — 시연은 넉넉히, 링크가 퍼져도 비용이 폭증하지 않게
import rateLimit from 'express-rate-limit';

const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
const PER_MIN = num(process.env.LLM_RATE_PER_MIN, 30); // IP당 1분 (대화 한 번에 보통 10~20회)
const PER_HOUR = num(process.env.LLM_RATE_PER_HOUR, 300); // IP당 1시간
const PER_DAY = num(process.env.LLM_DAILY_LIMIT, 3000); // 서버 전체 하루

const tooMany = (message) => (_req, res) => res.status(429).json({ error: message });

const perMinute = rateLimit({
  windowMs: 60 * 1000,
  limit: PER_MIN,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: tooMany('배배가 잠깐 숨 고르는 중이에요. 1분 뒤에 다시 이야기해 주세요.'),
});

const perHour = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: PER_HOUR,
  standardHeaders: false,
  legacyHeaders: false,
  handler: tooMany('오늘은 배배와 정말 많이 이야기했어요! 잠시 후에 다시 와 주세요.'),
});

// 서버 전체 하루 한도 (모든 접속자 합산, 메모리 기준 — 서버를 다시 켜면 초기화)
let dayStart = Date.now();
let dayCount = 0;
function perDay(_req, res, next) {
  if (Date.now() - dayStart > 24 * 60 * 60 * 1000) {
    dayStart = Date.now();
    dayCount = 0;
  }
  if (dayCount >= PER_DAY) {
    console.warn(`[limits] 하루 LLM 한도(${PER_DAY}) 도달`);
    return res.status(429).json({ error: '오늘 준비한 배배와의 대화가 모두 끝났어요. 내일 다시 만나요!' });
  }
  dayCount += 1;
  next();
}

/** LLM을 호출하는 라우트 앞에 붙이는 미들웨어 묶음 */
export const llmLimit = [perMinute, perHour, perDay];

// 아이 연결 코드: 무작위 대입·디도스 대비 — IP당 15분에 최대 10번 시도
export const linkLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: tooMany('연결 코드를 너무 많이 시도했어요. 15분 뒤에 다시 시도해 주세요.'),
});
