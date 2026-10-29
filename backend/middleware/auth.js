const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, tv: user.tokenVersion }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  };
}

function setAuthCookie(res, user) {
  res.cookie(env.COOKIE_NAME, signToken(user), cookieOptions());
}

function clearAuthCookie(res) {
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie(env.COOKIE_NAME, opts);
}

const requireAuth = asyncHandler(async (req, res, next) => {
  const token = req.cookies && req.cookies[env.COOKIE_NAME];
  if (!token) throw new AppError(401, 'Fadlan soo gal nidaamka');

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    throw new AppError(401, 'Fadhigaagu wuu dhacay, mar kale soo gal');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive || user.tokenVersion !== payload.tv) {
    throw new AppError(401, 'Fadhigaagu wuu dhacay, mar kale soo gal');
  }
  req.user = user;
  next();
});

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError(403, 'Awood uma lihid hawshan'));
  }
  return next();
};

// Difaaca CSRF: cookie-gu waa SameSite=Lax, CORS-kuna waa liis la oggol yahay.
// Intaas waxaa dheer in codsi kasta oo wax beddelaya uu wato header gaar ah oo
// foom HTML caadi ah uusan diri karin (wuxuu ku qasbaa CORS preflight).
const requireCsrfHeader = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') {
    return next(new AppError(403, 'Codsiga waa la diiday (CSRF)'));
  }
  return next();
};

module.exports = { signToken, setAuthCookie, clearAuthCookie, requireAuth, requireRole, requireCsrfHeader };
