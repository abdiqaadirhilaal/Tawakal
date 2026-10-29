const Product = require('../models/Product');
const InventoryMovement = require('../models/InventoryMovement');
const AppError = require('../utils/AppError');
const { round3 } = require('../utils/helpers');

/**
 * Wuxuu beddelaa kaydka alaab isagoo isticmaalaya hal update oo atomic ah, kadibna
 * diiwaangeliya dhaqdhaqaaqa. Kaydku weligiis ma noqon karo wax ka yar 0: marka la
 * dhimayo, shuruudda { stock: { $gte: tirada } } ayaa ku jirta isla update-ka, sidaas
 * darteed laba codsi oo isku mar yimid midkood uun baa guuleysanaya.
 */
async function changeStock({
  productId,
  delta,
  type,
  reason = '',
  userId = null,
  refType = null,
  refId = null,
  refLabel = '',
  unitCost = null,
  supplier = '',
  idempotencyKey,
  setCostPrice,
}) {
  if (!Number.isFinite(delta) || delta === 0) throw new AppError(400, 'Isbeddelka kaydku sax ma aha');

  const filter = { _id: productId };
  if (delta < 0) filter.stock = { $gte: -delta };
  const update = { $inc: { stock: delta } };
  if (setCostPrice !== undefined) update.$set = { costPrice: setCostPrice };

  const before = await Product.findOneAndUpdate(filter, update, { new: false });
  if (!before) {
    const exists = await Product.findById(productId).select('stock name');
    if (!exists) throw new AppError(404, 'Alaabta lama helin');
    throw new AppError(409, `Kaydku kuma filna. Hadda waxaa jira ${exists.stock}.`, [
      { field: 'quantityChange', code: 'insufficient_stock', available: exists.stock },
    ]);
  }

  const doc = {
    product: before._id,
    type,
    quantityChange: delta,
    stockBefore: before.stock,
    stockAfter: round3(before.stock + delta),
    reason,
    unitCost,
    supplier,
    refType,
    refId,
    refLabel,
    user: userId,
  };
  if (idempotencyKey) doc.idempotencyKey = idempotencyKey;

  try {
    const movement = await InventoryMovement.create(doc);
    return { movement, stockBefore: doc.stockBefore, stockAfter: doc.stockAfter };
  } catch (err) {
    // Dhaqdhaqaaqa lama kaydin karin (tusaale codsi labo-jibbaarmay): dib u celi kaydka.
    const revert = { $inc: { stock: -delta } };
    if (setCostPrice !== undefined) revert.$set = { costPrice: before.costPrice };
    await Product.updateOne({ _id: before._id }, revert);
    throw err;
  }
}

/**
 * Wuxuu fuliyaa hawl kayd oo leh idempotencyKey. Haddii furahaas hore loo isticmaalay
 * wuxuu soo celinayaa dhaqdhaqaaqii hore isagoon kaydka mar labaad taaban.
 */
async function changeStockOnce(args) {
  const existing = await InventoryMovement.findOne({ idempotencyKey: args.idempotencyKey });
  if (existing) return { movement: existing, duplicate: true };
  try {
    const result = await changeStock(args);
    return { ...result, duplicate: false };
  } catch (err) {
    const dup = await InventoryMovement.findOne({ idempotencyKey: args.idempotencyKey });
    if (dup) return { movement: dup, duplicate: true };
    throw err;
  }
}

module.exports = { changeStock, changeStockOnce };
