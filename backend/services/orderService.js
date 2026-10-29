const env = require('../config/env');
const { ORDER_TRANSITIONS } = require('../config/constants');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Counter = require('../models/Counter');
const InventoryMovement = require('../models/InventoryMovement');
const CompanySettings = require('../models/CompanySettings');
const AppError = require('../utils/AppError');
const { round2, round3, phoneDigits } = require('../utils/helpers');
const { todayInTz } = require('../utils/dates');
const { changeStock } = require('./inventoryService');

async function nextOrderNumber() {
  const day = todayInTz(env.REPORT_TIMEZONE).replace(/-/g, '').slice(2); // YYMMDD
  const seq = await Counter.next(`order-${day}`);
  return `TWK-${day}-${String(seq).padStart(4, '0')}`;
}

function computeDeliveryFee(settings, fulfillmentMethod, subtotal) {
  if (fulfillmentMethod !== 'delivery') return 0;
  const fee = Number(settings.deliveryFee) || 0;
  const threshold = Number(settings.freeDeliveryThreshold) || 0;
  if (threshold > 0 && subtotal >= threshold) return 0;
  return round2(fee);
}

// Xisaabinta wadarta: kaliya qiimaha database-ka ayaa la isticmaalaa.
function computeTotals(lines, settings, fulfillmentMethod) {
  const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));
  const deliveryFee = computeDeliveryFee(settings, fulfillmentMethod, subtotal);
  return { subtotal, deliveryFee, total: round2(subtotal + deliveryFee) };
}

async function rollbackStock(deducted) {
  for (const d of deducted) {
    await Product.updateOne({ _id: d.line.product }, { $inc: { stock: d.line.quantity } });
  }
}

async function createOrder(input) {
  // 1) Isla codsigii haddii mar labaad la soo diray, soo celi dalabkii hore.
  const existing = await Order.findOne({ idempotencyKey: input.idempotencyKey });
  if (existing) return { order: existing, duplicate: true };

  const settings = await CompanySettings.getSingleton();
  const method = settings.paymentMethods.find((m) => m.enabled && m.code === input.paymentMethod);
  if (!method) {
    throw new AppError(400, 'Habka lacag bixinta ee la doortay lama oggola', [
      { field: 'paymentMethod', message: 'Dooro hab lacag bixin oo shaqeynaya' },
    ]);
  }

  // 2) Ka soo qaad alaabta database-ka oo hubi mid kasta.
  const products = await Product.find({ _id: { $in: input.items.map((i) => i.productId) } }).populate('category', 'name');
  const byId = new Map(products.map((p) => [p._id.toString(), p]));

  const problems = [];
  const lines = [];
  input.items.forEach((item, idx) => {
    const p = byId.get(item.productId);
    const field = `items.${idx}`;
    if (!p || !p.isActive || p.isArchived) {
      problems.push({ field, productId: item.productId, code: 'unavailable', message: `${p ? p.name : 'Alaab'} hadda lama heli karo` });
      return;
    }
    const qty = item.quantity;
    const validQty = p.allowDecimal ? round3(qty) === qty : Number.isInteger(qty);
    if (!validQty) {
      problems.push({ field, productId: item.productId, code: 'invalid_quantity', message: `Tirada "${p.name}" sax ma aha` });
      return;
    }
    if (p.stock < qty) {
      problems.push({
        field,
        productId: item.productId,
        code: 'insufficient_stock',
        available: p.stock,
        message: `"${p.name}": kaydka ayaa ka yar tirada aad codsatay (waxaa jira ${p.stock})`,
      });
      return;
    }
    lines.push({
      product: p._id,
      name: p.name,
      sku: p.sku,
      unit: p.unit,
      categoryName: p.category ? p.category.name : '',
      quantity: qty,
      price: p.price,
      costPrice: p.costPrice || 0,
      lineTotal: round2(p.price * qty),
    });
  });

  if (problems.length) {
    const onlyInvalid = problems.every((x) => x.code === 'invalid_quantity');
    throw new AppError(onlyInvalid ? 400 : 409, 'Dalabka lama dhammaystiri karo. Fadlan dib u eeg dambiisha.', problems);
  }

  const totals = computeTotals(lines, settings, input.fulfillmentMethod);

  // 3) Ka dhim kaydka si atomic ah, kadibna kaydi dalabka. Haddii tallaabo kasta
  //    fashilanto, wixii la dhimay dib ayaa loo celinayaa, dalabna lama abuurayo.
  const deducted = [];
  let order;
  try {
    for (const line of lines) {
      const before = await Product.findOneAndUpdate(
        { _id: line.product, isActive: true, isArchived: false, stock: { $gte: line.quantity } },
        { $inc: { stock: -line.quantity } },
        { new: false }
      );
      if (!before) {
        throw new AppError(409, 'Dalabka lama dhammaystiri karo. Fadlan dib u eeg dambiisha.', [
          { productId: line.product.toString(), code: 'insufficient_stock', message: `"${line.name}": kaydku hadda kuma filna` },
        ]);
      }
      deducted.push({ line, stockBefore: before.stock });
    }

    order = await Order.create({
      orderNumber: await nextOrderNumber(),
      idempotencyKey: input.idempotencyKey,
      customer: {
        name: input.customer.name,
        phone: input.customer.phone,
        phoneKey: phoneDigits(input.customer.phone).slice(-9),
        email: input.customer.email || '',
      },
      fulfillmentMethod: input.fulfillmentMethod,
      deliveryAddress: input.fulfillmentMethod === 'delivery' ? input.deliveryAddress : { address: '', district: '' },
      items: lines,
      ...totals,
      currency: settings.currency,
      paymentMethod: { code: method.code, label: method.label },
      paymentStatus: 'unpaid',
      orderStatus: 'pending',
      statusHistory: [{ status: 'pending', at: new Date(), by: null }],
      customerNotes: input.customerNotes || '',
    });
  } catch (err) {
    await rollbackStock(deducted);
    // Haddii isla codsigan (isla idempotencyKey) uu isla markaas dalab abuuray, kaas soo celi.
    const dup = await Order.findOne({ idempotencyKey: input.idempotencyKey });
    if (dup) return { order: dup, duplicate: true };
    throw err;
  }

  // 4) Diiwaangeli dhaqdhaqaaqa kaydka.
  try {
    await InventoryMovement.insertMany(
      deducted.map((d) => ({
        product: d.line.product,
        type: 'sale',
        quantityChange: -d.line.quantity,
        stockBefore: d.stockBefore,
        stockAfter: round3(d.stockBefore - d.line.quantity),
        reason: `Dalab ${order.orderNumber}`,
        refType: 'order',
        refId: order._id,
        refLabel: order.orderNumber,
      }))
    );
  } catch (err) {
    console.error('[inventory] dhaqdhaqaaqa dalabka lama kaydin karin', order.orderNumber, err);
  }

  return { order, duplicate: false };
}

function assertTransition(order, next) {
  const current = order.orderStatus;
  if (current === next) throw new AppError(409, 'Dalabku horeba xaaladdan ayuu ku jiraa');
  if (!ORDER_TRANSITIONS[current].includes(next)) {
    throw new AppError(409, `Dalabka lagama beddeli karo "${current}" loona beddeli karo "${next}"`);
  }
  if (next === 'ready_for_pickup' && order.fulfillmentMethod !== 'pickup') {
    throw new AppError(409, 'Dalabkani waa gaarsiin, ma aha mid bakhaarka laga qaadanayo');
  }
  if (next === 'out_for_delivery' && order.fulfillmentMethod !== 'delivery') {
    throw new AppError(409, 'Dalabkani waa mid bakhaarka laga qaadanayo, ma aha gaarsiin');
  }
}

async function updateOrderStatus(orderId, next, user) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError(404, 'Dalabka lama helin');
  assertTransition(order, next);

  const set = { orderStatus: next };
  if (next === 'delivered') set.deliveredAt = new Date();
  if (next === 'cancelled') set.stockRestored = true;

  // Shuruudda orderStatus-ka hore waxay hubisaa in laba qof aysan isku mar beddelin
  // (sidaas darteed kaydka hal mar uun baa la soo celinayaa marka la joojiyo).
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, orderStatus: order.orderStatus },
    { $set: set, $push: { statusHistory: { status: next, at: new Date(), by: user._id } } },
    { new: true }
  );
  if (!updated) throw new AppError(409, 'Dalabka qof kale ayaa hadda beddelay. Fadlan dib u cusboonaysii bogga.');

  if (next === 'cancelled') {
    for (const item of updated.items) {
      try {
        await changeStock({
          productId: item.product,
          delta: item.quantity,
          type: 'cancellation_restore',
          reason: `Dalab la joojiyey ${updated.orderNumber}`,
          userId: user._id,
          refType: 'order',
          refId: updated._id,
          refLabel: updated.orderNumber,
        });
      } catch (err) {
        console.error('[inventory] kaydka lama soo celin karin', updated.orderNumber, item.sku, err.message);
      }
    }
  }
  return updated;
}

async function updatePaymentStatus(orderId, paymentStatus) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError(404, 'Dalabka lama helin');
  if (order.orderStatus === 'cancelled' && paymentStatus === 'paid') {
    throw new AppError(409, 'Dalab la joojiyey lama calaamadin karo in la bixiyey');
  }
  order.paymentStatus = paymentStatus;
  await order.save();
  return order;
}

module.exports = { createOrder, computeTotals, computeDeliveryFee, updateOrderStatus, updatePaymentStatus, assertTransition, nextOrderNumber };
