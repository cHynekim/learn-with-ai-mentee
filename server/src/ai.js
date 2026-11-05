// Baze(Mindlogic) API Gateway — OpenAI 호환 chat completions
const BASE = () => process.env.AI_BASE_URL || 'https://factchat-cloud.mindlogic.ai/v1/gateway';
const MODEL = () => process.env.AI_MODEL || 'claude-sonnet-5-5';

export async function chat(messages, { maxTokens = 900, temperature = 0.7 } = {}) {
  const res = await fetch(`${BASE()}/chat/completions/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.AI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL(), messages, max_tokens: maxTokens, temperature }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const choice = data.choices?.[0];
  if (choice?.finish_reason && choice.finish_reason !== 'stop') {
    console.warn('[ai] finish_reason', choice.finish_reason, JSON.stringify(data.usage));
  }
  return choice?.message?.content || '';
}

export function parseJson(text) {
  const cleaned = text.replace(/```(?:json)?/g, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('JSON not found');
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function chatJson(messages, opts) {
  let last;
  for (let i = 0; i < 3; i++) {
    const raw = await chat(messages, opts);
    try {
      return parseJson(raw);
    } catch (e) {
      console.warn(`[ai] JSON 파싱 실패 (시도 ${i + 1}):`, JSON.stringify(raw).slice(0, 200));
      last = e;
    }
  }
  throw last;
}
