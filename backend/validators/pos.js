const { z, objectId, page, limit, search, money, uuid, dateOnly } = require('./common');
const { SALE_STATUSES } = require('../config/constants');

const code = z.string().trim().regex(/^[a-z0-9_]{2,40}$/, 'Habka lacag bixinta sax ma aha');

// Oggolaanshaha maamule/manager: waxaa lagu hubiyaa server-ka (email + fure).
const approval = z
  .object({
    email: z.string().trim().toLowerCase().email('Email-ku sax ma aha').max(160),
    password: z.string().min(1, 'Geli furaha sirta ah').max(128),
  })
  .strict();

const optionalPhone = z
  .string()
  .trim()
  .max(30)
  .refine((v) => v === '' || /^\+?[0-9][0-9\s-]{5,22}$/.test(v), 'Lambarka taleefanku sax ma aha')
  .default('');

const productList = z
  .object({
    page,
    limit: limit(24, 60),
    search,
    category: objectId.optional(),
  })
  .strict();

const productSearch = z.object({ q: z.string().trim().min(1, 'Geli erey la raadiyo').max(80) }).strict();

const createSale = z
  .object({
    idempotencyKey: uuid,
    // Fiiro: qiimo, wadar ama "lineTotal" lagama aqbalo browser-ka. Server-ka ayaa xisaabiya.
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
      .max(200)
      .refine((arr) => new Set(arr.map((i) => i.productId)).size === arr.length, 'Alaab isku mid ah ayaa laba jeer ku jirta'),
    customerName: z.string().trim().max(80).default(''),
    customerPhone: optionalPhone,
    discount: z
      .object({
        kind: z.enum(['percent', 'amount']),
        value: z.number().finite().positive('Qiimo-dhimistu waa in ay ka badnaataa 0').max(100000000),
      })
      .strict()
      .optional(),
    approval: approval.optional(),
    payment: z
      .object({
        method: code,
        amountReceived: money.optional(),
        reference: z.string().trim().max(80).default(''),
      })
      .strict(),
  })
  .strict()
  .refine((v) => !v.discount || v.discount.kind !== 'percent' || v.discount.value <= 100, {
    message: 'Boqolleydu kama badnaan karto 100',
    path: ['discount', 'value'],
  });

const saleList = z
  .object({
    page,
    limit: limit(20, 100),
    search,
    cashier: objectId.optional(),
    paymentMethod: code.optional(),
    status: z.enum(['all', ...SALE_STATUSES]).default('all'),
    from: dateOnly.optional(),
    to: dateOnly.optional(),
  })
  .strict();

const receiptQuery = z.object({ reprint: z.enum(['true', 'false']).optional() }).strict();

const createRefund = z
  .object({
    idempotencyKey: uuid,
    items: z
      .array(
        z
          .object({
            productId: objectId,
            quantity: z.number().finite().positive('Tiradu waa in ay ka badnaataa 0').max(1000000),
            // true kaliya marka alaabta gacanta lagu soo celiyey oo la iibin karo
            restock: z.boolean(),
          })
          .strict()
      )
      .min(1, 'Dooro ugu yaraan hal alaab')
      .max(200)
      .refine((arr) => new Set(arr.map((i) => i.productId)).size === arr.length, 'Alaab isku mid ah ayaa laba jeer ku jirta'),
    reason: z.string().trim().min(3, 'Sababta celinta waa lagama maarmaan').max(300),
    method: code.optional(),
    approval: approval.optional(),
  })
  .strict();

const refundList = z
  .object({ page, limit: limit(20, 100), search, from: dateOnly.optional(), to: dateOnly.optional() })
  .strict();

const openShift = z.object({ openingCash: money }).strict();

const closeShift = z
  .object({
    actualClosingCash: money,
    closingNotes: z.string().trim().max(500).default(''),
    // Maamule/manager ayaa xiri kara shift qof kale leeyahay
    shiftId: objectId.optional(),
  })
  .strict();

const shiftHistory = z
  .object({
    page,
    limit: limit(20, 100),
    cashier: objectId.optional(),
    status: z.enum(['all', 'open', 'closed']).default('all'),
    from: dateOnly.optional(),
    to: dateOnly.optional(),
  })
  .strict();

const shiftAdjustment = z
  .object({
    amount: z
      .number()
      .finite()
      .min(-100000000)
      .max(100000000)
      .refine((v) => v !== 0, 'Qaddarku ma noqon karo 0'),
    reason: z.string().trim().min(3, 'Sababta waa lagama maarmaan').max(300),
  })
  .strict();

const reportRange = z
  .object({
    from: dateOnly.optional(),
    to: dateOnly.optional(),
    groupBy: z.enum(['day', 'week', 'month', 'year']).default('day'),
  })
  .strict();

const auditList = z
  .object({ page, limit: limit(30, 100), action: z.string().trim().regex(/^[a-z_.]{2,40}$/).optional(), from: dateOnly.optional(), to: dateOnly.optional() })
  .strict();

module.exports = {
  productList, productSearch, createSale, saleList, receiptQuery, createRefund, refundList,
  openShift, closeShift, shiftHistory, shiftAdjustment, reportRange, auditList,
};
