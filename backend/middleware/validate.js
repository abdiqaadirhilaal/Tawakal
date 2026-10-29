const AppError = require('../utils/AppError');

// Wuxuu hubiyaa body/query/params isagoo isticmaalaya Zod. Natiijada la nadiifiyey
// waxaa lagu kaydiyaa req.valid; controllers-ku waa in ay taas kaliya isticmaalaan
// (tani waxay ka hortagtaa mass-assignment).
module.exports = (schemas) => (req, res, next) => {
  req.valid = req.valid || {};
  for (const part of ['params', 'query', 'body']) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part] ?? {});
    if (!result.success) {
      const errors = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
      return next(new AppError(400, 'Xogta la soo diray sax ma aha', errors));
    }
    req.valid[part] = result.data;
  }
  return next();
};
