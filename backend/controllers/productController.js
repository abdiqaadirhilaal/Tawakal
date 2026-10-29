const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const CompanySettings = require('../models/CompanySettings');
const InventoryMovement = require('../models/InventoryMovement');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paginate } = require('../utils/respond');
const { escapeRegex, slugify } = require('../utils/helpers');
const { publicProduct, adminProduct } = require('../utils/serializers');
const { lowStockFilter } = require('../services/reportService');

const SORTS = {
  newest: { createdAt: -1 },
  price_asc: { price: 1, name: 1 },
  price_desc: { price: -1, name: 1 },
  name_asc: { name: 1 },
  name_desc: { name: -1 },
};
const COLLATION = { locale: 'en', strength: 2 };

function searchFilter(search) {
  if (!search) return {};
  const rx = new RegExp(escapeRegex(search), 'i');
  return { $or: [{ name: rx }, { sku: rx }, { barcode: search }] };
}

async function uniqueSlug(name, excludeId) {
  const base = slugify(name) || 'alaab';
  let slug = base;
  for (let i = 2; i < 200; i += 1) {
    const filter = { slug };
    if (excludeId) filter._id = { $ne: excludeId };
    if (!(await Product.exists(filter))) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

/* ---------- Dadweynaha ---------- */

exports.listPublic = asyncHandler(async (req, res) => {
  const { page, limit, search, category, sort, featured } = req.valid.query;
  const activeCats = await Category.find({ isActive: true }).select('_id slug');
  const filter = { isActive: true, isArchived: false, ...searchFilter(search) };

  if (category) {
    const cat = activeCats.find((c) => c.slug === category);
    if (!cat) return ok(res, { message: 'Alaab lama helin', data: [], pagination: paginate(page, limit, 0) });
    filter.category = cat._id;
  } else {
    filter.category = { $in: activeCats.map((c) => c._id) };
  }
  if (featured === 'true') filter.isFeatured = true;

  const [items, total] = await Promise.all([
    Product.find(filter)
      .collation(COLLATION)
      .sort(SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('category', 'name slug'),
    Product.countDocuments(filter),
  ]);
  return ok(res, { message: 'Alaabta waa la soo helay', data: items.map(publicProduct), pagination: paginate(page, limit, total) });
});

exports.getPublic = asyncHandler(async (req, res) => {
  const { id } = req.valid.params;
  const filter = { isActive: true, isArchived: false };
  if (/^[a-f\d]{24}$/.test(id)) filter.$or = [{ _id: new mongoose.Types.ObjectId(id) }, { slug: id }];
  else filter.slug = id;

  const product = await Product.findOne(filter).populate('category', 'name slug isActive');
  if (!product || !product.category || !product.category.isActive) throw new AppError(404, 'Alaabta lama helin');

  const related = await Product.find({
    isActive: true,
    isArchived: false,
    category: product.category._id,
    _id: { $ne: product._id },
  })
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(4)
    .populate('category', 'name slug');

  ok(res, { data: { product: publicProduct(product), related: related.map(publicProduct) } });
});

/* ---------- Maamulka ---------- */

exports.listAdmin = asyncHandler(async (req, res) => {
  const { page, limit, search, category, status } = req.valid.query;
  let filter = { isArchived: status === 'archived', ...searchFilter(search) };
  if (category) filter.category = category;
  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;
  if (status === 'out') filter.stock = { $lte: 0 };
  if (status === 'low') filter = { ...filter, ...lowStockFilter() };

  const [items, total] = await Promise.all([
    Product.find(filter)
      .collation(COLLATION)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('category', 'name slug'),
    Product.countDocuments(filter),
  ]);
  ok(res, { data: items.map((p) => adminProduct(p, req.user)), pagination: paginate(page, limit, total) });
});

exports.getAdmin = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.valid.params.id).populate('category', 'name slug');
  if (!product) throw new AppError(404, 'Alaabta lama helin');
  ok(res, { data: adminProduct(product, req.user) });
});

async function assertCategory(id) {
  if (!(await Category.exists({ _id: id }))) {
    throw new AppError(400, 'Qaybta la doortay ma jirto', [{ field: 'category', message: 'Qayb aan jirin' }]);
  }
}

async function assertBarcodeFree(barcode, excludeId) {
  if (!barcode) return;
  const filter = { barcode };
  if (excludeId) filter._id = { $ne: excludeId };
  if (await Product.exists(filter)) {
    throw new AppError(409, 'Barcode-kan alaab kale ayaa leh', [{ field: 'barcode', message: 'Barcode waa in uu gaar ahaadaa' }]);
  }
}

function assertCostPermission(body, user) {
  if (body.costPrice !== undefined && user.role !== 'admin') {
    throw new AppError(403, 'Kaliya maamulaha ayaa beddeli kara qiimaha iibsiga');
  }
}

exports.create = asyncHandler(async (req, res) => {
  const body = { ...req.valid.body };
  if (req.user.role !== 'admin') {
    if (req.body && req.body.costPrice !== undefined) throw new AppError(403, 'Kaliya maamulaha ayaa geli kara qiimaha iibsiga');
    body.costPrice = 0;
  }
  await assertCategory(body.category);
  if (await Product.exists({ sku: body.sku })) {
    throw new AppError(409, 'SKU-gan hore ayaa loo isticmaalay', [{ field: 'sku', message: 'SKU waa in uu noqdaa mid gaar ah' }]);
  }
  await assertBarcodeFree(body.barcode);
  if (body.lowStockThreshold === undefined) {
    const settings = await CompanySettings.getSingleton();
    body.lowStockThreshold = settings.lowStockDefault;
  }

  const initialStock = body.stock;
  const product = await Product.create({ ...body, slug: await uniqueSlug(body.name) });

  if (initialStock > 0) {
    await InventoryMovement.create({
      product: product._id,
      type: 'initial',
      quantityChange: initialStock,
      stockBefore: 0,
      stockAfter: initialStock,
      reason: 'Kaydka bilowga ah',
      refType: 'manual',
      user: req.user._id,
    });
  }
  await product.populate('category', 'name slug');
  ok(res, { status: 201, message: 'Alaabta waa la abuuray', data: adminProduct(product, req.user) });
});

exports.update = asyncHandler(async (req, res) => {
  const body = req.valid.body;
  assertCostPermission(body, req.user);
  const product = await Product.findById(req.valid.params.id);
  if (!product) throw new AppError(404, 'Alaabta lama helin');

  if (body.category) await assertCategory(body.category);
  if (body.sku && body.sku !== product.sku && (await Product.exists({ sku: body.sku, _id: { $ne: product._id } }))) {
    throw new AppError(409, 'SKU-gan hore ayaa loo isticmaalay', [{ field: 'sku', message: 'SKU waa in uu noqdaa mid gaar ah' }]);
  }
  if (body.barcode && body.barcode !== product.barcode) await assertBarcodeFree(body.barcode, product._id);
  if (body.name && body.name !== product.name) product.slug = await uniqueSlug(body.name, product._id);

  Object.assign(product, body);
  if (product.isArchived && body.isActive) product.isArchived = false;
  await product.save();
  await product.populate('category', 'name slug');
  ok(res, { message: 'Alaabta waa la cusboonaysiiyey', data: adminProduct(product, req.user) });
});

// "Tirtir" = kayd geli (archive). Alaabta lama tirtiro si diiwaanka dalabyada iyo
// dhaqdhaqaaqa kaydku u ahaadaan kuwo sax ah.
exports.remove = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.valid.params.id,
    { $set: { isArchived: true, isActive: false, isFeatured: false } },
    { new: true }
  );
  if (!product) throw new AppError(404, 'Alaabta lama helin');
  ok(res, { message: 'Alaabta waa la kaydiyey (archived)', data: { id: product._id.toString(), isArchived: true } });
});
