const AuditLog = require('../models/AuditLog');

// Diiwaanka hawlaha xasaasiga ah. Qoristu weligeed ma joojiso hawsha asalka ah.
async function audit(user, action, { resourceType = '', resourceId = null, resourceLabel = '', metadata = {} } = {}) {
  try {
    await AuditLog.create({
      user: user ? user._id : null,
      userName: user ? user.name : '',
      action,
      resourceType,
      resourceId,
      resourceLabel,
      metadata,
    });
  } catch (err) {
    console.error('[audit] lama qori karin', action, err.message);
  }
}

module.exports = { audit };
