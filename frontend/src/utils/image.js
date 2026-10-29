// Production-ka sawirradu waxay la soo baxaan isla origin-ka ("/uploads/...").
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

// Sawirrada la soo dejiyey waxay ku kaydsan yihiin backend-ka (/uploads/...).
export function imageUrl(src) {
  if (!src) return '';
  return src.startsWith('/uploads/') ? `${API_ORIGIN}${src}` : src;
}
