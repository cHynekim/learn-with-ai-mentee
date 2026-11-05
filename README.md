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

## 학습 콘텐츠 (`server/src/content.js`)

- **수학 (중2)**: 일차함수와 그 그래프: 함수의 뜻, 일차함수의 뜻, 평행이동, x·y절편, 기울기, 그래프 모양, 평행과 일치, 식 구하기
- **영어 (중2)**: Have You Ever...?: 현재완료(형태, 4용법, 과거시제와 비교, for/since, 부정·의문), 주격 관계대명사(역할, who/which/that, 수 일치)

## AWS 배포 (RDS PostgreSQL)

1. `npm run build`: `client/dist`가 생성되면 Express가 같은 포트에서 정적 파일과 SPA를 서빙합니다.
2. RDS PostgreSQL을 생성하고 환경변수를 설정합니다: `DATABASE_URL=postgres://USER:PASS@xxx.rds.amazonaws.com:5432/mentee`, `PGSSL=true`
3. `NODE_ENV=production`, `JWT_SECRET`(긴 랜덤 값), `CLIENT_URL`과 `SERVER_URL`(같은 도메인), `DEMO_MODE=false`, `AI_API_KEY` 설정
4. `npm start`로 실행 (Elastic Beanstalk / ECS / EC2). 스키마는 서버 시작 시 자동으로 생성됩니다.
5. 노트 사진은 현재 로컬 `server/uploads`에 저장됩니다. 운영에서는 S3로 옮기는 것을 권장합니다.
