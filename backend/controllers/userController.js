const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');

exports.list = asyncHandler(async (req, res) => {
  const users = await User.find({}).sort({ createdAt: 1 });
  ok(res, { data: users.map((u) => u.toSafeJSON()) });
});

exports.create = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.valid.body;
  if (await User.exists({ email })) {
    throw new AppError(409, 'Email-kan hore ayaa loo diiwaangeliyey', [{ field: 'email', message: 'Hore ayaa loo isticmaalay' }]);
  }
  const user = await User.create({ name, email, role, passwordHash: await bcrypt.hash(password, 12) });
  ok(res, { status: 201, message: 'Isticmaalaha waa la abuuray', data: user.toSafeJSON() });
});

exports.update = asyncHandler(async (req, res) => {
  const user = await User.findById(req.valid.params.id);
  if (!user) throw new AppError(404, 'Isticmaalaha lama helin');
  const { name, role, isActive } = req.valid.body;
  const isSelf = user._id.equals(req.user._id);

  if (isSelf && (isActive === false || (role && role !== 'admin'))) {
    throw new AppError(400, 'Ma joojin kartid mana dhimi kartid akoonkaaga');
  }
  const losingAdmin = user.role === 'admin' && user.isActive && (isActive === false || (role && role !== 'admin'));
  if (losingAdmin) {
    const admins = await User.countDocuments({ role: 'admin', isActive: true });
    if (admins <= 1) throw new AppError(400, 'Ugu yaraan hal maamule oo firfircoon waa in uu jiraa');
  }

  if (name !== undefined) user.name = name;
  if (role !== undefined) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  if (role !== undefined || isActive === false) user.tokenVersion += 1;
  await user.save();
  ok(res, { message: 'Isticmaalaha waa la cusboonaysiiyey', data: user.toSafeJSON() });
});
