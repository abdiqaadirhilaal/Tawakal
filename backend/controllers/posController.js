const mongoose = require('mongoose');
const env = require('../config/env');
const { POS_ROLES } = require('../config/constants');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Sale = require('../models/Sale');
const Refund = require('../models/Refund');
const CashierShift = require('../models/CashierShift');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const CompanySettings = require('../models/CompanySettings');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paginate } = require('../utils/respond');
const { escapeRegex } = require('../utils/helpers');
const { rangeToUtc } = require('../utils/dates');
const { posProduct } = require('../utils/serializers');
const ser = require('../utils/posSerializers');
const posService = require('../services/posService');
const shiftService = require('../services/shiftService');
const posReports = require('../services/posReportService');
const { audit } = require('../services/auditService');

const { isSupervisor } = posService;
const COLLATION = { locale: 'en', strength: 2 };
const dateRange = (from, to) => rangeToUtc(from, to, env.REPORT_TIMEZONE);
// aggregate() ma beddelo string-ka ObjectId (find() wuu beddelaa), sidaas darteed halkan ayaa lagu beddelaa.
const oid = (v) => new mongoose.Types.ObjectId(v);

/* ---------- Dejinta iyo alaabta ---------- */

exports.config = asyncHandler(async (req, res) => {
  const [settings, categories] = await Promise.all([
    CompanySettings.getSingleton(),
    Category.find({ isActive: true }).collation(COLLATION).sort({ name: 1 }),
  ]);
  ok(res, {
    data: {
      ...settings.toPosJSON(),
      categories: categories.map((c) => ({ id: c._id.toString(), name: c.name, slug: c.slug })),
      role: req.user.role,
    },
  });
});

// Alaabta la iibin karo oo kaliya (firfircoon, aan la kaydin), goobo ammaan ah oo kaliya.
const sellable = () => ({ isActive: true, isArchived: false });

exports.listProducts = asyncHandler(async (req, res) => {
  const { page, limit, search, category } = req.valid.query;
  const filter = sellable();
  if (category) filter.category = category;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { sku: rx }, { barcode: search }];
  }
  const [items, total] = await Promise.all([
    Product.find(filter).collation(COLLATION).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).populate('category', 'name slug'),
    Product.countDocuments(filter),
  ]);
  ok(res, { data: items.map(posProduct), pagination: paginate(page, limit, total) });
});

// Raadin degdeg ah (scanner): marka hore barcode ama SKU oo sax ah, haddii kale magac.
exports.searchProducts = asyncHandler(async (req, res) => {
  const { q } = req.valid.query;
  const exact = await Product.findOne({ ...sellable(), $or: [{ barcode: q }, { sku: q.toUpperCase() }] }).populate('category', 'name slug');
  if (exact) return ok(res, { data: { exact: true, items: [posProduct(exact)] } });
  const rx = new RegExp(escapeRegex(q), 'i');
  const items = await Product.find({ ...sellable(), $or: [{ name: rx }, { sku: rx }] })
    .collation(COLLATION)
    .sort({ name: 1 })
    .limit(20)
    .populate('category', 'name slug');
  return ok(res, { data: { exact: false, items: items.map(posProduct) } });
});

/* ---------- Iibka ---------- */

exports.createSale = asyncHandler(async (req, res) => {
  const { sale, duplicate } = await posService.createSale(req.valid.body, req.user);
  ok(res, {
    status: duplicate ? 200 : 201,
    message: duplicate ? 'Iibkan hore ayaa loo diiwaangeliyey' : 'Iibka waa la dhammaystiray',
    data: ser.sale(sale),
  });
});

// Kaashiyuhu wuxuu arkaa iibkiisa oo kaliya; maamule/manager dhammaan.
async function loadSale(id, user) {
  const sale = await Sale.findById(id);
  if (!sale || (!isSupervisor(user) && !sale.cashier.equals(user._id))) throw new AppError(404, 'Iibka lama helin');
  return sale;
}

exports.listSales = asyncHandler(async (req, res) => {
  const { page, limit, search, cashier, paymentMethod, status, from, to } = req.valid.query;
  const filter = {};
  if (!isSupervisor(req.user)) filter.cashier = req.user._id;
  else if (cashier) filter.cashier = oid(cashier);
  if (paymentMethod) filter['paymentMethod.code'] = paymentMethod;
  if (status !== 'all') filter.status = status;
  const range = dateRange(from, to);
  if (Object.keys(range).length) filter.completedAt = range;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ saleNumber: rx }, { receiptNumber: rx }, { cashierName: rx }, { customerNameSnapshot: rx }, { customerPhoneSnapshot: rx }];
  }
  const [rows, total, sums] = await Promise.all([
    Sale.find(filter).sort({ completedAt: -1 }).skip((page - 1) * limit).limit(limit),
    Sale.countDocuments(filter),
    Sale.aggregate([{ $match: filter }, { $group: { _id: null, gross: { $sum: '$grandTotal' }, discount: { $sum: '$totalDiscount' }, refunded: { $sum: '$refundedAmount' } } }]),
  ]);
  const t = sums[0] || { gross: 0, discount: 0, refunded: 0 };
  ok(res, {
    data: { items: rows.map(ser.saleRow), totals: { gross: t.gross, discount: t.discount, refunded: t.refunded } },
    pagination: paginate(page, limit, total),
  });
});

exports.getSale = asyncHandler(async (req, res) => {
  const sale = await loadSale(req.valid.params.id, req.user);
  const refunds = await Refund.find({ sale: sale._id }).sort({ createdAt: 1 });
  ok(res, { data: { sale: ser.sale(sale), refunds: refunds.map(ser.refund) } });
});

exports.getReceipt = asyncHandler(async (req, res) => {
  const sale = await loadSale(req.valid.params.id, req.user);
  const settings = await CompanySettings.getSingleton();
  if (req.valid.query.reprint === 'true') {
    await audit(req.user, 'receipt.reprinted', { resourceType: 'Sale', resourceId: sale._id, resourceLabel: sale.receiptNumber });
  }
  ok(res, {
    data: {
      sale: ser.sale(sale),
      company: {
        name: settings.companyName,
        tagline: settings.tagline,
        logoUrl: settings.logoUrl,
        phone: settings.phone,
        address: settings.address,
        footer: settings.pos.receiptFooter,
      },
    },
  });
});

/* ---------- Celinta ---------- */

exports.createRefund = asyncHandler(async (req, res) => {
  const { refund, duplicate } = await posService.createRefund({ saleId: req.valid.params.id, input: req.valid.body, user: req.user });
  const sale = await Sale.findById(refund.sale);
  ok(res, {
    status: duplicate ? 200 : 201,
    message: duplicate ? 'Celintan hore ayaa loo diiwaangeliyey' : 'Celinta waa la diiwaangeliyey',
    data: { refund: ser.refund(refund), sale: ser.sale(sale) },
  });
});

exports.listRefunds = asyncHandler(async (req, res) => {
  const { page, limit, search, from, to } = req.valid.query;
  const filter = {};
  if (!isSupervisor(req.user)) filter.processedBy = req.user._id;
  const range = dateRange(from, to);
  if (Object.keys(range).length) filter.createdAt = range;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ refundNumber: rx }, { saleNumber: rx }, { receiptNumber: rx }];
  }
  const [rows, total] = await Promise.all([
    Refund.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Refund.countDocuments(filter),
  ]);
  ok(res, { data: rows.map(ser.refund), pagination: paginate(page, limit, total) });
});

exports.getRefund = asyncHandler(async (req, res) => {
  const refund = await Refund.findById(req.valid.params.id);
  if (!refund || (!isSupervisor(req.user) && !refund.processedBy.equals(req.user._id))) throw new AppError(404, 'Celinta lama helin');
  ok(res, { data: ser.refund(refund) });
});

/* ---------- Shifts ---------- */

exports.openShift = asyncHandler(async (req, res) => {
  const shift = await shiftService.openShift(req.user, req.valid.body.openingCash);
  ok(res, { status: 201, message: 'Shift-ka waa la furay', data: ser.shift(shift, await shiftService.computeSummary(shift)) });
});

exports.currentShift = asyncHandler(async (req, res) => {
  const shift = await shiftService.getOpenShift(req.user._id);
  ok(res, { data: shift ? ser.shift(shift, await shiftService.computeSummary(shift)) : null });
});

exports.closeShift = asyncHandler(async (req, res) => {
  const { actualClosingCash, closingNotes, shiftId } = req.valid.body;
  let shift;
  if (shiftId) {
    shift = await CashierShift.findById(shiftId);
    if (!shift || (!isSupervisor(req.user) && !shift.cashier.equals(req.user._id))) throw new AppError(404, 'Shift-ka lama helin');
    if (shift.status !== 'open') throw new AppError(409, 'Shift-kan hore ayaa loo xiray');
  } else {
    shift = await shiftService.getOpenShift(req.user._id);
    if (!shift) throw new AppError(409, 'Shift furan ma lihid');
  }
  const closed = await shiftService.closeShift({ shift, actualClosingCash, closingNotes, user: req.user });
  ok(res, { message: 'Shift-ka waa la xiray', data: ser.shift(closed) });
});

exports.shiftHistory = asyncHandler(async (req, res) => {
  const { page, limit, cashier, status, from, to } = req.valid.query;
  const filter = {};
  if (!isSupervisor(req.user)) filter.cashier = req.user._id;
  else if (cashier) filter.cashier = oid(cashier);
  if (status !== 'all') filter.status = status;
  const range = dateRange(from, to);
  if (Object.keys(range).length) filter.openedAt = range;
  const [rows, total] = await Promise.all([
    CashierShift.find(filter).sort({ openedAt: -1 }).skip((page - 1) * limit).limit(limit),
    CashierShift.countDocuments(filter),
  ]);
  // Shifts-ka furan koobitaankooda hadda ayaa la xisaabiyaa.
  const data = await Promise.all(rows.map(async (s) => ser.shift(s, s.status === 'open' ? await shiftService.computeSummary(s) : null)));
  ok(res, { data, pagination: paginate(page, limit, total) });
});

exports.getShift = asyncHandler(async (req, res) => {
  const shift = await CashierShift.findById(req.valid.params.id);
  if (!shift || (!isSupervisor(req.user) && !shift.cashier.equals(req.user._id))) throw new AppError(404, 'Shift-ka lama helin');
  ok(res, { data: ser.shift(shift, shift.status === 'open' ? await shiftService.computeSummary(shift) : null) });
});

exports.addShiftAdjustment = asyncHandler(async (req, res) => {
  const shift = await shiftService.addAdjustment({ shiftId: req.valid.params.id, ...req.valid.body, user: req.user });
  ok(res, { status: 201, message: 'Hagaajinta waa la diiwaangeliyey', data: ser.shift(shift, await shiftService.computeSummary(shift)) });
});

exports.listCashiers = asyncHandler(async (req, res) => {
  const users = await User.find({ role: { $in: POS_ROLES } }).sort({ name: 1 }).select('name role isActive');
  ok(res, { data: users.map((u) => ({ id: u._id.toString(), name: u.name, role: u.role, isActive: u.isActive })) });
});

/* ---------- Warbixinno (maamule / manager) ---------- */

const assertRange = ({ from, to }) => {
  if (from && to && from > to) throw new AppError(400, 'Taariikhda bilowgu waa in ay ka horreysaa tan dhammaadka');
};

exports.posSalesReport = asyncHandler(async (req, res) => {
  assertRange(req.valid.query);
  ok(res, { data: await posReports.posSalesReport(req.valid.query) });
});

exports.cashierPerformance = asyncHandler(async (req, res) => {
  assertRange(req.valid.query);
  ok(res, { data: await posReports.cashierPerformance(req.valid.query) });
});

exports.paymentMethodsReport = asyncHandler(async (req, res) => {
  assertRange(req.valid.query);
  ok(res, { data: await posReports.paymentMethodsReport(req.valid.query) });
});

exports.shiftsReport = asyncHandler(async (req, res) => {
  const { page, limit, cashier, status, from, to } = req.valid.query;
  assertRange(req.valid.query);
  const filter = {};
  if (cashier) filter.cashier = oid(cashier);
  if (status !== 'all') filter.status = status;
  const range = dateRange(from, to);
  if (Object.keys(range).length) filter.openedAt = range;
  const [rows, total, agg] = await Promise.all([
    CashierShift.find(filter).sort({ openedAt: -1 }).skip((page - 1) * limit).limit(limit),
    CashierShift.countDocuments(filter),
    CashierShift.aggregate([
      { $match: { ...filter, status: 'closed' } },
      { $group: { _id: null, closed: { $sum: 1 }, expected: { $sum: '$expectedClosingCash' }, actual: { $sum: '$actualClosingCash' }, variance: { $sum: '$cashVariance' }, withVariance: { $sum: { $cond: [{ $ne: ['$cashVariance', 0] }, 1, 0] } } } },
    ]),
  ]);
  const data = await Promise.all(rows.map(async (s) => ser.shift(s, s.status === 'open' ? await shiftService.computeSummary(s) : null)));
  const t = agg[0] || { closed: 0, expected: 0, actual: 0, variance: 0, withVariance: 0 };
  ok(res, {
    data: { items: data, totals: { closed: t.closed, expected: t.expected, actual: t.actual, variance: t.variance, withVariance: t.withVariance } },
    pagination: paginate(page, limit, total),
  });
});

exports.auditLogs = asyncHandler(async (req, res) => {
  const { page, limit, action, from, to } = req.valid.query;
  const filter = {};
  if (action) filter.action = action;
  const range = dateRange(from, to);
  if (Object.keys(range).length) filter.createdAt = range;
  const [rows, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    AuditLog.countDocuments(filter),
  ]);
  ok(res, {
    data: rows.map((l) => ({
      id: l._id.toString(),
      userName: l.userName,
      action: l.action,
      resourceType: l.resourceType,
      resourceLabel: l.resourceLabel,
      metadata: l.metadata,
      createdAt: l.createdAt,
    })),
    pagination: paginate(page, limit, total),
  });
});
