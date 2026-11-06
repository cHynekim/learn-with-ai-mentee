# 🐣 mentee — 배배에게 알려줘!

학생이 AI 후배 "배배"에게 오늘 배운 내용을 가르치며 자기 말로 설명할 수 있는지 확인하는 학습 앱 (MVP).

- **Server**: Express 5 + PostgreSQL (`pg`) · `server/`
- **Client**: React 19 + Vite · `client/`
- **AI**: Baze(Mindlogic) API Gateway, OpenAI 호환 `chat/completions` · 모델 `claude-sonnet-5-5`

## 로컬 실행

```bash
npm run setup        # 의존성 설치 (root, server, client)
npm run db:up        # Docker로 PostgreSQL 16 실행 (localhost:5432)
npm run seed         # 시연용 계정/대화 데이터 (몇 번이든 초기화 가능)
npm run dev          # server :4000 + client :5173
```

→ http://localhost:5173 접속. 로그인 화면 하단 **"시연용 계정으로 바로 입장"** 버튼으로 학생, 부모님/선생님 계정을 바로 확인할 수 있습니다.

| 시연 계정 | 역할 | 비고 |
|---|---|---|
| 하늘 | 학생 | 연결 코드 `HANEUL`, 수학·영어 기록 있음 |
| 하늘 부모 | 부모님/선생님 | 하늘, 준호(`JUNHO2`)와 연결됨 |

## 간편로그인 (구글·네이버·카카오)

`server/.env`에 `*_CLIENT_ID`, `*_CLIENT_SECRET`을 넣으면 실제 OAuth로 동작합니다. 비어 있으면 개발용 모의 로그인 화면으로 대체됩니다.
각 콘솔에 등록할 Redirect URI: `{SERVER_URL}/api/auth/{google|naver|kakao}/callback`
처음 로그인한 사용자는 `/signup`에서 **학생 / 부모님·선생님** 역할을 선택합니다.

## 주요 기능

- **학생 홈**: 인삿말 + 붙여넣기 차단 입력창 (paste/drop/단축키/우클릭/대량 입력 차단, 🎙️ 음성 인식(한/영), 📷 노트 사진 선택 첨부)
- **AI 후배 대화**: 배배가 헷갈려하며 질문하고, 매 턴마다 개념을 `설명함 / 헷갈림`으로 판정 → 정확히 설명하면 축하 이펙트 (헷갈렸다 고치면 COMEBACK 이펙트)
- **결과 화면**: 해낸 것 중심, 빠진 개념은 "다음 학습 추천", 학생이 확인 후 **공유**
- **다음 접속**: 배배가 빈 개념이나 헷갈린 개념을 먼저 질문 (복습 세션)
- **노트북**: 좌측 상단 책장 아이콘 → 위에서 내려오는 가로 스크롤 노트북 → 설명한 개념 / 헷갈리는 부분 / 아직 꺼내지 않은 개념
- **부모·교사**: 연결된 학생 목록 → 공유된 노트북·대화 요약 → 응원 스티커만 반응 가능 → 하단 퀵메뉴 AI 분석 3종 (부정어 금지 프롬프트 + 검출 시 재생성 + 치환 안전장치)

## 학습 콘텐츠

학생은 **어떤 학교급·학년·학기·과목이든 노트북으로 만들 수 있습니다.** 새 계정은 노트북 없이 시작하고, 서재(📚)의 **+ 새 노트북** 또는 홈의 **첫 노트북 만들기**에서 추가합니다.

### 새 노트북 만들기 (`server/src/catalog.js`)

1. **학교급**(초등/중등/고등), **학년**, **학기**, **과목**을 고르면
2. AI가 2022 개정 교육과정 기준으로 해당 학기의 **단원 → 소단원(개념)** 구성을 순서대로 만들어 노트북을 생성합니다 (약 10초).
3. 생성 직후 소단원마다 **핵심 내용 · 예시 · 흔한 착각**을 백그라운드에서 채웁니다. 배배의 질문, 개념 판정, 대화 중 첨부되는 **개념 노트**가 이 내용을 바탕으로 동작합니다.

- 해당 학년·학기에 없는 과목(예: 초2 미적분)은 이유와 함께 거절되고, 같은 노트북은 중복으로 만들 수 없습니다.
- AI가 만든 단원 구성은 출판사별 교과서와 다를 수 있습니다. 특정 교과서 순서가 필요하면 아래처럼 준비된 교육과정으로 추가하세요.

### 미리 준비된 교육과정 (`server/src/content.js`)

아래 조합으로 노트북을 만들면 AI 생성 대신 **미리 검수한 단원 구성**이 바로(대기 없이) 들어갑니다. 시연 계정(`npm run seed`)에도 기본으로 들어 있습니다.

| 노트북 | 단원 |
|---|---|
| **중등 2학년 1학기 수학** | 1. 유리수와 순환소수 · 2. 식의 계산 · 3. 일차부등식 · 4. 연립일차방정식 · **5. 일차함수와 그 그래프**(시연 단원) · 6. 일차함수와 일차방정식의 관계 |
| **중등 2학년 1학기 영어** | 1. 접속사로 문장 잇기 · **2. Have You Ever...?**(현재완료·주격 관계대명사, 시연 단원) · 3. to부정사와 동명사 · 4. 수동태와 가주어 it |

다른 과목·학년도 같은 형식(단원 → 소단원마다 `key`·`example`·`misconception`)으로 `content.js`의 `SUBJECTS`에 추가하면 준비된 교육과정으로 쓰입니다.

## AWS 배포 (Docker + EC2 + RDS PostgreSQL)

프론트(React 빌드)와 API가 Express 하나에서 같은 주소로 나옵니다. 로컬과 배포의 차이는 환경변수뿐입니다.

1. **이미지 빌드·업로드** (Mac에서)
   ```bash
   docker build --platform linux/amd64 -t <dockerhub-id>/baebae:latest .
   docker push <dockerhub-id>/baebae:latest
   ```
2. **EC2에 `.env` 작성** (`server/.env.example` 참고). 배포에서 꼭 바꿀 값:
   - `NODE_ENV=production`, `PORT=3000`
   - `DATABASE_URL=postgres://USER:PASS@xxx.rds.amazonaws.com:5432/mentee`, `DB_SSL=true`
   - `JWT_SECRET=$(openssl rand -hex 32)` (없거나 32자 미만이면 서버가 시작하지 않음)
   - `COOKIE_SECURE=false` (HTTPS를 붙이면 `true`)
   - `DEMO_MODE=true` (시연용 계정 버튼), `AI_API_KEY`
3. **시연 데이터 넣기** (최초 1회, 다시 실행하면 시연 계정이 초기화됨)
   ```bash
   docker run --rm --env-file .env <dockerhub-id>/baebae:latest npm run seed
   ```
4. **실행**: 스키마는 서버 시작 시 자동으로 만들어집니다.
   ```bash
   docker run -d --name baebae --restart unless-stopped -p 80:3000 --env-file .env <dockerhub-id>/baebae:latest
   ```
5. **참고**
   - EC2 보안 그룹은 80 인바운드를, RDS 보안 그룹은 EC2에서 오는 5432를 허용해야 합니다.
   - 노트 사진은 컨테이너 안 `uploads/`에 임시 저장되며 컨테이너를 다시 만들면 사라집니다(AI 전달용이라 시연에는 지장 없음).
   - LLM API는 IP당 1분 30회 / 1시간 300회, 서버 전체 하루 3000회로 제한됩니다(`LLM_*` 환경변수로 조정).

### HTTPS (Caddy + 무료 도메인 sslip.io)

`3-39-237-24.sslip.io` 는 별도 등록 없이 `3.39.237.24` 로 연결되는 무료 도메인입니다. Caddy가 앞단에서 HTTPS 인증서를 자동 발급·갱신하고, 앱 컨테이너는 외부에 직접 노출하지 않습니다(설정: `deploy/Caddyfile`).

```bash
sudo docker network create baebae-net
sudo docker run -d --name baebae --restart unless-stopped --network baebae-net --env-file .env hellocxh/baebae:latest
sudo docker run -d --name caddy --restart unless-stopped --network baebae-net -p 80:80 -p 443:443 \
  -v ~/baebae/Caddyfile:/etc/caddy/Caddyfile:ro -v caddy_data:/data -v caddy_config:/config caddy:2
```

`.env` 에는 `SERVER_URL=https://3-39-237-24.sslip.io`, `COOKIE_SECURE=true`, `TRUST_PROXY=1` 을 설정합니다. EC2 보안 그룹은 80·443 인바운드를 허용해야 합니다.
