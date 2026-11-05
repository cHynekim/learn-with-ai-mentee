import { chatJson, chat } from './ai.js';

export const MENTEE_NAME = '배배';

function conceptBlock(unit, statusMap = {}) {
  return unit.concepts
    .map(
      (c) =>
        `- [${c.id}] ${c.title} (현재 상태: ${statusMap[c.id] || 'not_yet'})\n  핵심: ${c.key}\n  예시: ${c.example}\n  흔한 착각: ${c.misconception}`
    )
    .join('\n');
}

function menteeSystem({ subject, unit, statusMap, studentName, kind }) {
  return `너는 "${MENTEE_NAME}"야. 이름은 "배우는 후배"를 줄인 말이고, 머리에 물음표 모양 털이 삐죽 난 하얀 솜뭉치야. ${studentName || '선배'}의 귀엽고 호기심 많은 AI 후배야.
지금 선배가 오늘 배운 ${subject.name} 단원 「${unit.title}」을 너에게 가르쳐 주고 있어.

[너의 성격과 말투]
- 반말, 짧고 귀엽게(1~3문장). 이모지는 가끔 하나 정도.
- 너는 이 단원을 처음 배우는 중이라 잘 몰라. 절대로 정답이나 개념을 먼저 설명하거나 가르치지 마.
- 선배가 설명하면 "아하!" 하고 이해한 척 따라 말해보거나, 헷갈리는 척 질문해.
- 가끔은 '흔한 착각'을 일부러 해서 선배가 고쳐 주게 만들어 (예: "그럼 x절편은 x에 0 넣는 거야?").
- 아직 선배가 꺼내지 않은 개념(not_yet)으로 자연스럽게 이어지게 궁금증을 보여줘. 한 번에 질문은 하나만.
- 선배를 칭찬하되 시험관처럼 평가하는 말투는 금지. 감시받는 느낌이 들지 않게 "배우는 후배" 입장을 지켜.
- 선배가 단원과 무관한 이야기를 하면 귀엽게 다시 단원으로 데려와.
${kind === 'review' ? '- 이번 대화는 복습 시간이야. 지난번에 선배가 아직 안 알려준 개념이나 헷갈려한 부분을 네가 먼저 궁금해하며 물어봐.' : ''}

[단원 개념 목록]
${conceptBlock(unit, statusMap)}

[평가 규칙 — 선배의 "가장 최근 메시지"만 보고 판단]
- explained: 선배가 그 개념의 핵심을 자기 말로 정확하게 설명함 (용어만 말한 건 아님, 예시로 정확히 보여준 것도 인정).
- confused: 그 개념에 대해 설명했지만 틀린 내용이 있거나 핵심이 섞여 헷갈림.
- 언급하지 않은 개념은 evaluations에 넣지 마.

반드시 아래 JSON 형식으로만 답해. 다른 텍스트 금지.
{"reply":"배배의 대답","evaluations":[{"concept_id":"개념id","status":"explained|confused","note":"선배가 설명한 내용 한 줄 요약(긍정적으로)"}]}`;
}

// 긴 대화에서 토큰 비용이 계속 늘지 않도록: 첫 메시지(오늘 배운 내용 정리) + 최근 메시지만 보냄
const MAX_HISTORY = 30;
function capHistory(messages) {
  if (messages.length <= MAX_HISTORY) return messages;
  const [first, ...rest] = messages;
  let tail = rest.slice(-(MAX_HISTORY - 1));
  if (tail[0]?.role === first.role) tail = tail.slice(1); // 같은 역할이 연달아 오지 않게
  return [first, ...tail];
}

function toChatHistory(messages) {
  return capHistory(messages).map((m) => ({
    role: m.role === 'student' ? 'user' : 'assistant',
    content: m.role === 'mentee' ? JSON.stringify({ reply: m.content }) : m.content,
  }));
}

export async function menteeReply({ subject, unit, statusMap, studentName, kind, history, image }) {
  const msgs = [{ role: 'system', content: menteeSystem({ subject, unit, statusMap, studentName, kind }) }, ...toChatHistory(history)];
  if (image && msgs.length > 1) {
    const firstUser = msgs.findIndex((m) => m.role === 'user');
    if (firstUser > 0) {
      msgs[firstUser] = {
        role: 'user',
        content: [
          { type: 'text', text: msgs[firstUser].content + '\n(선배가 노트 사진도 함께 보여줬어. 참고만 하고, 사진 속 내용은 선배가 직접 말로 설명한 것만 평가해.)' },
          { type: 'image_url', image_url: { url: image } },
        ],
      };
    }
  }
  try {
    const out = await chatJson(msgs, { maxTokens: 1200 });
    const validIds = new Set(unit.concepts.map((c) => c.id));
    return {
      reply: String(out.reply || '음… 다시 한 번 말해줄래? 🥺'),
      evaluations: (out.evaluations || []).filter(
        (e) => validIds.has(e.concept_id) && ['explained', 'confused'].includes(e.status)
      ),
    };
  } catch (e) {
    console.error('[menteeReply]', e.message);
    return { reply: '앗, 잠깐 머리가 하얘졌어… 😵 방금 말 한 번만 더 해줄래?', evaluations: [], error: true };
  }
}

export async function menteeOpener({ subject, unit, statusMap, studentName }) {
  const targets = unit.concepts.filter((c) => statusMap[c.id] !== 'explained');
  const recheck = unit.concepts.filter((c) => statusMap[c.id] === 'explained');
  const sys = `${menteeSystem({ subject, unit, statusMap, studentName, kind: 'review' })}

[지금 할 일]
선배가 다시 왔어! 네가 먼저 말을 걸어. 반갑게 인사하고,
${targets.length ? `아직 못 들었거나 헷갈렸던 개념 중 하나(${targets.map((c) => c.title).join(', ')})에 대해 궁금한 걸 하나 물어봐.` : ''}
${recheck.length ? `지난번에 배운 것(${recheck.map((c) => c.title).join(', ')}) 중 하나를 네가 기억나는 척 말하다가 살짝 헷갈리는 척해도 좋아.` : ''}
evaluations는 빈 배열로.`;
  try {
    const out = await chatJson([{ role: 'system', content: sys }, { role: 'user', content: '(선배가 접속했어)' }], { maxTokens: 400 });
    return String(out.reply);
  } catch (e) {
    console.error('[menteeOpener]', e.message);
    const t = targets[0] || unit.concepts[0];
    return `선배 왔다!! 🙌 지난번에 ${unit.title} 알려줘서 고마워. 근데 '${t.title}'은(는) 아직 잘 모르겠어… 알려줄래?`;
  }
}

export async function sessionSummary({ subject, unit, history, statuses, studentName }) {
  const explained = unit.concepts.filter((c) => statuses[c.id] === 'explained').map((c) => c.title);
  const confused = unit.concepts.filter((c) => statuses[c.id] === 'confused').map((c) => c.title);
  const notYet = unit.concepts.filter((c) => !statuses[c.id]).map((c) => c.title);
  const transcript = history.map((m) => `${m.role === 'student' ? '선배' : MENTEE_NAME}: ${m.content}`).join('\n');
  const sys = `너는 학생의 학습을 따뜻하게 정리해주는 코치야. ${studentName || '학생'}이(가) AI 후배에게 ${subject.name} 「${unit.title}」을 가르친 대화를 요약해.
규칙: "해낸 것" 중심으로 쓰고, 부정적인 표현(부족, 못함, 틀림, 실수, 약점, 아쉬움 등)은 절대 쓰지 마. 빠진 개념은 "다음 학습 추천"으로 긍정적으로 표현해. 이모지는 쓰지 마.
설명한 개념: ${explained.join(', ') || '없음'} / 헷갈린 부분: ${confused.join(', ') || '없음'} / 아직 꺼내지 않은 개념: ${notYet.join(', ') || '없음'}
JSON으로만 답해:
{"title":"대화 제목(15자 이내)","headline":"학생에게 건네는 한 줄 칭찬","summary":"대화 내용 2~3문장 요약(부모님·선생님도 볼 수 있음)","did_well":["잘한 점 1","잘한 점 2"],"next_tip":"다음 학습 추천 한 문장"}`;
  try {
    return await chatJson([{ role: 'system', content: sys }, { role: 'user', content: transcript.slice(-12000) }], { maxTokens: 1500, temperature: 0.5 });
  } catch (e) {
    console.error('[summary]', e.message);
    return {
      title: unit.title,
      headline: '오늘도 후배에게 멋지게 가르쳐 줬어요!',
      summary: `${unit.title} 단원을 후배에게 설명했어요.`,
      did_well: explained.length ? explained.map((t) => `${t} 설명하기`) : ['끝까지 후배와 대화하기'],
      next_tip: notYet.length ? `다음엔 '${notYet[0]}'도 알려주면 좋겠어요!` : '다음 단원도 기대돼요!',
    };
  }
}

// ---------- 보호자(부모·선생님)용 인사이트 ----------
const NEGATIVE = [
  [/부족(한|하다|해요|합니다|함|해)?/g, '더 키워갈 수 있는'],
  [/아쉬운 ?점/g, '다음에 집중하면 좋을 점'],
  [/아쉬(움|워요|웠|운)/g, '다음이 기대되는'],
  [/약점/g, '성장 포인트'],
  [/못했/g, '아직 도전 전이었'],
  [/틀렸/g, '다시 살펴보았'],
  [/실수/g, '연습 포인트'],
  [/문제점/g, '살펴볼 점'],
  [/미흡/g, '성장 중'],
  [/걱정/g, '응원'],
];
const NEG_TEST = /부족|아쉬|약점|못했|틀렸|실수|문제점|미흡|걱정|모자라|뒤처|떨어지/;

function positivize(text) {
  let t = text;
  for (const [re, rep] of NEGATIVE) t = t.replace(re, rep);
  return t;
}

const INSIGHT_TASK = {
  today: {
    title: '오늘 학생의 학습 요약',
    task: '오늘(가장 최근) 학습에서 학생이 무엇을 가르쳤고 어떤 개념을 자기 말로 설명해 냈는지 요약해 줘. 다음 학습에서 집중해 보면 좋을 개념도 기대감 있게 소개해.',
  },
  persona: {
    title: '우리 학생은 어떤 학생일까?',
    task: '학생이 후배에게 설명하는 방식(예시를 드는지, 차근차근 설명하는지, 끈기 있게 다시 설명하는지 등)을 바탕으로 학생의 학습 스타일과 강점을 따뜻하게 소개해 줘.',
  },
  help: {
    title: '학생의 학습을 도와주려면?',
    task: '부모님·선생님이 집이나 수업에서 해 볼 수 있는 구체적인 응원 방법 3가지를 알려줘. 다음 학습 때 집중적으로 보면 좋을 개념은 "이 부분을 다음번 학습 때 함께 보면 좋을 것 같아요!"처럼 긍정적으로 표현해.',
  },
};

export async function guardianInsight({ type, studentName, context }) {
  const t = INSIGHT_TASK[type];
  const sys = `너는 부모님·선생님에게 학생 ${studentName}의 학습을 전해 주는 다정한 학습 코치야.
[절대 규칙]
- "부족하다, 못한다, 아쉽다, 약점, 실수, 틀렸다, 걱정" 같은 부정적 단어는 절대 쓰지 마.
- 아직 설명하지 않은 개념은 "다음번 학습 때 집중해서 보면 좋을 것 같아요!", "다음 도전 과제" 처럼 표현해.
- 응원, 격려, 성장, 기대 같은 긍정적인 단어를 사용해. 학생을 평가하거나 비교하지 마.
- 주어진 데이터에 근거해서만 이야기하고, 데이터가 적으면 그만큼 짧게 써.
- 존댓말, 280~450자, 마크다운 없이 줄바꿈과 이모지 1~3개만 사용.

[할 일] ${t.task}`;
  const user = `학생 학습 데이터:\n${context}`;
  let text;
  try {
    text = await chat([{ role: 'system', content: sys }, { role: 'user', content: user }], { maxTokens: 2000, temperature: 0.6 });
    if (NEG_TEST.test(text)) {
      text = await chat(
        [
          { role: 'system', content: sys },
          { role: 'user', content: user },
          { role: 'assistant', content: text },
          { role: 'user', content: '부정적인 단어가 포함되어 있어요. 같은 내용을 응원과 격려의 표현으로만 다시 써 주세요.' },
        ],
        { maxTokens: 2000, temperature: 0.4 }
      );
    }
  } catch (e) {
    console.error('[insight]', e.message);
    text = `${studentName} 학생은 후배에게 직접 설명하며 스스로 배움을 다지고 있어요! 🌱 꾸준히 응원해 주시면 큰 힘이 될 거예요.`;
  }
  return { title: t.title, text: positivize(text.replace(/\*\*/g, '')) };
}
