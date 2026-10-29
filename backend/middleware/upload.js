const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs/promises');
const AppError = require('../utils/AppError');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const MAX_BYTES = 3 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
});

// Nooca sawirka waxaa lagu go'aamiyaa bytes-ka hore ee faylka (magic bytes),
// lagumana kalsoona magaca faylka ama Content-Type-ka uu soo diray browser-ku.
function sniffImage(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

async function saveImage(file) {
  if (!file) throw new AppError(400, 'Sawir lama soo dirin');
  const ext = sniffImage(file.buffer);
  if (!ext) throw new AppError(400, 'Kaliya sawirrada JPG, PNG ama WEBP ayaa la oggol yahay');
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, filename), file.buffer, { flag: 'wx' });
  return `/uploads/${filename}`;
}

module.exports = { upload, saveImage, sniffImage, UPLOAD_DIR };
