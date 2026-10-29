const { z, objectId, page, limit, search, money, imageUrl } = require('./common');
const { UNITS } = require('../config/constants');

const publicList = z
  .object({
    page,
    limit: limit(12, 48),
    search,
    category: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{1,80}$/, 'Qayb aan sax ahayn').optional(),
    sort: z.enum(['newest', 'price_asc', 'price_desc', 'name_asc', 'name_desc']).default('newest'),
    featured: z.enum(['true', 'false']).optional(),
  })
  .strict();

const adminList = z
  .object({
    page,
    limit: limit(20, 100),
    search,
    category: objectId.optional(),
    status: z.enum(['all', 'active', 'inactive', 'archived', 'low', 'out']).default('all'),
  })
  .strict();

const idOrSlug = z.object({ id: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{1,100}$/, 'Aqoonsi aan sax ahayn') }).strict();

const base = {
  name: z.string().trim().min(2, 'Magaca alaabta waa lagama maarmaan').max(140),
  sku: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9._-]{1,39}$/, 'SKU: xarfo, lambarro, - _ . (2-40)'),
  category: objectId,
  barcode: z.string().trim().regex(/^[A-Za-z0-9._-]{0,64}$/, 'Barcode: xarfo, lambarro, - _ . kaliya'),
  description: z.string().trim().max(3000),
  price: money,
  costPrice: money,
  unit: z.enum(UNITS),
  allowDecimal: z.boolean(),
  lowStockThreshold: z.number().finite().min(0).max(10000000),
  images: z.array(imageUrl).max(8),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
};

const create = z
  .object({
    ...base,
    barcode: base.barcode.default(''),
    description: base.description.default(''),
    costPrice: base.costPrice.default(0),
    allowDecimal: base.allowDecimal.default(false),
    lowStockThreshold: base.lowStockThreshold.optional(),
    images: base.images.default([]),
    isActive: base.isActive.default(true),
    isFeatured: base.isFeatured.default(false),
    // Kaydka bilowga ah kaliya. Wixii ka dambeeya waxaa lagu beddelaa /admin/inventory.
    stock: z.number().finite().min(0).max(100000000).default(0),
  })
  .strict();

// "stock" si ula kac ah ugama mid aha: kaydka waxaa lagu beddelaa dhaqdhaqaaq la diiwaangeliyey oo kaliya.
const update = z
  .object(Object.fromEntries(Object.entries(base).map(([k, v]) => [k, v.optional()])))
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Wax la beddelayo lama soo dirin');

module.exports = { publicList, adminList, idOrSlug, create, update };
