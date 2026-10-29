const CashierShift = require('../models/CashierShift');
const Sale = require('../models/Sale');
const Refund = require('../models/Refund');
const AppError = require('../utils/AppError');
const { round2 } = require('../utils/helpers');
const { audit } = require('./auditService');

const getOpenShift = (userId) => CashierShift.findOne({ cashier: userId, status: 'open' });

async function openShift(user, openingCash) {
  try {
    const shift = await CashierShift.create({
      cashier: user._id,
      cashierName: user.name,
      openedAt: new Date(),
      openingCash: round2(openingCash),
    });
    await audit(user, 'shift.opened', { resourceType: 'CashierShift', resourceId: shift._id, metadata: { openingCash: shift.openingCash } });
    return shift;
  } catch (err) {
    if (err.code === 11000) throw new AppError(409, 'Shift furan ayaad hore u leedahay. Marka hore xir.');
    throw err;
  }
}

const emptyBucket = () => ({ count: 0, total: 0 });

/*
 * Koobitaanka shift-ka.
 *
 *   Lacagta caddaanka ah ee la filayo =
 *       lacagta furitaanka
 *     + iibka caddaanka ah (wadarta iibka; lacagta la helay oo laga jaray baaqiga la celiyey)
 *     - celinta caddaanka ah ee shift-kan laga bixiyey
 *     + hagaajinta la diiwaangeliyey (+/-)
 *
 * Mobile money iyo xawaaladaha bangigu kuma jiraan lacagta caddaanka ah.
 */
async function computeSummary(shift) {
  const [salesRows, refundRows] = await Promise.all([
    Sale.aggregate([
      { $match: { shift: shift._id } },
      { $group: { _id: '$paymentMethod.type', count: { $sum: 1 }, total: { $sum: '$grandTotal' }, discount: { $sum: '$totalDiscount' } } },
    ]),
    Refund.aggregate([
      { $match: { shift: shift._id } },
      { $group: { _id: '$method.type', count: { $sum: 1 }, total: { $sum: '$amount' } } },
    ]),
  ]);

  const sales = { cash: emptyBucket(), mobile_money: emptyBucket(), bank_transfer: emptyBucket(), other: emptyBucket() };
  let salesCount = 0;
  let salesTotal = 0;
  let discountTotal = 0;
  salesRows.forEach((r) => {
    sales[r._id] = { count: r.count, total: round2(r.total) };
    salesCount += r.count;
    salesTotal += r.total;
    discountTotal += r.discount;
  });

  let refundsCount = 0;
  let refundsTotal = 0;
  let cashRefunds = 0;
  refundRows.forEach((r) => {
    refundsCount += r.count;
    refundsTotal += r.total;
    if (r._id === 'cash') cashRefunds += r.total;
  });

  const adjustmentsTotal = shift.adjustments.reduce((sum, a) => sum + a.amount, 0);
  const expectedClosingCash = round2(shift.openingCash + sales.cash.total - cashRefunds + adjustmentsTotal);

  return {
    salesCount,
    salesTotal: round2(salesTotal),
    discountTotal: round2(discountTotal),
    cashSales: sales.cash.total,
    mobileMoneySales: sales.mobile_money.total,
    bankTransferSales: sales.bank_transfer.total,
    otherSales: sales.other.total,
    byType: sales,
    refundsCount,
    refundsTotal: round2(refundsTotal),
    cashRefunds: round2(cashRefunds),
    adjustmentsTotal: round2(adjustmentsTotal),
    openingCash: shift.openingCash,
    expectedClosingCash,
  };
}

async function closeShift({ shift, actualClosingCash, closingNotes, user }) {
  const summary = await computeSummary(shift);
  const actual = round2(actualClosingCash);
  const variance = round2(actual - summary.expectedClosingCash);

  // Shuruudda status:'open' waxay hubisaa in shift-ka hal mar uun la xiro.
  const closed = await CashierShift.findOneAndUpdate(
    { _id: shift._id, status: 'open' },
    {
      $set: {
        status: 'closed',
        closedAt: new Date(),
        expectedClosingCash: summary.expectedClosingCash,
        actualClosingCash: actual,
        cashVariance: variance,
        closingNotes,
        closedBy: user._id,
        closedByName: user.name,
        totals: summary,
      },
    },
    { new: true }
  );
  if (!closed) throw new AppError(409, 'Shift-kan hore ayaa loo xiray');

  await audit(user, 'shift.closed', {
    resourceType: 'CashierShift',
    resourceId: closed._id,
    metadata: { expected: summary.expectedClosingCash, actual, variance, cashier: closed.cashierName },
  });
  return closed;
}

async function addAdjustment({ shiftId, amount, reason, user }) {
  const shift = await CashierShift.findOneAndUpdate(
    { _id: shiftId, status: 'open' },
    { $push: { adjustments: { amount: round2(amount), reason, by: user._id, byName: user.name, at: new Date() } } },
    { new: true }
  );
  if (!shift) {
    const exists = await CashierShift.exists({ _id: shiftId });
    throw new AppError(exists ? 409 : 404, exists ? 'Shift la xiray lama hagaajin karo' : 'Shift-ka lama helin');
  }
  await audit(user, 'shift.cash_adjustment', {
    resourceType: 'CashierShift',
    resourceId: shift._id,
    metadata: { amount: round2(amount), reason, cashier: shift.cashierName },
  });
  return shift;
}

module.exports = { getOpenShift, openShift, computeSummary, closeShift, addAdjustment };
