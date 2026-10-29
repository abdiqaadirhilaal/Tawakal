const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const make = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.isTest,
    message: { success: false, message, errors: [] },
  });

module.exports = {
  apiLimiter: make(15 * 60 * 1000, 600, 'Codsiyo aad u badan. Fadlan wax yar sug.'),
  loginLimiter: make(15 * 60 * 1000, 10, 'Isku dayo badan oo soo gelid ah. Sug 15 daqiiqo.'),
  orderLimiter: make(60 * 60 * 1000, 30, 'Dalabyo aad u badan. Fadlan mar dambe isku day.'),
  trackLimiter: make(15 * 60 * 1000, 30, 'Raadin aad u badan. Fadlan wax yar sug.'),
  contactLimiter: make(60 * 60 * 1000, 8, 'Farriimo aad u badan. Fadlan mar dambe isku day.'),
};
