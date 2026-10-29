const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');
const { setAuthCookie, clearAuthCookie } = require('../middleware/auth');
const { verifyCredentials } = require('../services/authService');

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.valid.body;
  const user = await verifyCredentials(email, password);
  user.lastLoginAt = new Date();
  await user.save();

  setAuthCookie(res, user);
  ok(res, { message: 'Si guul leh ayaad u soo gashay', data: { user: user.toSafeJSON() } });
});

exports.logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  ok(res, { message: 'Waad ka baxday' });
});

exports.me = asyncHandler(async (req, res) => {
  ok(res, { data: { user: req.user.toSafeJSON() } });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.valid.body;
  const user = await User.findById(req.user._id).select('+passwordHash');
  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) throw new AppError(400, 'Furaha sirta ah ee hadda ayaa khaldan', [{ field: 'currentPassword', message: 'Khalad' }]);

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.tokenVersion += 1; // wuxuu burinayaa dhammaan fadhiyadii hore
  await user.save();
  setAuthCookie(res, user);
  ok(res, { message: 'Furaha sirta ah waa la beddelay' });
});
