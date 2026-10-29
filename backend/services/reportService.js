const env = require('../config/env');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { round2 } = require('../utils/helpers');
const { addDays, todayInTz, rangeToUtc } = require('../utils/dates');
const { channelSummary, posSeries } = require('./posReportService');

const TZ = env.REPORT_TIMEZONE;

/*
 * QEEXITAANNADA (waxaa lagu isticmaalaa dashboard-ka iyo warbixinnada oo dhan):
 *  - "Iib" (sales)      = wadarta dalabyada aan la joojin (orderStatus != cancelled), taariikhda dalabka.
 *  - "Dakhli" (revenue) = wadarta dalabyada la gaarsiiyey (orderStatus == delivered).
 *  Dalabyada la joojiyey kuma jiraan midkoodna.
 */

const LOW_STOCK_EXPR = { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }] };
const lowStockFilter = () => ({ isArchived: false, $expr: LOW_STOCK_EXPR });
const outOfStockFilter = () => ({ isArchived: false, stock: { $lte: 0 } });

const FORMATS = { day: '%Y-%m-%d', week: '%G-W%V', month: '%Y-%m', year: '%Y' };

async function salesSeries({ from, to, groupBy = 'day' }) {
  const match = { orderStatus: { $ne: 'cancelled' } };
  const range = rangeToUtc(from, to, TZ);
  if (Object.keys(range).length) match.createdAt = range;

  const rows = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: FORMATS[groupBy], date: '$createdAt', timezone: TZ } },
        orders: { $sum: 1 },
        sales: { $sum: '$total' },
        revenue: { $sum: { $cond: [{ $eq: ['$orderStatus', 'delivered'] }, '$total', 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r) => ({ period: r._id, orders: r.orders, sales: round2(r.sales), revenue: round2(r.revenue) }));
}

// Wuxuu isku daraa taxanaha online-ka iyo kan POS, buuxiyaana maalmaha/bilaha madhan.
//   sales    = dalabyada online-ka ah ee aan la joojin
//   posNet   = iibka POS oo laga jaray celinta
//   combined = sales + posNet
function fillSeries(rows, keys, posRows = []) {
  const map = new Map(rows.map((r) => [r.period, r]));
  const pos = new Map(posRows.map((r) => [r.period, r]));
  return keys.map((k) => {
    const o = map.get(k) || { period: k, orders: 0, sales: 0, revenue: 0 };
    const p = pos.get(k) || { sales: 0, gross: 0, refunds: 0, net: 0 };
    return { ...o, posSales: p.sales, posGross: p.gross, posRefunds: p.refunds, posNet: p.net, combined: round2(o.sales + p.net) };
  });
}

async function dashboardSales(period) {
  const today = todayInTz(TZ);
  if (period === '12m') {
    const [y, m] = today.split('-').map(Number);
    const keys = [];
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(Date.UTC(y, m - 1 - i, 1));
      keys.push(d.toISOString().slice(0, 7));
    }
    const range = { from: `${keys[0]}-01`, to: today, groupBy: 'month' };
    const [rows, posRows] = await Promise.all([salesSeries(range), posSeries(range)]);
    return { period, groupBy: 'month', series: fillSeries(rows, keys, posRows) };
  }
  const days = period === '7d' ? 7 : 30;
  const keys = [];
  for (let i = days - 1; i >= 0; i -= 1) keys.push(addDays(today, -i));
  const range = { from: keys[0], to: today, groupBy: 'day' };
  const [rows, posRows] = await Promise.all([salesSeries(range), posSeries(range)]);
  return { period, groupBy: 'day', series: fillSeries(rows, keys, posRows) };
}

async function bestSellers(match, limit = 5) {
  const rows = await Order.aggregate([
    { $match: match },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.sku',
        name: { $last: '$items.name' },
        unit: { $last: '$items.unit' },
        quantity: { $sum: '$items.quantity' },
        sales: { $sum: '$items.lineTotal' },
      },
    },
    { $sort: { sales: -1 } },
    { $limit: limit },
  ]);
  return rows.map((r) => ({ sku: r._id, name: r.name, unit: r.unit, quantity: r.quantity, sales: round2(r.sales) }));
}

async function dashboardStats() {
  const notCancelled = { orderStatus: { $ne: 'cancelled' } };
  const [
    totalProducts,
    activeProducts,
    lowStock,
    outOfStock,
    totalOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    revenueAgg,
    recentOrders,
    top,
  ] = await Promise.all([
    Product.countDocuments({ isArchived: false }),
    Product.countDocuments({ isArchived: false, isActive: true }),
    Product.countDocuments(lowStockFilter()),
    Product.countDocuments(outOfStockFilter()),
    Order.countDocuments({}),
    Order.countDocuments({ orderStatus: 'pending' }),
    Order.countDocuments({ orderStatus: 'delivered' }),
    Order.countDocuments({ orderStatus: 'cancelled' }),
    Order.aggregate([{ $match: { orderStatus: 'delivered' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Order.find({}).sort({ createdAt: -1 }).limit(8).select('orderNumber customer.name total orderStatus paymentStatus createdAt currency'),
    bestSellers(notCancelled, 5),
  ]);

  const channels = await channelSummary();

  return {
    channels,
    products: { total: totalProducts, active: activeProducts, lowStock, outOfStock },
    orders: { total: totalOrders, pending: pendingOrders, completed: completedOrders, cancelled: cancelledOrders },
    revenue: round2(revenueAgg[0] ? revenueAgg[0].total : 0),
    revenueDefinition: 'Wadarta dalabyada la gaarsiiyey (delivered). Dalabyada la joojiyey kuma jiraan.',
    recentOrders: recentOrders.map((o) => ({
      id: o._id.toString(),
      orderNumber: o.orderNumber,
      customerName: o.customer.name,
      total: o.total,
      currency: o.currency,
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt,
    })),
    bestSellers: top,
  };
}

async function salesReport({ from, to, groupBy }) {
  const range = rangeToUtc(from, to, TZ);
  const inRange = Object.keys(range).length ? { createdAt: range } : {};
  const notCancelled = { ...inRange, orderStatus: { $ne: 'cancelled' } };

  const [series, byProduct, byCategoryRaw, statusRaw] = await Promise.all([
    salesSeries({ from, to, groupBy }),
    bestSellers(notCancelled, 100),
    Order.aggregate([
      { $match: notCancelled },
      { $unwind: '$items' },
      { $group: { _id: '$items.categoryName', quantity: { $sum: '$items.quantity' }, sales: { $sum: '$items.lineTotal' } } },
      { $sort: { sales: -1 } },
    ]),
    Order.aggregate([{ $match: inRange }, { $group: { _id: '$orderStatus', count: { $sum: 1 }, total: { $sum: '$total' } } }]),
  ]);

  const totals = series.reduce(
    (acc, r) => ({ orders: acc.orders + r.orders, sales: round2(acc.sales + r.sales), revenue: round2(acc.revenue + r.revenue) }),
    { orders: 0, sales: 0, revenue: 0 }
  );

  return {
    from: from || null,
    to: to || null,
    groupBy,
    timezone: TZ,
    totals,
    series,
    byProduct,
    byCategory: byCategoryRaw.map((r) => ({ category: r._id || '—', quantity: r.quantity, sales: round2(r.sales) })),
    statusSummary: statusRaw.map((r) => ({ status: r._id, count: r.count, total: round2(r.total) })),
  };
}

async function inventoryReport({ includeCost }) {
  const [valuation, byCategory, low, out] = await Promise.all([
    Product.aggregate([
      { $match: { isArchived: false } },
      {
        $group: {
          _id: null,
          products: { $sum: 1 },
          units: { $sum: '$stock' },
          costValue: { $sum: { $multiply: ['$stock', '$costPrice'] } },
          retailValue: { $sum: { $multiply: ['$stock', '$price'] } },
        },
      },
    ]),
    Product.aggregate([
      { $match: { isArchived: false } },
      {
        $group: {
          _id: '$category',
          products: { $sum: 1 },
          units: { $sum: '$stock' },
          costValue: { $sum: { $multiply: ['$stock', '$costPrice'] } },
          retailValue: { $sum: { $multiply: ['$stock', '$price'] } },
        },
      },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'cat' } },
      { $project: { category: { $ifNull: [{ $arrayElemAt: ['$cat.name', 0] }, '—'] }, products: 1, units: 1, costValue: 1, retailValue: 1 } },
      { $sort: { category: 1 } },
    ]),
    Product.find(lowStockFilter()).sort({ stock: 1 }).limit(200).select('name sku unit stock lowStockThreshold'),
    Product.find(outOfStockFilter()).sort({ name: 1 }).limit(200).select('name sku unit stock lowStockThreshold'),
  ]);

  const v = valuation[0] || { products: 0, units: 0, costValue: 0, retailValue: 0 };
  const shape = (r) => {
    const o = { products: r.products, units: r.units, retailValue: round2(r.retailValue) };
    if (includeCost) o.costValue = round2(r.costValue);
    return o;
  };
  const slim = (p) => ({ id: p._id.toString(), name: p.name, sku: p.sku, unit: p.unit, stock: p.stock, lowStockThreshold: p.lowStockThreshold });

  return {
    valuationBasis: 'Qiimaha kaydka = kaydka hadda x qiimaha iibsiga (costPrice) ee alaab kasta.',
    totals: shape(v),
    byCategory: byCategory.map((r) => ({ category: r.category, ...shape(r) })),
    lowStock: low.map(slim),
    outOfStock: out.map(slim),
  };
}

module.exports = { dashboardStats, dashboardSales, salesReport, inventoryReport, lowStockFilter, outOfStockFilter };
