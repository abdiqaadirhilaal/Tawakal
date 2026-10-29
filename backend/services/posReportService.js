const env = require('../config/env');
const Sale = require('../models/Sale');
const Refund = require('../models/Refund');
const Order = require('../models/Order');
const { round2 } = require('../utils/helpers');
const { rangeToUtc } = require('../utils/dates');

const TZ = env.REPORT_TIMEZONE;
const FORMATS = { day: '%Y-%m-%d', week: '%G-W%V', month: '%Y-%m', year: '%Y' };

/*
 * QEEXITAANNADA DAKHLIGA
 *  - Iibka POS (gross)   = wadarta guud (grandTotal) ee iib kasta oo la dhammaystiray, taariikhda iibka.
 *  - Celinta POS         = lacagta la celiyey, taariikhda celinta.
 *  - Dakhliga saafiga POS = iibka POS - celinta POS.
 *  - Dakhliga online-ka   = wadarta dalabyada online-ka ah ee LA GAARSIIYEY (delivered).
 *    Dalab sugaya ama la joojiyey kuma jiro dakhliga.
 *  - Dakhliga guud        = dakhliga saafiga POS + dakhliga online-ka.
 */

const dateMatch = (field, from, to) => {
  const range = rangeToUtc(from, to, TZ);
  return Object.keys(range).length ? { [field]: range } : {};
};

const periodExpr = (field, groupBy) => ({ $dateToString: { format: FORMATS[groupBy], date: `$${field}`, timezone: TZ } });

async function posSeries({ from, to, groupBy = 'day' }) {
  const [sales, refunds] = await Promise.all([
    Sale.aggregate([
      { $match: dateMatch('completedAt', from, to) },
      { $group: { _id: periodExpr('completedAt', groupBy), count: { $sum: 1 }, gross: { $sum: '$grandTotal' }, discount: { $sum: '$totalDiscount' } } },
    ]),
    Refund.aggregate([
      { $match: dateMatch('createdAt', from, to) },
      { $group: { _id: periodExpr('createdAt', groupBy), count: { $sum: 1 }, total: { $sum: '$amount' } } },
    ]),
  ]);
  const map = new Map();
  const row = (k) => {
    if (!map.has(k)) map.set(k, { period: k, sales: 0, gross: 0, discount: 0, refundCount: 0, refunds: 0, net: 0 });
    return map.get(k);
  };
  sales.forEach((r) => Object.assign(row(r._id), { sales: r.count, gross: round2(r.gross), discount: round2(r.discount) }));
  refunds.forEach((r) => Object.assign(row(r._id), { refundCount: r.count, refunds: round2(r.total) }));
  return [...map.values()]
    .map((r) => ({ ...r, net: round2(r.gross - r.refunds) }))
    .sort((a, b) => (a.period < b.period ? -1 : 1));
}

const sumSeries = (series) =>
  series.reduce(
    (acc, r) => ({
      sales: acc.sales + r.sales,
      gross: round2(acc.gross + r.gross),
      discount: round2(acc.discount + r.discount),
      refundCount: acc.refundCount + r.refundCount,
      refunds: round2(acc.refunds + r.refunds),
      net: round2(acc.net + r.net),
    }),
    { sales: 0, gross: 0, discount: 0, refundCount: 0, refunds: 0, net: 0 }
  );

async function posSalesReport({ from, to, groupBy }) {
  const match = dateMatch('completedAt', from, to);
  const [series, byProduct, byCategory] = await Promise.all([
    posSeries({ from, to, groupBy }),
    Sale.aggregate([
      { $match: match },
      { $unwind: '$items' },
      { $group: { _id: '$items.sku', name: { $last: '$items.name' }, unit: { $last: '$items.unit' }, quantity: { $sum: '$items.quantity' }, sales: { $sum: '$items.netTotal' } } },
      { $sort: { sales: -1 } },
      { $limit: 100 },
    ]),
    Sale.aggregate([
      { $match: match },
      { $unwind: '$items' },
      { $group: { _id: '$items.categoryName', sales: { $sum: '$items.netTotal' } } },
      { $sort: { sales: -1 } },
    ]),
  ]);
  return {
    from: from || null,
    to: to || null,
    groupBy,
    timezone: TZ,
    totals: sumSeries(series),
    series,
    byProduct: byProduct.map((r) => ({ sku: r._id, name: r.name, unit: r.unit, quantity: r.quantity, sales: round2(r.sales) })),
    byCategory: byCategory.map((r) => ({ category: r._id || '—', sales: round2(r.sales) })),
  };
}

async function cashierPerformance({ from, to }) {
  const [sales, refunds] = await Promise.all([
    Sale.aggregate([
      { $match: dateMatch('completedAt', from, to) },
      { $group: { _id: '$cashier', name: { $last: '$cashierName' }, sales: { $sum: 1 }, gross: { $sum: '$grandTotal' }, discount: { $sum: '$totalDiscount' } } },
    ]),
    // Celinta waxaa lagu xisaabiyaa kaashiyihii iibka asalka ah sameeyey.
    Refund.aggregate([
      { $match: dateMatch('createdAt', from, to) },
      { $lookup: { from: 'sales', localField: 'sale', foreignField: '_id', as: 's' } },
      { $group: { _id: { $arrayElemAt: ['$s.cashier', 0] }, name: { $last: { $arrayElemAt: ['$s.cashierName', 0] } }, refundCount: { $sum: 1 }, refunds: { $sum: '$amount' } } },
    ]),
  ]);
  const map = new Map();
  const row = (id, name) => {
    const k = String(id);
    if (!map.has(k)) map.set(k, { cashierId: k, cashierName: name || '—', sales: 0, gross: 0, discount: 0, refundCount: 0, refunds: 0 });
    return map.get(k);
  };
  sales.forEach((r) => Object.assign(row(r._id, r.name), { sales: r.sales, gross: round2(r.gross), discount: round2(r.discount) }));
  refunds.forEach((r) => Object.assign(row(r._id, r.name), { refundCount: r.refundCount, refunds: round2(r.refunds) }));
  const rows = [...map.values()]
    .map((r) => ({ ...r, net: round2(r.gross - r.refunds), averageSale: r.sales ? round2(r.gross / r.sales) : 0 }))
    .sort((a, b) => b.net - a.net);
  return { from: from || null, to: to || null, timezone: TZ, rows };
}

async function paymentMethodsReport({ from, to }) {
  const [sales, refunds, online] = await Promise.all([
    Sale.aggregate([
      { $match: dateMatch('completedAt', from, to) },
      { $group: { _id: '$paymentMethod.code', label: { $last: '$paymentMethod.label' }, type: { $last: '$paymentMethod.type' }, count: { $sum: 1 }, gross: { $sum: '$grandTotal' } } },
    ]),
    Refund.aggregate([
      { $match: dateMatch('createdAt', from, to) },
      { $group: { _id: '$method.code', label: { $last: '$method.label' }, type: { $last: '$method.type' }, refundCount: { $sum: 1 }, refunds: { $sum: '$amount' } } },
    ]),
    Order.aggregate([
      { $match: { ...dateMatch('createdAt', from, to), orderStatus: 'delivered' } },
      { $group: { _id: '$paymentMethod.code', label: { $last: '$paymentMethod.label' }, count: { $sum: 1 }, total: { $sum: '$total' } } },
      { $sort: { total: -1 } },
    ]),
  ]);
  const map = new Map();
  const row = (r) => {
    if (!map.has(r._id)) map.set(r._id, { code: r._id, label: r.label, type: r.type, count: 0, gross: 0, refundCount: 0, refunds: 0 });
    return map.get(r._id);
  };
  sales.forEach((r) => Object.assign(row(r), { count: r.count, gross: round2(r.gross) }));
  refunds.forEach((r) => Object.assign(row(r), { refundCount: r.refundCount, refunds: round2(r.refunds) }));
  return {
    from: from || null,
    to: to || null,
    timezone: TZ,
    pos: [...map.values()].map((r) => ({ ...r, net: round2(r.gross - r.refunds) })).sort((a, b) => b.gross - a.gross),
    online: online.map((r) => ({ code: r._id, label: r.label, count: r.count, total: round2(r.total) })),
  };
}

// Koobitaanka labada kanaal ee dashboard-ka (waqtiga oo dhan, ama muddo la siiyey).
async function channelSummary({ from, to } = {}) {
  const [saleAgg, refundAgg, onlineAgg, byMethod, byCashier] = await Promise.all([
    Sale.aggregate([{ $match: dateMatch('completedAt', from, to) }, { $group: { _id: null, count: { $sum: 1 }, gross: { $sum: '$grandTotal' }, discount: { $sum: '$totalDiscount' } } }]),
    Refund.aggregate([{ $match: dateMatch('createdAt', from, to) }, { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } }]),
    Order.aggregate([{ $match: { ...dateMatch('createdAt', from, to), orderStatus: 'delivered' } }, { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$total' } } }]),
    Sale.aggregate([
      { $match: dateMatch('completedAt', from, to) },
      { $group: { _id: '$paymentMethod.code', label: { $last: '$paymentMethod.label' }, count: { $sum: 1 }, gross: { $sum: '$grandTotal' } } },
      { $sort: { gross: -1 } },
    ]),
    Sale.aggregate([
      { $match: dateMatch('completedAt', from, to) },
      { $group: { _id: '$cashier', name: { $last: '$cashierName' }, count: { $sum: 1 }, gross: { $sum: '$grandTotal' } } },
      { $sort: { gross: -1 } },
      { $limit: 10 },
    ]),
  ]);
  const s = saleAgg[0] || { count: 0, gross: 0, discount: 0 };
  const r = refundAgg[0] || { count: 0, total: 0 };
  const o = onlineAgg[0] || { count: 0, total: 0 };
  const posNet = round2(s.gross - r.total);
  return {
    pos: { sales: s.count, gross: round2(s.gross), discount: round2(s.discount), refundCount: r.count, refunds: round2(r.total), net: posNet },
    online: { completedOrders: o.count, revenue: round2(o.total) },
    totalRevenue: round2(posNet + o.total),
    byPaymentMethod: byMethod.map((m) => ({ code: m._id, label: m.label, count: m.count, gross: round2(m.gross) })),
    byCashier: byCashier.map((c) => ({ cashierId: String(c._id), cashierName: c.name, count: c.count, gross: round2(c.gross) })),
    definition:
      'Dakhliga guud = (iibka POS - celinta POS) + dalabyada online-ka ah ee la gaarsiiyey. Dalabyada online-ka ah ee sugaya ama la joojiyey kuma jiraan.',
  };
}

module.exports = { posSeries, posSalesReport, cashierPerformance, paymentMethodsReport, channelSummary };
