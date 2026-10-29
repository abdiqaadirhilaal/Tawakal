require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';

const JWT_SECRET = process.env.JWT_SECRET || '';
const PLACEHOLDER = 'replace_with_a_long_random_secret';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET lama helin. Ku dar faylka backend/.env (eeg .env.example).');
}
if (isProd && (JWT_SECRET === PLACEHOLDER || JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET waa in uu noqdaa sir random ah oo ugu yaraan 32 xaraf ah marka production la joogo.');
}
if (!isProd && !isTest && JWT_SECRET === PLACEHOLDER) {
  console.warn('[digniin] JWT_SECRET weli waa qiimaha tusaalaha ah. Beddel ka hor inta aadan internet-ka gelin.');
}

module.exports = {
  NODE_ENV,
  isProd,
  isTest,
  PORT: Number(process.env.PORT) || 5000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/tawakal_db',
  JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  CLIENT_URLS: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  REPORT_TIMEZONE: process.env.REPORT_TIMEZONE || 'Africa/Mogadishu',
  COOKIE_NAME: 'tawakal_token',
};
