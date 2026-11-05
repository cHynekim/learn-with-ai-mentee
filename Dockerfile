# ---------- 1단계: React(Vite) 프론트 빌드 ----------
FROM node:24-alpine AS client
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---------- 2단계: Express 서버 (빌드된 프론트를 같이 서빙) ----------
FROM node:24-alpine
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app/server

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server/src ./src
# 서버는 server/src 기준 ../../client/dist 를 서빙하므로 같은 배치를 유지
COPY --from=client /app/client/dist /app/client/dist

# 노트 사진 임시 저장 폴더 (컨테이너를 다시 만들면 비워짐)
RUN mkdir -p uploads && chown -R node:node /app/server/uploads
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "src/index.js"]
