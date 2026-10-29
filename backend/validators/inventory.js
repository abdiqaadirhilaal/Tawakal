const { z, objectId, page, limit, search, money, uuid, dateOnly } = require('./common');
const { MOVEMENT_TYPES } = require('../config/constants');

const list = z
  .object({ page, limit: limit(20, 100), search, filter: z.enum(['all', 'low', 'out']).default('all') })
  .strict();

const movements = z
  .object({
    page,
    limit: limit(25, 100),
    product: objectId.optional(),
    type: z.enum(['all', ...MOVEMENT_TYPES]).default('all'),
    from: dateOnly.optional(),
    to: dateOnly.optional(),
  })
  .strict();

const adjustment = z
  .object({
    idempotencyKey: uuid,
    productId: objectId,
    quantityChange: z
      .number()
      .finite()
      .min(-100000000)
      .max(100000000)
      .refine((v) => v !== 0, 'Isbeddelku ma noqon karo 0'),
    reason: z.string().trim().min(3, 'Sababta isbeddelka waa lagama maarmaan').max(300),
  })
  .strict();

const receipt = z
  .object({
    idempotencyKey: uuid,
    productId: objectId,
    quantity: z.number().finite().positive('Tiradu waa in ay ka badnaataa 0').max(100000000),
    unitCost: money,
    supplier: z.string().trim().max(120).default(''),
    note: z.string().trim().max(300).default(''),
    updateCostPrice: z.boolean().default(true),
  })
  .strict();

module.exports = { list, movements, adjustment, receipt };
