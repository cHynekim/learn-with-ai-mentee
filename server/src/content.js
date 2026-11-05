// 학습 콘텐츠: 2022 개정 교육과정 기준 중학교 2학년 1학기
// 단원 구성은 여러 교과서에서 공통으로 다루는 흐름으로 정리 (특정 출판사 교과서 아님)
const c = (id, title, key, example, misconception) => ({ id, title, key, example, misconception });

export const SUBJECTS = {
  math: {
    id: 'math',
    level: 'middle',
    name: '수학',
    grade: 2,
    semester: 1,
    color: '#23A576',
    featuredUnit: 'm2-linear-function',
    units: [
      {
        id: 'm2-rational',
        title: '유리수와 순환소수',
        concepts: [
          c('rat-def', '유리수의 뜻', '분수 a/b (a, b는 정수, b≠0) 꼴로 나타낼 수 있는 수. 정수도 유리수다.', '3 = 3/1, -0.5 = -1/2', '정수는 유리수가 아니라고 생각한다.'),
          c('rat-decimal', '유한소수와 무한소수', '소수점 아래 0이 아닌 숫자가 유한 개면 유한소수, 무한히 계속되면 무한소수.', '0.25(유한), 0.333…(무한)', '무한소수는 모두 순환소수라고 생각한다.'),
          c('rat-finite', '유한소수로 나타낼 수 있는 분수', '기약분수로 나타냈을 때 분모의 소인수가 2나 5뿐이면 유한소수로 나타낼 수 있다.', '3/20 = 3/(2²×5) → 유한소수', '기약분수로 만들지 않고 분모만 보고 판단한다.'),
          c('rat-repeat', '순환소수와 순환마디', '소수점 아래 어떤 자리부터 같은 숫자의 배열이 한없이 되풀이되는 무한소수가 순환소수, 되풀이되는 부분이 순환마디.', '0.272727… → 순환마디 27', '순환마디를 처음 나오는 숫자부터 잡거나 점을 잘못 찍는다.'),
          c('rat-tofrac', '순환소수를 분수로 나타내기', 'x로 놓고 10의 거듭제곱을 곱해 소수점 아래를 같게 만든 뒤 빼서 분수로 나타낸다. 순환소수는 모두 유리수다.', 'x=0.555…, 10x=5.555… → 9x=5 → x=5/9', '빼는 두 식의 소수점 아래 부분이 같도록 맞추지 않는다.'),
        ],
      },
      {
        id: 'm2-expression',
        title: '식의 계산',
        concepts: [
          c('exp-law', '지수법칙', 'aᵐ×aⁿ=aᵐ⁺ⁿ, (aᵐ)ⁿ=aᵐⁿ, (ab)ⁿ=aⁿbⁿ, aᵐ÷aⁿ=aᵐ⁻ⁿ(m>n).', 'a²×a³=a⁵, (a²)³=a⁶', 'aᵐ×aⁿ을 aᵐⁿ으로, (aᵐ)ⁿ을 aᵐ⁺ⁿ으로 헷갈린다.'),
          c('exp-mono', '단항식의 곱셈과 나눗셈', '계수끼리, 문자끼리 계산한다. 나눗셈은 역수를 곱하거나 분수 꼴로 바꾼다.', '6a³b ÷ 2ab = 3a²', '나눗셈에서 계수만 나누고 문자의 지수를 빼지 않는다.'),
          c('exp-poly-add', '다항식의 덧셈과 뺄셈', '동류항끼리 모아 계산한다. 괄호 앞이 -면 괄호 안 모든 항의 부호를 바꾼다.', '(2x+3y)-(x-y) = x+4y', '괄호 앞 - 를 첫 항에만 적용한다.'),
          c('exp-distribute', '단항식과 다항식의 곱셈·나눗셈', '분배법칙으로 단항식을 다항식의 각 항에 곱하거나 각 항을 나눈다.', '2a(3a-b) = 6a²-2ab', '분배법칙을 첫 항에만 적용한다.'),
        ],
      },
      {
        id: 'm2-inequality',
        title: '일차부등식',
        concepts: [
          c('ineq-def', '부등식과 그 해', '부등호(<, >, ≤, ≥)를 사용해 수나 식의 대소 관계를 나타낸 식. 부등식을 참이 되게 하는 값이 해.', 'x+2>5 의 해: x>3', '≤ 와 < 의 차이(같을 때 포함 여부)를 구분하지 않는다.'),
          c('ineq-prop', '부등식의 성질', '양변에 같은 수를 더하거나 빼거나 양수를 곱하고 나눠도 부등호 방향은 그대로. 음수를 곱하거나 나누면 부등호 방향이 바뀐다.', '-2x<6 → x>-3', '음수로 나눌 때 부등호 방향을 바꾸지 않는다.'),
          c('ineq-solve', '일차부등식의 풀이', '이항해서 ax>b 꼴로 정리한 뒤 부등식의 성질로 x의 범위를 구하고 수직선에 나타낸다.', '3x-1≤5 → x≤2', '수직선에서 포함(●)과 미포함(○)을 반대로 표시한다.'),
          c('ineq-apply', '일차부등식의 활용', '구하는 것을 x로 놓고 조건에 맞는 부등식을 세워 푼 뒤, 답이 문제 상황에 맞는지 확인한다.', '한 개 500원 사탕을 3000원 이하로 → 500x≤3000', '개수처럼 자연수여야 하는 조건을 확인하지 않는다.'),
        ],
      },
      {
        id: 'm2-system',
        title: '연립일차방정식',
        concepts: [
          c('sys-twovar', '미지수가 2개인 일차방정식', 'ax+by+c=0 (a≠0, b≠0) 꼴. 해는 방정식을 참으로 만드는 (x, y) 순서쌍이다.', 'x+y=5 의 자연수 해: (1,4), (2,3)…', '해가 하나뿐이라고 생각한다.'),
          c('sys-def', '연립방정식과 그 해', '두 방정식을 한 쌍으로 묶은 것. 두 방정식을 동시에 만족하는 (x, y)가 해.', 'x+y=5, x-y=1 → (3,2)', '한 방정식만 만족해도 해라고 생각한다.'),
          c('sys-elim', '가감법', '한 미지수의 계수의 절댓값을 같게 만든 뒤 두 식을 더하거나 빼서 그 미지수를 없앤다.', '(x+y=5)+(x-y=1) → 2x=6', '계수를 맞출 때 한 변에만 곱한다.'),
          c('sys-subst', '대입법', '한 방정식을 x= 또는 y= 꼴로 정리해 다른 방정식에 대입한다.', 'y=2x, x+y=6 → 3x=6', '대입할 때 괄호를 치지 않아 부호를 틀린다.'),
          c('sys-apply', '연립방정식의 활용', '구하려는 두 값을 x, y로 놓고 조건에 맞는 방정식 두 개를 세운다.', '닭과 토끼 머릿수·다리 수 문제', '조건 하나로만 식을 세운다.'),
        ],
      },
      {
        id: 'm2-linear-function',
        title: '일차함수와 그 그래프',
        concepts: [
          c('func-def', '함수의 뜻', 'x의 값이 하나 정해지면 그에 따라 y의 값이 오직 하나로 정해지는 관계를 "y는 x의 함수"라고 한다. y=f(x)로 나타낸다.', '한 개에 500원인 사탕 x개의 값 y원 → y=500x 는 함수', '서로 다른 x에 같은 y가 대응되면 함수가 아니라고 착각한다 (실제로는 함수 맞음). x 하나에 y가 여러 개면 함수가 아니다.'),
          c('linear-def', '일차함수의 뜻', 'y=ax+b (a, b는 상수, a≠0)처럼 y가 x에 대한 일차식으로 나타내어지는 함수.', 'y=2x+1, y=-x 는 일차함수 / y=3, y=x²+1 은 일차함수가 아님', 'a=0이어도 일차함수라고 생각하거나, b가 0이면 일차함수가 아니라고 생각한다.'),
          c('translate', '평행이동', '일차함수 y=ax+b의 그래프는 y=ax의 그래프를 y축의 방향으로 b만큼 평행이동한 직선이다.', 'y=2x+3 은 y=2x 를 위로 3만큼 옮긴 것', 'x축 방향으로 b만큼 이동한다고 헷갈리거나, b가 음수일 때 위로 이동한다고 생각한다.'),
          c('intercept', 'x절편과 y절편', 'x절편: 그래프가 x축과 만나는 점의 x좌표(y=0일 때 x의 값). y절편: 그래프가 y축과 만나는 점의 y좌표(x=0일 때 y의 값). y=ax+b의 y절편은 b, x절편은 -b/a.', 'y=2x-4 → x절편 2, y절편 -4', 'x절편을 구할 때 x=0을 대입하는 등 x절편과 y절편을 거꾸로 구한다.'),
          c('slope', '기울기', '(y의 값의 증가량)/(x의 값의 증가량)은 항상 일정하고 a와 같다. 이것을 기울기라 한다.', 'y=3x+1 에서 x가 2만큼 증가하면 y는 6만큼 증가 → 기울기 3', '기울기를 (x의 증가량)/(y의 증가량)으로 거꾸로 계산한다.'),
          c('graph-shape', '기울기·y절편과 그래프 모양', 'a>0이면 오른쪽 위로 향하는 직선(x 증가 → y 증가), a<0이면 오른쪽 아래로 향하는 직선. |a|가 클수록 y축에 가깝다(가파르다). b는 그래프가 y축과 만나는 위치.', 'y=-2x+1 은 오른쪽 아래로 내려가고 (0,1)을 지난다', 'a가 음수면 더 가파르다고 생각하거나, 기울기의 크기를 부호까지 포함해 비교한다.'),
          c('parallel', '평행과 일치', '두 일차함수의 기울기가 같고 y절편이 다르면 두 그래프는 평행하다. 기울기와 y절편이 모두 같으면 일치한다.', 'y=2x+1 과 y=2x-3 은 평행', 'y절편이 같으면 평행이라고 생각한다.'),
          c('find-equation', '일차함수의 식 구하기', '① 기울기 a와 y절편 b가 주어지면 y=ax+b. ② 기울기 a와 한 점이 주어지면 y=ax+b에 점을 대입해 b를 구한다. ③ 두 점이 주어지면 먼저 기울기를 구한 뒤 ②처럼 한다.', '두 점 (1,3), (3,7) → 기울기 (7-3)/(3-1)=2, 3=2·1+b → b=1, y=2x+1', '두 점으로 기울기를 구할 때 빼는 순서를 x와 y에서 다르게 한다.'),
        ],
      },
      {
        id: 'm2-linear-equation',
        title: '일차함수와 일차방정식의 관계',
        concepts: [
          c('le-graph', '일차방정식의 그래프', '미지수가 2개인 일차방정식 ax+by+c=0 (b≠0)의 그래프는 일차함수 y=-a/b x - c/b 의 그래프와 같은 직선이다.', '2x+y-3=0 → y=-2x+3', 'y에 대해 정리할 때 부호를 바꾸지 않는다.'),
          c('le-axis', 'x=p, y=q의 그래프', 'x=p는 점 (p, 0)을 지나고 y축에 평행한 직선, y=q는 점 (0, q)를 지나고 x축에 평행한 직선.', 'x=2 는 세로선, y=-1 은 가로선', 'x=p를 x축에 평행한 직선으로 헷갈린다.'),
          c('le-intersect', '연립방정식의 해와 그래프의 교점', '연립방정식의 해는 두 일차방정식 그래프의 교점의 좌표와 같다. 평행하면 해가 없고, 일치하면 해가 무수히 많다.', 'x+y=5, x-y=1 의 그래프 교점 (3,2)', '평행한 두 직선도 해가 있다고 생각한다.'),
          c('le-apply', '일차함수의 활용', '변하는 두 양 사이의 관계를 y=ax+b로 나타내고 조건에 맞는 값을 구한다.', '처음 20cm 양초가 1분에 0.5cm씩 탐 → y=20-0.5x', '처음 값(y절편)과 변화율(기울기)을 바꿔 쓴다.'),
        ],
      },
    ],
  },
  english: {
    id: 'english',
    level: 'middle',
    name: '영어',
    grade: 2,
    semester: 1,
    color: '#3B86C9',
    featuredUnit: 'e2-present-perfect-relative',
    units: [
      {
        id: 'e2-conjunction',
        title: '접속사로 문장 잇기',
        concepts: [
          c('conj-time', '시간 접속사 when / before / after', '두 문장을 시간 관계로 연결한다. when(~할 때), before(~하기 전에), after(~한 후에).', 'When I got home, it was dark.', '접속사를 전치사처럼 써서 뒤에 명사만 둔다.'),
          c('conj-if', '조건 접속사 if', '"만약 ~라면". 조건을 나타내는 if절에서는 미래의 일도 현재시제로 쓴다.', 'If it rains tomorrow, I will stay home.', 'if절에 will을 쓴다 (If it will rain ✗).'),
          c('conj-because', '이유 접속사 because', 'because 뒤에는 주어+동사(절), because of 뒤에는 명사(구)가 온다.', 'because it was cold / because of the cold', 'because 뒤에 명사만 쓴다.'),
          c('conj-that', '명사절 접속사 that', 'think, know, believe 등의 목적어로 "~라는 것"을 이끈다. 목적어절의 that은 생략할 수 있다.', 'I think (that) he is kind.', 'that을 생략하면 틀린 문장이라고 생각한다.'),
        ],
      },
      {
        id: 'e2-present-perfect-relative',
        title: 'Have You Ever...?',
        concepts: [
          c('pp-form', '현재완료의 형태', 'have/has + 과거분사(p.p.). 주어가 3인칭 단수이면 has를 쓴다. 과거에 일어난 일이 현재까지 영향을 줄 때 쓴다.', 'I have visited Jeju. / She has lived here for 3 years.', 'have 뒤에 과거형을 쓴다 (I have went ✗ → I have gone ✓). 3인칭 단수에도 have를 쓴다.'),
          c('pp-usage', '현재완료의 네 가지 쓰임', '경험(~해 본 적 있다: ever, never, before, once), 계속(~해 왔다: for, since, how long), 완료(막 ~했다: just, already, yet), 결과(~해 버렸다: 그 결과 지금 ~하다, lost/gone).', 'I have never seen snow.(경험) / I have just finished it.(완료) / He has lost his bag.(결과: 지금 가방이 없다)', '모든 현재완료를 "~했다"로 해석해서 과거 시제와 구분하지 못한다.'),
          c('pp-vs-past', '과거 시제 vs 현재완료', 'yesterday, last week, ~ago, in 2020, when처럼 명확한 과거 시점을 나타내는 말은 현재완료와 함께 쓸 수 없다. 과거 시제는 과거 사실만, 현재완료는 현재와의 연결을 나타낸다.', 'I saw him yesterday. ✓ / I have seen him yesterday. ✗', '"어제 ~했다"를 현재완료로 쓴다.'),
          c('for-since', 'for와 since', 'for + 기간(for two years), since + 시작 시점(since 2023, since I was ten). 둘 다 "계속" 용법에서 자주 쓰인다.', 'I have studied English for 5 years. / since 2021', 'since 뒤에 기간을, for 뒤에 시점을 쓴다.'),
          c('pp-neg-q', '현재완료 부정문·의문문', "부정문: have/has + not(never) + p.p. (haven't/hasn't). 의문문: Have/Has + 주어 + p.p. ~? 대답: Yes, I have. / No, I haven't.", 'Have you ever been to Busan? – Yes, I have.', 'Did you ever have been...처럼 do 조동사를 쓰거나, 대답을 Yes, I did로 한다.'),
          c('rel-role', '주격 관계대명사의 역할', '두 문장을 하나로 이어 주며, 앞의 명사(선행사)를 뒤에서 꾸미는 절을 이끈다. 관계대명사가 그 절 안에서 주어 역할을 한다. 바로 뒤에 동사가 온다.', 'I have a friend. + He speaks French. → I have a friend who speaks French.', '관계대명사 뒤에 주어를 또 쓴다 (a friend who he speaks ✗).'),
          c('rel-choice', 'who / which / that 고르기', '선행사가 사람이면 who, 사물·동물이면 which, that은 사람·사물 모두 가능.', 'the boy who is singing / the dog which has long ears / the book that is on the desk', '사람에게 which를 쓰거나, that은 사람에게 못 쓴다고 생각한다.'),
          c('rel-agree', '관계대명사절 동사의 수 일치', '주격 관계대명사 뒤 동사의 수는 선행사에 맞춘다.', 'I know a girl who lives in Seoul. / I like the songs which are popular.', '관계대명사 앞 가까운 단어나 문장 주어 I에 맞춰 동사를 쓴다.'),
        ],
      },
      {
        id: 'e2-infinitive-gerund',
        title: 'to부정사와 동명사',
        concepts: [
          c('inf-noun', 'to부정사의 명사적 용법', 'to+동사원형이 "~하는 것"으로 주어, 목적어, 보어 역할을 한다.', 'I want to travel. / My dream is to be a chef.', 'to 뒤에 동사의 과거형이나 -ing를 쓴다.'),
          c('inf-adj', 'to부정사의 형용사적 용법', '명사 뒤에서 "~할, ~하는"의 뜻으로 명사를 꾸민다.', 'I have a lot of homework to do. / something to drink', 'to부정사를 명사 앞에 둔다.'),
          c('inf-adv', 'to부정사의 부사적 용법', '"~하기 위해(목적)", "~해서(감정의 원인)" 등의 뜻으로 동사나 형용사를 꾸민다.', 'I went to the library to study. / I am happy to see you.', '목적의 의미를 for + 동사원형으로 쓴다.'),
          c('gerund', '동명사의 쓰임', '동사원형+ing가 "~하는 것"으로 주어, 목적어, 전치사의 목적어 역할을 한다.', 'Swimming is fun. / He is good at drawing.', '전치사 뒤에 to부정사를 쓴다 (good at to draw ✗).'),
          c('verb-object', '목적어로 쓰는 동사 구분', 'enjoy, finish, mind, give up 은 동명사를, want, hope, plan, decide 는 to부정사를 목적어로 쓴다. like, start, begin 은 둘 다 가능.', 'I enjoy reading. / I hope to meet you.', 'enjoy to read 처럼 동사에 맞지 않는 형태를 쓴다.'),
        ],
      },
      {
        id: 'e2-passive',
        title: '수동태와 가주어 it',
        concepts: [
          c('pass-form', '수동태의 형태', '주어가 동작을 받을 때 be동사 + 과거분사(p.p.)로 나타낸다. "~되다, ~받다".', 'The window was broken by Tom.', 'be동사를 빼거나 p.p. 대신 과거형을 쓴다.'),
          c('pass-by', 'by + 행위자', '능동태의 주어는 수동태에서 by + 목적격으로 나타낸다. 행위자가 중요하지 않거나 일반 사람이면 생략한다.', 'This song was written by her. / English is spoken in Canada.', 'by 뒤에 주격(she)을 쓴다.'),
          c('pass-tense', '수동태의 시제', '시제는 be동사로 나타낸다. 현재 am/is/are + p.p., 과거 was/were + p.p., 미래 will be + p.p.', 'The bridge will be built next year.', '미래 수동태를 will + p.p.로 쓴다.'),
          c('it-to', '가주어 it ~ to부정사', 'to부정사 주어가 길면 주어 자리에 it을 두고 진짜 주어(to부정사)를 뒤로 보낸다. 이 it은 해석하지 않는다.', 'It is important to exercise every day.', '가주어 it을 "그것은"으로 해석한다.'),
        ],
      },
    ],
  },
};

export const STICKERS = {
  star: { emoji: '⭐', label: '최고야' },
  fire: { emoji: '🔥', label: '열정 가득' },
  clap: { emoji: '👏', label: '멋져' },
  heart: { emoji: '💖', label: '응원해' },
  rocket: { emoji: '🚀', label: '쑥쑥 성장' },
  crown: { emoji: '👑', label: '개념 챔피언' },
};
