// 시연용 데이터: npm run seed (몇 번 실행해도 같은 상태로 초기화)
import { pool, one, q, migrate } from './db.js';

await migrate();
await q(`DELETE FROM users WHERE provider='demo'`);

const mk = (pid, name, role, code) =>
  one(`INSERT INTO users (provider, provider_id, email, name, role, invite_code) VALUES ('demo',$1,$2,$3,$4,$5) RETURNING *`, [
    pid,
    `${pid}@demo.mentee`,
    name,
    role,
    code,
  ]);

const haneul = await mk('demo-student', '하늘', 'student', 'HANEUL');
const junho = await mk('demo-student2', '준호', 'student', 'JUNHO2');
const guardian = await mk('demo-guardian', '하늘 부모', 'guardian', null);

await q(`INSERT INTO guardian_links (guardian_id, student_id) VALUES ($1,$2),($1,$3)`, [guardian.id, haneul.id, junho.id]);
// 새 계정은 노트북 없이 시작하지만, 시연 학생에게는 준비된 2-1 수학·영어 노트북을 넣어 둠
await q(`INSERT INTO enabled_notebooks (student_id, subject_id) VALUES ($1,'math'),($1,'english'),($2,'math'),($2,'english')`, [haneul.id, junho.id]);

async function session(student, subject, unitId, daysAgo, msgs, concepts, summary) {
  const s = await one(
    `INSERT INTO sessions (student_id, subject, unit_id, kind, status, shared, title, summary, created_at, ended_at)
     VALUES ($1,$2,$3,'teach','done',true,$4,$5, now() - ($6 || ' days')::interval, now() - ($6 || ' days')::interval + interval '15 minutes') RETURNING *`,
    [student.id, subject, unitId, summary.title, JSON.stringify(summary), String(daysAgo)]
  );
  let i = 0;
  for (const [role, content] of msgs) {
    await q(`INSERT INTO messages (session_id, role, content, created_at) VALUES ($1,$2,$3, now() - ($4 || ' days')::interval + ($5 || ' minutes')::interval)`, [
      s.id,
      role,
      content,
      String(daysAgo),
      String(i++),
    ]);
  }
  for (const [cid, status, note, fixed] of concepts) {
    await q(`INSERT INTO session_concepts (session_id, concept_id, status, note, fixed, updated_at) VALUES ($1,$2,$3,$4,$5, now() - ($6 || ' days')::interval)`, [
      s.id,
      cid,
      status,
      note,
      Boolean(fixed),
      String(daysAgo),
    ]);
  }
  return s;
}

const m1 = await session(
  haneul,
  'math',
  'm2-linear-function',
  1,
  [
    ['student', '오늘은 일차함수를 배웠어. y=ax+b 꼴이고 a가 0이면 안 돼. x값 하나에 y값이 딱 하나 정해지는 게 함수야.'],
    ['mentee', '오오 a가 0이면 왜 안 돼?? 그냥 y=b 아니야? 🤔'],
    ['student', 'a가 0이면 x가 사라져서 x에 대한 일차식이 아니게 되니까 일차함수가 아니야. 그냥 상수함수 같은 거야.'],
    ['mentee', '아하! 그럼 그래프랑 x축이 만나는 데가 y절편이야?'],
    ['student', '아니야 x축이랑 만나는 건 x절편! y=0 넣어서 x를 구해. y절편은 x=0 넣으면 돼서 그냥 b야.'],
    ['mentee', '헐 반대로 알고 있었어 ㅋㅋ 그럼 기울기는 뭐야?'],
    ['student', '기울기는 x 증가량 나누기 y 증가량…? 아 a랑 같은 거야.'],
    ['mentee', 'a랑 같구나! 근데 나누는 순서가 그게 맞아? 헷갈려 😵'],
  ],
  [
    ['func-def', 'explained', 'x값 하나에 y값이 하나씩 정해지는 관계라고 설명했어요'],
    ['linear-def', 'explained', 'a≠0인 이유를 일차식과 연결해 설명했어요'],
    ['intercept', 'explained', 'x절편·y절편을 대입하는 값으로 구분했어요'],
    ['slope', 'confused', '기울기가 a와 같다는 건 알았고, 나누는 순서를 다시 보면 좋아요'],
  ],
  {
    title: '일차함수 첫 수업',
    headline: '함수의 뜻부터 절편까지 또박또박 가르쳐 줬어요!',
    summary: '하늘이는 함수와 일차함수의 뜻, a≠0인 이유를 자기 말로 설명했어요. x절편과 y절편을 어떤 값을 대입해 구하는지도 후배에게 정확히 알려 줬어요.',
    did_well: ['a≠0인 이유를 일차식과 연결해서 설명', 'x절편/y절편 구하는 법을 정확히 구분'],
    next_tip: "다음엔 '기울기'를 증가량으로 다시 한 번 설명해 보면 좋겠어요!",
  }
);

const e1 = await session(
  haneul,
  'english',
  'e2-present-perfect-relative',
  3,
  [
    ['student', '현재완료는 have나 has에 과거분사를 붙이는 거야. I have visited Jeju 처럼. 주어가 3인칭 단수면 has!'],
    ['mentee', '오 그럼 yesterday 붙여서 I have visited Jeju yesterday 해도 돼?'],
    ['student', '안 돼! yesterday처럼 정확한 과거 시간은 그냥 과거형 써야 돼. I visited Jeju yesterday.'],
    ['mentee', '우와 그렇구나 🌟 그럼 for랑 since는 뭐가 달라?'],
    ['student', 'for는 기간이고 since는 언제부터인지 시작 시점이야. for 3 years, since 2020.'],
  ],
  [
    ['pp-form', 'explained', 'have/has + p.p. 와 3인칭 단수 has를 설명했어요'],
    ['pp-vs-past', 'explained', 'yesterday와 현재완료를 함께 쓰지 않는 이유를 알려줬어요'],
    ['for-since', 'explained', 'for는 기간, since는 시작 시점으로 구분했어요'],
  ],
  {
    title: '현재완료 첫 수업',
    headline: '현재완료와 과거 시제의 차이를 척척 설명했어요!',
    summary: '하늘이는 현재완료의 형태(have/has + p.p.)와 과거 시제와의 차이, for와 since의 쓰임을 예문과 함께 설명했어요.',
    did_well: ['예문을 직접 만들어 설명', '후배의 착각을 바로잡아 줌'],
    next_tip: "다음엔 '주격 관계대명사'도 후배에게 소개해 주면 좋겠어요!",
  }
);

await session(
  junho,
  'english',
  'e2-present-perfect-relative',
  2,
  [
    ['student', '관계대명사 who는 사람, which는 사물이야. I have a friend who speaks French.'],
    ['mentee', '그럼 that은 언제 써?'],
    ['student', 'that은 사람이랑 사물 둘 다 돼!'],
  ],
  [
    ['rel-choice', 'explained', 'who/which/that을 선행사에 따라 구분했어요'],
    ['rel-role', 'explained', '두 문장을 이어 주는 역할을 예문으로 보여줬어요'],
  ],
  {
    title: '관계대명사 who/which',
    headline: '관계대명사를 예문으로 쏙쏙 설명했어요!',
    summary: '준호는 who, which, that을 선행사에 따라 고르는 방법을 예문과 함께 설명했어요.',
    did_well: ['예문으로 설명하기', '간결하고 정확한 설명'],
    next_tip: "다음엔 '관계대명사절 동사의 수 일치'를 함께 보면 좋겠어요!",
  }
);

await q(`INSERT INTO stickers (session_id, guardian_id, sticker) VALUES ($1,$2,'heart'),($3,$2,'star')`, [m1.id, guardian.id, e1.id]);

console.log('🌱 seed 완료: 학생 하늘(코드 HANEUL), 준호(JUNHO2) / 부모님·선생님 "하늘 부모"');
await pool.end();
