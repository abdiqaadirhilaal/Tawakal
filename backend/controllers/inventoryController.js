const env = require('../config/env');
const Product = require('../models/Product');
const InventoryMovement = require('../models/InventoryMovement');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paginate } = require('../utils/respond');
const { escapeRegex } = require('../utils/helpers');
const { rangeToUtc } = require('../utils/dates');
const { adminProduct, movement: serializeMovement } = require('../utils/serializers');
const { changeStockOnce } = require('../services/inventoryService');
const { lowStockFilter, outOfStockFilter } = require('../services/reportService');

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, search, filter: which } = req.valid.query;
  let filter = { isArchived: false };
  if (which === 'low') filter = lowStockFilter();
  if (which === 'out') filter = outOfStockFilter();
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { sku: rx }];
  }
  const [items, total, low, out] = await Promise.all([
    Product.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).populate('category', 'name slug'),
    Product.countDocuments(filter),
    Product.countDocuments(lowStockFilter()),
    Product.countDocuments(outOfStockFilter()),
  ]);
  ok(res, {
    data: { items: items.map((p) => adminProduct(p, req.user)), alerts: { lowStock: low, outOfStock: out } },
    pagination: paginate(page, limit, total),
  });
});

exports.movements = asyncHandler(async (req, res) => {
  const { page, limit, product, type, from, to } = req.valid.query;
  const filter = {};
  if (product) filter.product = product;
  if (type !== 'all') filter.type = type;
  const range = rangeToUtc(from, to, env.REPORT_TIMEZONE);
  if (Object.keys(range).length) filter.createdAt = range;

  const [rows, total] = await Promise.all([
    InventoryMovement.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('product', 'name sku unit')
      .populate('user', 'name'),
    InventoryMovement.countDocuments(filter),
  ]);
  const includeCost = req.user.role === 'admin';
  ok(res, {
    data: rows.map((m) => {
      const out = serializeMovement(m);
      if (!includeCost) delete out.unitCost;
      return out;
    }),
    pagination: paginate(page, limit, total),
  });
});

async function loadProduct(id) {
  const product = await Product.findById(id);
  if (!product || product.isArchived) throw new AppError(404, 'Alaabta lama helin');
  return product;
}

function assertQuantityShape(product, qty) {
  if (!product.allowDecimal && !Number.isInteger(qty)) {
    throw new AppError(400, 'Alaabtan waxaa lagu tiriyaa tiro dhan (jajab ma leh)', [{ field: 'quantity', message: 'Geli tiro dhan' }]);
  }
}

async function respond(res, result, user, messages) {
  const product = await Product.findById(result.movement.product).populate('category', 'name slug');
  await result.movement.populate([{ path: 'product', select: 'name sku unit' }, { path: 'user', select: 'name' }]);
  ok(res, {
    status: result.duplicate ? 200 : 201,
    message: result.duplicate ? messages.duplicate : messages.created,
    data: { duplicate: result.duplicate, movement: serializeMovement(result.movement), product: adminProduct(product, user) },
  });
}

exports.adjust = asyncHandler(async (req, res) => {
  const { idempotencyKey, productId, quantityChange, reason } = req.valid.body;
  const product = await loadProduct(productId);
  assertQuantityShape(product, quantityChange);
  const result = await changeStockOnce({
    idempotencyKey,
    productId: product._id,
    delta: quantityChange,
    type: 'adjustment',
    reason,
    userId: req.user._id,
    refType: 'manual',
  });
  await respond(res, result, req.user, { created: 'Kaydka waa la hagaajiyey', duplicate: 'Isbeddelkan hore ayaa loo diiwaangeliyey' });
});

exports.receive = asyncHandler(async (req, res) => {
  const { idempotencyKey, productId, quantity, unitCost, supplier, note, updateCostPrice } = req.valid.body;
  const product = await loadProduct(productId);
  assertQuantityShape(product, quantity);
  const result = await changeStockOnce({
    idempotencyKey,
    productId: product._id,
    delta: quantity,
    type: 'receipt',
    reason: note || 'Alaab laga helay alaab-qeybiye',
    userId: req.user._id,
    refType: 'receipt',
    unitCost,
    supplier,
    setCostPrice: updateCostPrice ? unitCost : undefined,
  });
  await respond(res, result, req.user, { created: 'Alaabta la helay waa la diiwaangeliyey', duplicate: 'Rasiidkan hore ayaa loo diiwaangeliyey' });
});
