const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const round3 = (n) => Math.round((Number(n) + Number.EPSILON) * 1000) / 1000;

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const phoneDigits = (phone) => String(phone || '').replace(/\D/g, '');

// Laba lambar waa isku mid haddii 9-ka god ee ugu dambeeya ay is leeyihiin
// (si "+252 61 5000000" iyo "0615000000" ay isugu aqoonsadaan).
function phonesMatch(a, b) {
  const x = phoneDigits(a);
  const y = phoneDigits(b);
  if (x.length < 7 || y.length < 7) return false;
  const n = Math.min(9, x.length, y.length);
  return x.slice(-n) === y.slice(-n);
}

module.exports = { round2, round3, escapeRegex, slugify, phoneDigits, phonesMatch };
