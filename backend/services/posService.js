const env = require('../config/env');
const { SUPERVISOR_ROLES } = require('../config/constants');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Refund = require('../models/Refund');
const Counter = require('../models/Counter');
const InventoryMovement = require('../models/InventoryMovement');
const CompanySettings = require('../models/CompanySettings');
const AppError = require('../utils/AppError');
const { round2, round3 } = require('../utils/helpers');
const { todayInTz } = require('../utils/dates');
const { changeStock } = require('./inventoryService');
const { verifyCredentials } = require('./authService');
const { getOpenShift } = require('./shiftService');
const { audit } = require('./auditService');

const isSupervisor = (user) => SUPERVISOR_ROLES.includes(user.role);
const dayStamp = () => todayInTz(env.REPORT_TIMEZONE).replace(/-/g, '').slice(2);

async function nextSaleNumbers() {
  const day = dayStamp();
  const [saleSeq, receiptSeq] = await Promise.all([Counter.next(`sale-${day}`), Counter.next('receipt')]);
  return {
    saleNumber: `S-${day}-${String(saleSeq).padStart(4, '0')}`,
    receiptNumber: `R-${String(receiptSeq).padStart(6, '0')}`,
  };
}

async function nextRefundNumber() {
  const day = dayStamp();
  return `RF-${day}-${String(await Counter.next(`refund-${day}`)).padStart(4, '0')}`;
}

// Wuxuu hubiyaa in qofka oggolaanaya uu yahay maamule ama manager firfircoon.
async function verifyApprover(approval) {
  const approver = await verifyCredentials(approval.email, approval.password);
  if (!isSupervisor(approver)) throw new AppError(403, 'Qofkani awood uma laha in uu oggolaado hawshan');
  return approver;
}

/**
 * Xisaabinta qiimo-dhimista (pure). Wuxuu soo celiyaa { amount, percent }.
 * Qiimo-dhimistu weligeed kama badnaan karto wadarta alaabta, sidaas darteed wadarta guud
 * ma noqon karto taban.
 */
function computeDiscount(subtotal, discount) {
  if (!discount || subtotal <= 0) return { amount: 0, percent: 0 };
  let amount = discount.kind === 'percent' ? round2((subtotal * discount.value) / 100) : round2(discount.value);
  if (amount > subtotal) amount = subtotal;
  if (amount < 0) amount = 0;
  // Boqolleyda siyaasadda lagu hubiyo: tan la codsaday (percent) ama tan dhabta ah (amount).
  const percent = discount.kind === 'percent' ? Math.min(discount.value, 100) : round2((amount / subtotal) * 100);
  return { amount, percent };
}

// Qiimo-dhimista iibka waxaa loo qaybiyaa safafka si celinta dambe ay u noqoto mid sax ah.
function allocateDiscount(lines, discountAmount, subtotal) {
  let remaining = discountAmount;
  return lines.map((line, idx) => {
    let share = 0;
    if (discountAmount > 0 && subtotal > 0) {
      share = idx === lines.length - 1 ? round2(remaining) : round2((discountAmount * line.lineTotal) / subtotal);
      if (share > line.lineTotal) share = line.lineTotal;
      if (share > remaining) share = round2(remaining);
      remaining = round2(remaining - share);
    }
    return { ...line, discountShare: share, netTotal: round2(line.lineTotal - share) };
  });
}

/**
 * Siyaasadda qiimo-dhimista:
 *  - kaashiye: ilaa cashierMaxDiscountPercent isagoon oggolaansho u baahnayn
 *  - ka badan taas: wuxuu u baahan yahay oggolaansho maamule/manager
 *  - qofna kama gudbi karo maxDiscountPercent
 */
async function authorizeDiscount({ percent, policy, user, approval }) {
  if (percent <= 0) return null;
  if (!policy.discountsEnabled) throw new AppError(403, 'Qiimo-dhimistu waa dansan tahay');
  if (percent > policy.maxDiscountPercent + 1e-9) {
    throw new AppError(400, `Qiimo-dhimistu kama badnaan karto ${policy.maxDiscountPercent}%`, [
      { field: 'discount.value', code: 'discount_over_max', message: `Ugu badnaan ${policy.maxDiscountPercent}%` },
    ]);
  }
  if (isSupervisor(user) || percent <= policy.cashierMaxDiscountPercent + 1e-9) return null;
  if (!approval) {
    throw new AppError(403, `Qiimo-dhimis ka badan ${policy.cashierMaxDiscountPercent}% waxay u baahan tahay oggolaansho maamule`, [
      { field: 'approval', code: 'approval_required', message: 'Oggolaansho maamule ama manager ayaa loo baahan yahay' },
    ]);
  }
  return verifyApprover(approval);
}

async function rollbackStock(deducted) {
  for (const d of deducted) {
    await Product.updateOne({ _id: d.line.product }, { $inc: { stock: d.line.quantity } });
  }
}

async function createSale(input, user) {
  // 1) Isla codsiga oo mar labaad la soo diray: soo celi iibkii hore.
  const existing = await Sale.findOne({ idempotencyKey: input.idempotencyKey });
  if (existing) {
    if (!existing.cashier.equals(user._id)) throw new AppError(409, 'Furahan codsiga hore ayaa loo isticmaalay');
    return { sale: existing, duplicate: true };
  }

  const settings = await CompanySettings.getSingleton();
  const policy = settings.pos;

  // 2) Shift
  const shift = await getOpenShift(user._id);
  if (!shift && policy.requireOpenShift) {
    throw new AppError(409, 'Marka hore fur shift si aad wax u iibiso', [{ field: 'shift', code: 'no_open_shift', message: 'Shift furan ma jiro' }]);
  }

  // 3) Habka lacag bixinta
  const method = policy.paymentMethods.find((m) => m.enabled && m.code === input.payment.method);
  if (!method) {
    throw new AppError(400, 'Habka lacag bixinta ee la doortay lama oggola', [{ field: 'payment.method', message: 'Dooro hab shaqeynaya' }]);
  }

  // 4) Alaabta: qiimaha iyo halbeegga waxaa laga soo qaadaa database-ka.
  const products = await Product.find({ _id: { $in: input.items.map((i) => i.productId) } }).populate('category', 'name');
  const byId = new Map(products.map((p) => [p._id.toString(), p]));
  const problems = [];
  let lines = [];
  input.items.forEach((item, idx) => {
    const p = byId.get(item.productId);
    const field = `items.${idx}`;
    if (!p || !p.isActive || p.isArchived) {
      problems.push({ field, productId: item.productId, code: 'unavailable', message: `${p ? p.name : 'Alaab'} hadda lama iibin karo` });
      return;
    }
    const qty = item.quantity;
    const validQty = p.allowDecimal ? round3(qty) === qty : Number.isInteger(qty);
    if (!validQty) {
      problems.push({ field, productId: item.productId, code: 'invalid_quantity', message: `"${p.name}" waxaa lagu iibiyaa tiro dhan` });
      return;
    }
    if (p.stock < qty) {
      problems.push({ field, productId: item.productId, code: 'insufficient_stock', available: p.stock, message: `"${p.name}": kaydku kuma filna (waxaa jira ${p.stock})` });
      return;
    }
    lines.push({
      product: p._id,
      sku: p.sku,
      name: p.name,
      unit: p.unit,
      categoryName: p.category ? p.category.name : '',
      quantity: qty,
      unitPrice: p.price,
      costPrice: p.costPrice || 0,
      lineTotal: round2(p.price * qty),
    });
  });
  if (problems.length) {
    const onlyInvalid = problems.every((x) => x.code === 'invalid_quantity');
    if (!onlyInvalid) await audit(user, 'sale.failed', { resourceType: 'Sale', metadata: { reason: 'stock_or_availability', problems: problems.map((x) => ({ productId: x.productId, code: x.code })) } });
    throw new AppError(onlyInvalid ? 400 : 409, 'Iibka lama dhammaystiri karo. Dib u eeg dambiisha.', problems);
  }

  // 5) Wadarta iyo qiimo-dhimista
  const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));
  const disc = computeDiscount(subtotal, input.discount);
  const approver = await authorizeDiscount({ percent: disc.percent, policy, user, approval: input.approval });
  lines = allocateDiscount(lines, disc.amount, subtotal);
  const grandTotal = round2(subtotal - disc.amount);

  // 6) Lacag bixinta
  let amountReceived = grandTotal;
  let changeGiven = 0;
  if (method.type === 'cash') {
    if (input.payment.amountReceived === undefined) {
      throw new AppError(400, 'Geli lacagta la helay', [{ field: 'payment.amountReceived', message: 'Waa lagama maarmaan lacagta caddaanka ah' }]);
    }
    amountReceived = round2(input.payment.amountReceived);
    if (amountReceived < grandTotal) {
      throw new AppError(400, 'Lacagta la helay way ka yar tahay wadarta', [
        { field: 'payment.amountReceived', code: 'insufficient_payment', message: `Ugu yaraan ${grandTotal.toFixed(2)}` },
      ]);
    }
    changeGiven = round2(amountReceived - grandTotal);
  }

  // 7) Ka dhim kaydka si atomic ah, kadibna kaydi iibka. Haddii tallaabo fashilanto,
  //    wixii la dhimay dib ayaa loo celinayaa, iibna lama abuurayo.
  const deducted = [];
  let sale;
  try {
    for (const line of lines) {
      const before = await Product.findOneAndUpdate(
        { _id: line.product, isActive: true, isArchived: false, stock: { $gte: line.quantity } },
        { $inc: { stock: -line.quantity } },
        { new: false }
      );
      if (!before) {
        throw new AppError(409, 'Iibka lama dhammaystiri karo. Dib u eeg dambiisha.', [
          { productId: line.product.toString(), code: 'insufficient_stock', message: `"${line.name}": kaydku hadda kuma filna` },
        ]);
      }
      deducted.push({ line, stockBefore: before.stock });
    }

    const numbers = await nextSaleNumbers();
    const now = new Date();
    sale = await Sale.create({
      ...numbers,
      cashier: user._id,
      cashierName: user.name,
      shift: shift ? shift._id : null,
      customerNameSnapshot: input.customerName || '',
      customerPhoneSnapshot: input.customerPhone || '',
      items: lines,
      subtotal,
      totalDiscount: disc.amount,
      grandTotal,
      currency: settings.currency,
      discount: disc.amount > 0
        ? {
            kind: input.discount.kind,
            value: input.discount.value,
            percent: disc.percent,
            appliedBy: user._id,
            approvedBy: approver ? approver._id : null,
            approvedByName: approver ? approver.name : '',
          }
        : { kind: 'none' },
      paymentMethod: { code: method.code, label: method.label, type: method.type },
      payments: [{ code: method.code, label: method.label, type: method.type, amount: grandTotal, reference: input.payment.reference || '' }],
      paymentStatus: 'paid',
      paymentVerification: method.type === 'cash' ? 'cash' : 'recorded_unverified',
      amountReceived,
      changeGiven,
      paymentReference: method.type === 'cash' ? '' : input.payment.reference || '',
      status: 'completed',
      idempotencyKey: input.idempotencyKey,
      completedAt: now,
    });
  } catch (err) {
    await rollbackStock(deducted);
    const dup = await Sale.findOne({ idempotencyKey: input.idempotencyKey });
    if (dup && dup.cashier.equals(user._id)) return { sale: dup, duplicate: true };
    if (err.statusCode === 409) await audit(user, 'sale.failed', { resourceType: 'Sale', metadata: { reason: 'stock_changed_during_sale' } });
    throw err;
  }

  // 8) Dhaqdhaqaaqa kaydka
  try {
    await InventoryMovement.insertMany(
      deducted.map((d) => ({
        product: d.line.product,
        type: 'pos_sale',
        quantityChange: -d.line.quantity,
        stockBefore: d.stockBefore,
        stockAfter: round3(d.stockBefore - d.line.quantity),
        reason: `Iib POS ${sale.saleNumber}`,
        refType: 'sale',
        refId: sale._id,
        refLabel: sale.receiptNumber,
        user: user._id,
      }))
    );
  } catch (err) {
    console.error('[inventory] dhaqdhaqaaqa iibka lama kaydin karin', sale.saleNumber, err);
  }

  await audit(user, 'sale.completed', {
    resourceType: 'Sale',
    resourceId: sale._id,
    resourceLabel: sale.receiptNumber,
    metadata: { grandTotal, discount: disc.amount, method: method.code },
  });
  if (approver) {
    await audit(approver, 'sale.discount_approved', {
      resourceType: 'Sale',
      resourceId: sale._id,
      resourceLabel: sale.receiptNumber,
      metadata: { percent: disc.percent, amount: disc.amount, cashier: user.name },
    });
  }
  return { sale, duplicate: false };
}

/**
 * Celin (refund / return) ku saabsan iib hore.
 *  - manager/admin: si toos ah. Kaashiye: iibkiisa oo kaliya + oggolaansho maamule.
 *  - Lama celin karo wax ka badan intii la iibiyey (tiro iyo lacag).
 *  - Kaydka waxaa lagu daraa kaliya alaabta "restock: true" (gacanta lagu soo celiyey, la iibin karo).
 *  - Iibka asalka ah lama tirtiro; xaaladdiisa ayaa isbeddesha.
 */
async function createRefund({ saleId, input, user }) {
  const existing = await Refund.findOne({ idempotencyKey: input.idempotencyKey });
  if (existing) {
    if (!existing.sale.equals(saleId)) throw new AppError(409, 'Furahan codsiga hore ayaa loo isticmaalay');
    return { refund: existing, duplicate: true };
  }

  const sale = await Sale.findById(saleId);
  if (!sale) throw new AppError(404, 'Iibka lama helin');
  if (!isSupervisor(user) && !sale.cashier.equals(user._id)) throw new AppError(404, 'Iibka lama helin');
  if (sale.status === 'refunded') throw new AppError(409, 'Iibkan hore ayaa si buuxda loo celiyey');

  let approver = null;
  if (!isSupervisor(user)) {
    if (!input.approval) {
      throw new AppError(403, 'Celintu waxay u baahan tahay oggolaansho maamule', [
        { field: 'approval', code: 'approval_required', message: 'Oggolaansho maamule ama manager ayaa loo baahan yahay' },
      ]);
    }
    approver = await verifyApprover(input.approval);
  }

  const settings = await CompanySettings.getSingleton();
  const methodCode = input.method || sale.paymentMethod.code;
  const method = settings.pos.paymentMethods.find((m) => m.enabled && m.code === methodCode);
  if (!method) throw new AppError(400, 'Habka celinta lama oggola', [{ field: 'method', message: 'Dooro hab shaqeynaya' }]);

  // Celinta caddaanka ah waxay ka baxdaa khasnadda qofka fulinaya, sidaas darteed shift furan ayuu u baahan yahay.
  const shift = await getOpenShift(user._id);
  if (method.type === 'cash' && !shift) {
    throw new AppError(409, 'Celinta lacagta caddaanka ah waxay u baahan tahay shift furan (khasnadda lacagtu ka baxayso)', [
      { field: 'shift', code: 'no_open_shift', message: 'Shift furan ma jiro' },
    ]);
  }

  const items = sale.items.map((i) => i.toObject());
  const refundItems = [];
  const problems = [];
  input.items.forEach((req, idx) => {
    const item = items.find((i) => i.product.toString() === req.productId);
    const field = `items.${idx}`;
    if (!item) {
      problems.push({ field, code: 'not_in_sale', message: 'Alaabtani kuma jirto iibkan' });
      return;
    }
    const remaining = round3(item.quantity - item.refundedQuantity);
    const validQty = Number.isInteger(item.quantity) ? Number.isInteger(req.quantity) : round3(req.quantity) === req.quantity;
    if (!validQty) {
      problems.push({ field, code: 'invalid_quantity', message: `"${item.name}": tirada sax ma aha` });
      return;
    }
    if (req.quantity > remaining) {
      problems.push({ field, code: 'over_refund', available: remaining, message: `"${item.name}": waxaa la celin karaa ugu badnaan ${remaining}` });
      return;
    }
    // Marka tirada hartay oo dhan la celinayo, lacagta hartay oo dhan ayaa la bixiyaa (si wareejinta jajabku isu dheellitirto).
    const amount = req.quantity === remaining ? round2(item.netTotal - item.refundedAmount) : round2((item.netTotal * req.quantity) / item.quantity);
    item.refundedQuantity = round3(item.refundedQuantity + req.quantity);
    item.refundedAmount = round2(item.refundedAmount + amount);
    refundItems.push({ product: item.product, sku: item.sku, name: item.name, unit: item.unit, quantity: req.quantity, amount, restocked: req.restock });
  });
  if (problems.length) throw new AppError(problems.some((x) => x.code === 'over_refund') ? 409 : 400, 'Celinta lama fulin karo', problems);

  const amount = round2(refundItems.reduce((sum, i) => sum + i.amount, 0));
  const refundedAmount = round2(sale.refundedAmount + amount);
  if (refundedAmount > sale.grandTotal + 0.001) throw new AppError(409, 'Lacagta la celinayo way ka badan tahay wadarta iibka');
  const fully = items.every((i) => round3(i.quantity - i.refundedQuantity) <= 0);
  const status = fully ? 'refunded' : 'partially_refunded';

  // Shuruudda refundVersion: laba celin oo isku mar ah midkood uun baa guuleysanaya.
  const updated = await Sale.findOneAndUpdate(
    { _id: sale._id, refundVersion: sale.refundVersion },
    { $set: { items, refundedAmount, status, paymentStatus: status }, $inc: { refundVersion: 1 } },
    { new: true }
  );
  if (!updated) throw new AppError(409, 'Iibkan hadda ayaa la beddelay. Dib u cusboonaysii oo mar kale isku day.');

  let refund;
  try {
    refund = await Refund.create({
      refundNumber: await nextRefundNumber(),
      sale: sale._id,
      saleNumber: sale.saleNumber,
      receiptNumber: sale.receiptNumber,
      items: refundItems,
      amount,
      currency: sale.currency,
      reason: input.reason,
      method: { code: method.code, label: method.label, type: method.type },
      processedBy: user._id,
      processedByName: user.name,
      approvedBy: approver ? approver._id : null,
      approvedByName: approver ? approver.name : '',
      shift: shift ? shift._id : null,
      inventoryRestocked: refundItems.some((i) => i.restocked),
      idempotencyKey: input.idempotencyKey,
    });
  } catch (err) {
    // Diiwaanka celinta lama kaydin karin: iibka ku celi xaaladdiisii hore.
    await Sale.updateOne(
      { _id: sale._id, refundVersion: updated.refundVersion },
      {
        $set: { items: sale.items.map((i) => i.toObject()), refundedAmount: sale.refundedAmount, status: sale.status, paymentStatus: sale.paymentStatus },
        $inc: { refundVersion: 1 },
      }
    );
    const dup = await Refund.findOne({ idempotencyKey: input.idempotencyKey });
    if (dup) return { refund: dup, duplicate: true };
    throw err;
  }

  for (const item of refundItems.filter((i) => i.restocked)) {
    try {
      await changeStock({
        productId: item.product,
        delta: item.quantity,
        type: 'refund_restock',
        reason: `Celin ${refund.refundNumber} (${sale.receiptNumber})`,
        userId: user._id,
        refType: 'refund',
        refId: refund._id,
        refLabel: refund.refundNumber,
      });
    } catch (err) {
      console.error('[inventory] kaydka celinta lama dari karin', refund.refundNumber, item.sku, err.message);
    }
  }

  await audit(user, 'refund.created', {
    resourceType: 'Refund',
    resourceId: refund._id,
    resourceLabel: refund.refundNumber,
    metadata: { sale: sale.receiptNumber, amount, method: method.code, reason: input.reason, approvedBy: approver ? approver.name : null },
  });
  return { refund, sale: updated, duplicate: false };
}

module.exports = { createSale, createRefund, computeDiscount, allocateDiscount, isSupervisor };
