function ok(res, { data = null, message = 'OK', pagination, status = 200 } = {}) {
  const body = { success: true, message, data };
  if (pagination) body.pagination = pagination;
  return res.status(status).json(body);
}

function paginate(page, limit, total) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

module.exports = { ok, paginate };
