CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  email TEXT,
  name TEXT,
  role TEXT,
  invite_code TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_id)
);

-- 부모님/선생님 역할 통합 (guardian)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
UPDATE users SET role='guardian' WHERE role IN ('parent','teacher');
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('student','guardian'));

CREATE TABLE IF NOT EXISTS guardian_links (
  guardian_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (guardian_id, student_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'teach',
  status TEXT NOT NULL DEFAULT 'active',
  shared BOOLEAN NOT NULL DEFAULT false,
  title TEXT,
  summary JSONB,
  photo_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS sessions_student_idx ON sessions(student_id, subject);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student','mentee')),
  content TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_session_idx ON messages(session_id, id);

CREATE TABLE IF NOT EXISTS session_concepts (
  session_id INT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('explained','confused')),
  note TEXT,
  fixed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, concept_id)
);

CREATE TABLE IF NOT EXISTS stickers (
  id SERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  guardian_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sticker TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 학생이 직접 만든 노트북 (단원 구성은 AI가 생성)
CREATE TABLE IF NOT EXISTS notebooks (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('elementary','middle','high')),
  grade INT NOT NULL,
  semester INT NOT NULL CHECK (semester IN (1,2)),
  subject TEXT NOT NULL,
  color TEXT NOT NULL,
  units JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, level, grade, semester, subject)
);

-- 학생이 추가한 기본 제공 노트북(수학·영어 등 미리 준비된 교육과정). 새 계정은 노트북 없이 시작
CREATE TABLE IF NOT EXISTS enabled_notebooks (
  student_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  PRIMARY KEY (student_id, subject_id)
);
-- 이전 방식(기본 노트북이 처음부터 보이고 삭제하면 숨김)에서 넘어올 때: 대화 기록이 있는 기본 노트북은 유지
INSERT INTO enabled_notebooks (student_id, subject_id)
  SELECT DISTINCT student_id, subject FROM sessions WHERE subject IN ('math', 'english')
  ON CONFLICT DO NOTHING;
DROP TABLE IF EXISTS hidden_notebooks;

-- 대화 중 헷갈린 개념: 개념 노트를 건네고(needs_retry), 대화 끝에 한 번 더 물어봄(retry_asked).
-- 다시 물었을 때 잘 설명해도(retry_ok) 노트북에는 '헷갈리는 부분'으로 남김
ALTER TABLE session_concepts ADD COLUMN IF NOT EXISTS needs_retry BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE session_concepts ADD COLUMN IF NOT EXISTS retry_asked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE session_concepts ADD COLUMN IF NOT EXISTS retry_ok BOOLEAN NOT NULL DEFAULT false;

-- 간편로그인에서 받아온 프로필 사진
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
