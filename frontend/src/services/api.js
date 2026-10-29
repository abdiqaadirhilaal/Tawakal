import axios from 'axios';

// Production-ka frontend-ka iyo API-gu isla origin ayay ku wada noqdaan,
// marka default-ku waa waddo relative ah ("/api").
const DEFAULT_URL = import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || DEFAULT_URL,
  withCredentials: true, // cookie-ga HttpOnly ee maamulka
  timeout: 20000,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

// Khalad kasta waxaa loo beddelaa qaab isku mid ah: { status, message, errors }
export function normalizeError(error) {
  if (error && error.isNormalized) return error;
  const res = error?.response;
  const out = new Error(
    res?.data?.message ||
      (error?.code === 'ECONNABORTED'
        ? 'Codsigu wuu daahay. Fadlan mar kale isku day.'
        : res
          ? 'Khalad ayaa dhacay. Fadlan mar kale isku day.'
          : 'Server-ka lama gaari karo. Hubi internet-kaaga.')
  );
  out.isNormalized = true;
  out.status = res?.status || 0;
  out.errors = Array.isArray(res?.data?.errors) ? res.data.errors : [];
  return out;
}

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const normalized = normalizeError(error);
    const url = error?.config?.url || '';
    if (normalized.status === 401 && url.startsWith('/admin')) {
      window.dispatchEvent(new CustomEvent('tawakal:auth-expired'));
    }
    return Promise.reject(normalized);
  }
);

export default api;
