import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

// 개발 중 /api 요청은 로컬 서버로 넘김. 포트는 server/.env 의 PORT를 따르고, 없으면 3000
function serverPort() {
  try {
    const env = readFileSync(new URL('../server/.env', import.meta.url), 'utf8');
    return /^PORT=(\d+)/m.exec(env)?.[1] || '3000';
  } catch {
    return '3000';
  }
}

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': `http://localhost:${serverPort()}` } },
});
