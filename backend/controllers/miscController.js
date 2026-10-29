const env = require('../config/env');
const ContactMessage = require('../models/ContactMessage');
const CompanySettings = require('../models/CompanySettings');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paginate } = require('../utils/respond');
const { escapeRegex, phoneDigits, round2 } = require('../utils/helpers');
const { adminOrderRow } = require('../utils/serializers');
const reportService = require('../services/reportService');
const { saveImage } = require('../middleware/upload');

/* ---------- Xiriir ---------- */

exports.createContact = asyncHandler(async (req, res) => {
  const { name, phone, email, subject, message } = req.valid.body;
  await ContactMessage.create({ name, phone, email: email || '', subject, message });
  ok(res, { status: 201, message: 'Farriintaada waa la helay. Waan kula soo xiriiri doonnaa.' });
});

const serializeMessage = (m) => ({
  id: m._id.toString(),
  name: m.name,
  phone: m.phone,
  email: m.email,
  subject: m.subject,
  message: m.message,
  status: m.status,
  createdAt: m.createdAt,
});

exports.listMessages = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.valid.query;
  const filter = status === 'all' ? {} : { status };
  const [rows, total, unread] = await Promise.all([
    ContactMessage.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    ContactMessage.countDocuments(filter),
    ContactMessage.countDocuments({ status: 'new' }),
  ]);
  ok(res, { data: { items: rows.map(serializeMessage), unread }, pagination: paginate(page, limit, total) });
});

exports.updateMessageStatus = asyncHandler(async (req, res) => {
  const msg = await ContactMessage.findByIdAndUpdate(req.valid.params.id, { $set: { status: req.valid.body.status } }, { new: true });
  if (!msg) throw new AppError(404, 'Farriinta lama helin');
  ok(res, { message: 'Xaaladda farriinta waa la beddelay', data: serializeMessage(msg) });
});

/* ---------- Dejinta shirkadda ---------- */

exports.publicSettings = asyncHandler(async (req, res) => {
  const settings = await CompanySettings.getSingleton();
  ok(res, { data: settings.toPublicJSON() });
});

const adminSettings = (s) => {
  const o = s.toObject();
  delete o._id;
  delete o.__v;
  delete o.key;
  return o;
};

exports.getSettings = asyncHandler(async (req, res) => {
  ok(res, { data: adminSettings(await CompanySettings.getSingleton()) });
});

exports.updateSettings = asyncHandler(async (req, res) => {
  const settings = await CompanySettings.getSingleton();
  settings.set(req.valid.body);
  await settings.save();
  ok(res, { message: 'Dejinta waa la kaydiyey', data: adminSettings(settings) });
});

/* ---------- Dashboard iyo warbixinno ---------- */

exports.dashboardStats = asyncHandler(async (req, res) => {
  ok(res, { data: await reportService.dashboardStats() });
});

exports.dashboardSales = asyncHandler(async (req, res) => {
  ok(res, { data: await reportService.dashboardSales(req.valid.query.period) });
});

exports.salesReport = asyncHandler(async (req, res) => {
  const { from, to } = req.valid.query;
  if (from && to && from > to) throw new AppError(400, 'Taariikhda bilowgu waa in ay ka horreysaa tan dhammaadka');
  ok(res, { data: await reportService.salesReport(req.valid.query) });
});

exports.inventoryReport = asyncHandler(async (req, res) => {
  ok(res, { data: await reportService.inventoryReport({ includeCost: req.user.role === 'admin' }) });
});

/* ---------- Macaamiisha (laga soo saaray dalabyada) ---------- */

exports.listCustomers = asyncHandler(async (req, res) => {
  const { page, limit, search } = req.valid.query;
  const match = {};
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    const or = [{ 'customer.name': rx }, { 'customer.phone': rx }];
    const digits = phoneDigits(search);
    if (digits.length >= 4) or.push({ 'customer.phoneKey': new RegExp(escapeRegex(digits.slice(-9))) });
    match.$or = or;
  }
  const [result] = await Order.aggregate([
    { $match: match },
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: '$customer.phoneKey',
        name: { $last: '$customer.name' },
        phone: { $last: '$customer.phone' },
        orderCount: { $sum: 1 },
        // Wadarta iibka kuma jiraan dalabyada la joojiyey.
        totalSpent: { $sum: { $cond: [{ $eq: ['$orderStatus', 'cancelled'] }, 0, '$total'] } },
        lastOrderAt: { $max: '$createdAt' },
      },
    },
    { $sort: { lastOrderAt: -1 } },
    { $facet: { rows: [{ $skip: (page - 1) * limit }, { $limit: limit }], count: [{ $count: 'n' }] } },
  ]);
  const total = result.count[0] ? result.count[0].n : 0;
  ok(res, {
    data: result.rows.map((r) => ({
      phoneKey: r._id,
      name: r.name,
      phone: r.phone,
      orderCount: r.orderCount,
      totalSpent: round2(r.totalSpent),
      lastOrderAt: r.lastOrderAt,
    })),
    pagination: paginate(page, limit, total),
  });
});

exports.customerOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ 'customer.phoneKey': req.valid.params.phoneKey }).sort({ createdAt: -1 }).limit(200);
  if (!orders.length) throw new AppError(404, 'Macmiilka lama helin');
  ok(res, {
    data: {
      customer: { name: orders[0].customer.name, phone: orders[0].customer.phone, email: orders[0].customer.email },
      orders: orders.map(adminOrderRow),
    },
  });
});

/* ---------- Sawirro ---------- */

exports.uploadImage = asyncHandler(async (req, res) => {
  const url = await saveImage(req.file);
  ok(res, { status: 201, message: 'Sawirka waa la soo dejiyey', data: { url } });
});

exports.timezone = env.REPORT_TIMEZONE;
