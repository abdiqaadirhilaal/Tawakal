const env = require('../config/env');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paginate } = require('../utils/respond');
const { escapeRegex, phonesMatch, phoneDigits } = require('../utils/helpers');
const { rangeToUtc } = require('../utils/dates');
const { orderConfirmation, orderTracking, adminOrderRow, adminOrder } = require('../utils/serializers');
const orderService = require('../services/orderService');

/* ---------- Dadweynaha ---------- */

exports.create = asyncHandler(async (req, res) => {
  const { order, duplicate } = await orderService.createOrder(req.valid.body);
  ok(res, {
    status: duplicate ? 200 : 201,
    message: duplicate ? 'Dalabkan hore ayaa loo diiwaangeliyey' : 'Dalabkaaga waa la helay',
    data: orderConfirmation(order),
  });
});

exports.track = asyncHandler(async (req, res) => {
  const { orderNumber, phone } = req.valid.query;
  const order = await Order.findOne({ orderNumber });
  // Isla farriin ayaa la soo celiyaa haddii dalabku jirin ama taleefanku khaldan yahay,
  // si aan loo ogaan karin lambarrada dalabyada ee jira.
  if (!order || !phonesMatch(order.customer.phone, phone)) {
    throw new AppError(404, 'Dalab ku habboon lambarkan iyo taleefankan lama helin');
  }
  ok(res, { data: orderTracking(order) });
});

/* ---------- Maamulka ---------- */

exports.listAdmin = asyncHandler(async (req, res) => {
  const { page, limit, search, status, paymentStatus, from, to } = req.valid.query;
  const filter = {};
  if (status !== 'all') filter.orderStatus = status;
  if (paymentStatus !== 'all') filter.paymentStatus = paymentStatus;
  const range = rangeToUtc(from, to, env.REPORT_TIMEZONE);
  if (Object.keys(range).length) filter.createdAt = range;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    const or = [{ orderNumber: rx }, { 'customer.name': rx }, { 'customer.phone': rx }];
    const digits = phoneDigits(search);
    if (digits.length >= 4) or.push({ 'customer.phoneKey': new RegExp(escapeRegex(digits.slice(-9))) });
    filter.$or = or;
  }

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
  ]);
  ok(res, { data: orders.map(adminOrderRow), pagination: paginate(page, limit, total) });
});

exports.getAdmin = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.valid.params.id);
  if (!order) throw new AppError(404, 'Dalabka lama helin');
  ok(res, { data: adminOrder(order, req.user) });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrderStatus(req.valid.params.id, req.valid.body.status, req.user);
  ok(res, { message: 'Xaaladda dalabka waa la beddelay', data: adminOrder(order, req.user) });
});

exports.updatePaymentStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updatePaymentStatus(req.valid.params.id, req.valid.body.paymentStatus);
  ok(res, { message: 'Xaaladda lacag bixinta waa la beddelay', data: adminOrder(order, req.user) });
});

exports.addNote = asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndUpdate(
    req.valid.params.id,
    { $push: { internalNotes: { text: req.valid.body.text, by: req.user._id, byName: req.user.name, at: new Date() } } },
    { new: true }
  );
  if (!order) throw new AppError(404, 'Dalabka lama helin');
  ok(res, { status: 201, message: 'Qoraalka waa la daray', data: adminOrder(order, req.user) });
});
