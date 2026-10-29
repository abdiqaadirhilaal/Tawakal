const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AppError = require('../utils/AppError');

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
// Hash been ah oo loo isticmaalo marka email-ka la waayo, si waqtiga jawaabtu isku mid u ahaado.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);
const INVALID = 'Email-ka ama furaha sirta ah ayaa khaldan';

/**
 * Wuxuu hubiyaa email + fure, isagoo ilaalinaya xiritaanka akoonka kadib isku dayo khaldan.
 * Waxaa isticmaala soo gelidda iyo oggolaanshaha maamulaha ee POS (qiimo-dhimis, celin),
 * sidaas darteed furaha maamulaha laguma qiyaasi karo iyada oo la marayo foomka kaashka.
 */
async function verifyCredentials(email, password) {
  const user = await User.findOne({ email }).select('+passwordHash +failedLoginAttempts +lockUntil');
  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw new AppError(401, INVALID);
  }
  if (user.lockUntil && user.lockUntil > new Date()) {
    throw new AppError(429, `Akoonkan si ku-meel-gaar ah ayaa loo xiray. Isku day ${LOCK_MINUTES} daqiiqo kadib.`);
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match || !user.isActive) {
    if (!match) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
        user.failedLoginAttempts = 0;
      }
      await user.save();
    }
    throw new AppError(401, INVALID);
  }

  if (user.failedLoginAttempts || user.lockUntil) {
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();
  }
  return user;
}

module.exports = { verifyCredentials, INVALID };
