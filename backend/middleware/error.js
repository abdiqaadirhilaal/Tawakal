const env = require('../config/env');
const AppError = require('../utils/AppError');

function notFound(req, res, next) {
  next(new AppError(404, 'Waddadan lama helin'));
}

function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message;
  let errors = err.errors && Array.isArray(err.errors) ? err.errors : [];

  if (err.name === 'ValidationError' && err.errors && !Array.isArray(err.errors)) {
    status = 400;
    message = 'Xogta la soo diray sax ma aha';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Aqoonsi (ID) aan sax ahayn';
    errors = [];
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = 'Xogtan hore ayaa loo diiwaangeliyey';
    errors = [{ field, message: 'Qiimahan hore ayaa loo isticmaalay' }];
  } else if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Sawirku aad ayuu u weyn yahay (ugu badnaan 3MB)' : 'Soo dejinta faylka way fashilantay';
    errors = [];
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'JSON aan sax ahayn';
    errors = [];
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Codsigu aad ayuu u weyn yahay';
    errors = [];
  }

  if (status >= 500) {
    if (!env.isTest) console.error('[error]', err);
    // Faahfaahinta gudaha weligeed looma diro macmiilka.
    message = 'Khalad ayaa ka dhacay server-ka. Fadlan mar kale isku day.';
    errors = [];
  }

  res.status(status).json({ success: false, message, errors });
}

module.exports = { notFound, errorHandler };
