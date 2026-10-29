const Category = require('../models/Category');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');
const { slugify } = require('../utils/helpers');
const { category: serialize } = require('../utils/serializers');

const COLLATION = { locale: 'en', strength: 2 };

async function counts(match) {
  const rows = await Product.aggregate([{ $match: match }, { $group: { _id: '$category', n: { $sum: 1 } } }]);
  return new Map(rows.map((r) => [r._id.toString(), r.n]));
}

async function uniqueSlug(name, excludeId) {
  const base = slugify(name) || 'qayb';
  let slug = base;
  for (let i = 2; i < 100; i += 1) {
    const filter = { slug };
    if (excludeId) filter._id = { $ne: excludeId };
    if (!(await Category.exists(filter))) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

async function assertNameFree(name, excludeId) {
  const filter = { name };
  if (excludeId) filter._id = { $ne: excludeId };
  const dup = await Category.findOne(filter).collation(COLLATION);
  if (dup) throw new AppError(409, 'Qayb magacan leh ayaa hore u jirtay', [{ field: 'name', message: 'Magacan waa la isticmaalay' }]);
}

exports.listPublic = asyncHandler(async (req, res) => {
  const [cats, map] = await Promise.all([
    Category.find({ isActive: true }).collation(COLLATION).sort({ name: 1 }),
    counts({ isActive: true, isArchived: false }),
  ]);
  ok(res, {
    data: cats.map((c) => {
      const { isActive, ...rest } = serialize(c, { productCount: map.get(c._id.toString()) || 0 });
      return rest;
    }),
  });
});

exports.listAdmin = asyncHandler(async (req, res) => {
  const [cats, map] = await Promise.all([Category.find({}).collation(COLLATION).sort({ name: 1 }), counts({ isArchived: false })]);
  ok(res, { data: cats.map((c) => serialize(c, { productCount: map.get(c._id.toString()) || 0 })) });
});

exports.create = asyncHandler(async (req, res) => {
  const body = req.valid.body;
  await assertNameFree(body.name);
  const cat = await Category.create({ ...body, slug: await uniqueSlug(body.name) });
  ok(res, { status: 201, message: 'Qaybta waa la abuuray', data: serialize(cat, { productCount: 0 }) });
});

exports.update = asyncHandler(async (req, res) => {
  const cat = await Category.findById(req.valid.params.id);
  if (!cat) throw new AppError(404, 'Qaybta lama helin');
  const body = req.valid.body;
  if (body.name && body.name !== cat.name) {
    await assertNameFree(body.name, cat._id);
    cat.slug = await uniqueSlug(body.name, cat._id);
  }
  Object.assign(cat, body);
  await cat.save();
  ok(res, { message: 'Qaybta waa la cusboonaysiiyey', data: serialize(cat) });
});

exports.remove = asyncHandler(async (req, res) => {
  const cat = await Category.findById(req.valid.params.id);
  if (!cat) throw new AppError(404, 'Qaybta lama helin');
  // Alaabta la kaydiyey (archived) sidoo kale waa la tiriyaa, si aysan u noqon alaab aan qayb lahayn.
  const inUse = await Product.countDocuments({ category: cat._id });
  if (inUse > 0) {
    throw new AppError(409, `Qaybtan lama tirtiri karo: ${inUse} alaab ayaa ku xiran. Marka hore u wareeji qayb kale, ama dami qaybta.`);
  }
  await cat.deleteOne();
  ok(res, { message: 'Qaybta waa la tirtiray', data: { id: cat._id.toString() } });
});
