// 노트 첨부 업로드: jpg/png, 모바일 사진(iOS HEIC·HEIF, Android WebP), pdf만 허용
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { mkdirSync, openSync, readSync, closeSync, unlinkSync, renameSync } from 'node:fs';

export const UPLOAD_DIR = path.resolve('uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp', '.pdf']);
const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence', 'image/webp', 'application/pdf']);
// 일부 안드로이드 브라우저는 HEIC 등을 type 없이 보냄 → 확장자가 맞으면 받고, 아래에서 실제 내용으로 확인
const GENERIC_MIME = new Set(['', 'application/octet-stream']);

export const UNSUPPORTED = '지원하지 않는 확장자예요. jpg, png, heic, webp, pdf 파일만 올릴 수 있어요';
const MAX_MB = 5;

/** 파일 앞부분(시그니처)으로 실제 형식 판별 — 확장자만 바꾼 파일을 걸러냄 */
function sniff(filePath) {
  const fd = openSync(filePath, 'r');
  const b = Buffer.alloc(16);
  readSync(fd, b, 0, 16, 0);
  closeSync(fd);
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { type: 'jpeg', mime: 'image/jpeg', ext: '.jpg' };
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { type: 'png', mime: 'image/png', ext: '.png' };
  if (b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return { type: 'webp', mime: 'image/webp', ext: '.webp' };
  if (b.subarray(0, 5).toString('latin1') === '%PDF-') return { type: 'pdf', mime: 'application/pdf', ext: '.pdf' };
  if (b.subarray(4, 8).toString('latin1') === 'ftyp' && /^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(b.subarray(8, 12).toString('latin1')))
    return { type: 'heic', mime: 'image/heic', ext: '.heic' };
  return null;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    // 원래 파일 이름은 쓰지 않음 (확장자는 검증 후 실제 형식에 맞춰 다시 정함)
    filename: (_req, _file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.upload`),
  }),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();
    if (!ALLOWED_EXT.has(ext) || !(ALLOWED_MIME.has(mime) || GENERIC_MIME.has(mime))) return cb(Object.assign(new Error(UNSUPPORTED), { code: 'UNSUPPORTED_TYPE' }));
    cb(null, true);
  },
});

/**
 * 노트 파일 1개(field: photo)를 받는 미들웨어. 허용되지 않는 형식·크기는 400으로 거절.
 * 통과하면 req.file.kind 에 실제 형식(jpeg|png|webp|heic|pdf)이 들어감
 */
export function notePhoto(req, res, next) {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: `파일은 ${MAX_MB}MB까지 올릴 수 있어요` });
      if (err.code === 'UNSUPPORTED_TYPE' || err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ error: UNSUPPORTED });
      return next(err);
    }
    if (!req.file) return next();
    const kind = sniff(req.file.path);
    if (!kind) {
      try { unlinkSync(req.file.path); } catch { /* 이미 지워졌으면 무시 */ }
      return res.status(400).json({ error: UNSUPPORTED });
    }
    // 실제 형식에 맞는 확장자로 저장 파일 이름을 바꿈
    const filename = req.file.filename.replace(/\.upload$/, kind.ext);
    const dest = path.join(UPLOAD_DIR, filename);
    renameSync(req.file.path, dest);
    Object.assign(req.file, { filename, path: dest, kind: kind.type, detectedMime: kind.mime });
    next();
  });
}

/** AI에게 이미지로 보여줄 수 있는 형식 (HEIC·PDF는 첨부만 하고 AI에는 보내지 않음) */
export const AI_VIEWABLE = new Set(['jpeg', 'png', 'webp']);
