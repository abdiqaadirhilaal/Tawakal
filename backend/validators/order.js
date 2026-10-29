const { z, objectId, page, limit, search, phone, optionalEmail, uuid, dateOnly } = require('./common');
const { ORDER_STATUSES, PAYMENT_STATUSES, FULFILLMENT_METHODS } = require('../config/constants');

const create = z
  .object({
    idempotencyKey: uuid,
    customer: z
      .object({
        name: z.string().trim().min(2, 'Magaca oo buuxa waa lagama maarmaan').max(80),
        phone,
        email: optionalEmail,
      })
      .strict(),
    fulfillmentMethod: z.enum(FULFILLMENT_METHODS),
    deliveryAddress: z
      .object({
        address: z.string().trim().max(250).default(''),
        district: z.string().trim().max(80).default(''),
      })
      .strict()
      .default({ address: '', district: '' }),
    paymentMethod: z.string().trim().regex(/^[a-z0-9_]{2,40}$/, 'Habka lacag bixinta sax ma aha'),
    customerNotes: z.string().trim().max(1000).default(''),
    // Fiiro: qiimaha iyo wadarta lagama aqbalo macmiilka. Server-ka ayaa xisaabiya.
    items: z
      .array(
        z
          .object({
            productId: objectId,
            quantity: z.number().finite().positive('Tiradu waa in ay ka badnaataa 0').max(1000000),
          })
          .strict()
      )
      .min(1, 'Dambiishu waa madhan tahay')
      .max(100),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.fulfillmentMethod === 'delivery') {
      if (v.deliveryAddress.address.length < 3) {
        ctx.addIssue({ code: 'custom', path: ['deliveryAddress', 'address'], message: 'Cinwaanka gaarsiinta waa lagama maarmaan' });
      }
      if (v.deliveryAddress.district.length < 2) {
        ctx.addIssue({ code: 'custom', path: ['deliveryAddress', 'district'], message: 'Degmada ama magaalada waa lagama maarmaan' });
      }
    }
    const ids = v.items.map((i) => i.productId);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: 'custom', path: ['items'], message: 'Alaab isku mid ah ayaa laba jeer ku jirta' });
    }
  });

const track = z
  .object({
    orderNumber: z.string().trim().toUpperCase().regex(/^TWK-\d{6}-\d{4,8}$/, 'Lambarka dalabku sax ma aha'),
    phone,
  })
  .strict();

const adminList = z
  .object({
    page,
    limit: limit(20, 100),
    search,
    status: z.enum(['all', ...ORDER_STATUSES]).default('all'),
    paymentStatus: z.enum(['all', ...PAYMENT_STATUSES]).default('all'),
    from: dateOnly.optional(),
    to: dateOnly.optional(),
  })
  .strict();

const status = z.object({ status: z.enum(ORDER_STATUSES) }).strict();
const paymentStatus = z.object({ paymentStatus: z.enum(PAYMENT_STATUSES) }).strict();
const note = z.object({ text: z.string().trim().min(1, 'Qor qoraalka').max(1000) }).strict();

module.exports = { create, track, adminList, status, paymentStatus, note };
