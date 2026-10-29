const { z, page, limit, search, phone, optionalEmail, money, dateOnly, imageUrl, httpUrlOrEmpty } = require('./common');
const { MESSAGE_STATUSES, POS_PAYMENT_TYPES } = require('../config/constants');

const contact = z
  .object({
    name: z.string().trim().min(2, 'Magaca waa lagama maarmaan').max(80),
    phone: z.union([z.literal(''), phone]).default(''),
    email: optionalEmail,
    subject: z.string().trim().max(150).default(''),
    message: z.string().trim().min(5, 'Farriintu aad ayay u gaaban tahay').max(2000),
  })
  .strict()
  .refine((v) => v.phone || v.email, { message: 'Geli taleefan ama email si laguula soo xiriiro', path: ['phone'] });

const messageList = z
  .object({ page, limit: limit(20, 100), status: z.enum(['all', ...MESSAGE_STATUSES]).default('all') })
  .strict();

const messageStatus = z.object({ status: z.enum(MESSAGE_STATUSES) }).strict();

const settings = z
  .object({
    companyName: z.string().trim().min(2).max(80),
    tagline: z.string().trim().max(120),
    logoUrl: z.union([z.literal(''), imageUrl]),
    announcement: z.string().trim().max(200),
    phone: z.union([z.literal(''), phone]),
    whatsappNumber: z.string().trim().regex(/^(\d{8,15})?$/, 'Geli lambar caalami ah oo lambarro kaliya ah, tusaale 25261XXXXXXX'),
    email: z.union([z.literal(''), z.string().trim().toLowerCase().email().max(160)]),
    address: z.string().trim().max(250),
    businessHours: z.string().trim().max(200),
    mapUrl: httpUrlOrEmpty,
    aboutIntro: z.string().trim().max(3000),
    mission: z.string().trim().max(1500),
    vision: z.string().trim().max(1500),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{2,5}$/, 'Tusaale: USD'),
    deliveryFee: money,
    freeDeliveryThreshold: money,
    paymentMethods: z
      .array(
        z
          .object({
            code: z.string().trim().regex(/^[a-z0-9_]{2,40}$/, 'Koodhku: xarfo yaryar, lambarro, _'),
            label: z.string().trim().min(2).max(80),
            enabled: z.boolean(),
          })
          .strict()
      )
      .min(1)
      .max(10)
      .refine((arr) => new Set(arr.map((m) => m.code)).size === arr.length, 'Koodhadhka hababka lacag bixinta waa in ay kala duwanaadaan')
      .refine((arr) => arr.some((m) => m.enabled), 'Ugu yaraan hal hab lacag bixin waa in uu shaqeeyaa'),
    lowStockDefault: z.number().finite().min(0).max(10000000),
    pos: z
      .object({
        requireOpenShift: z.boolean(),
        discountsEnabled: z.boolean(),
        cashierMaxDiscountPercent: z.number().finite().min(0).max(100),
        maxDiscountPercent: z.number().finite().min(0).max(100),
        receiptFooter: z.string().trim().max(200),
        paymentMethods: z
          .array(
            z
              .object({
                code: z.string().trim().regex(/^[a-z0-9_]{2,40}$/, 'Koodhku: xarfo yaryar, lambarro, _'),
                label: z.string().trim().min(2).max(60),
                type: z.enum(POS_PAYMENT_TYPES),
                enabled: z.boolean(),
              })
              .strict()
          )
          .min(1)
          .max(10)
          .refine((arr) => new Set(arr.map((m) => m.code)).size === arr.length, 'Koodhadhka hababka lacag bixinta waa in ay kala duwanaadaan')
          .refine((arr) => arr.some((m) => m.enabled), 'Ugu yaraan hal hab lacag bixin waa in uu shaqeeyaa'),
      })
      .strict()
      .refine((v) => v.cashierMaxDiscountPercent <= v.maxDiscountPercent, {
        message: 'Xadka kaashiyaha kama badnaan karo xadka guud',
        path: ['cashierMaxDiscountPercent'],
      }),
    socialLinks: z.object({ facebook: httpUrlOrEmpty, instagram: httpUrlOrEmpty, tiktok: httpUrlOrEmpty }).strict(),
  })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Wax la beddelayo lama soo dirin');

const salesChart = z.object({ period: z.enum(['7d', '30d', '12m']).default('30d') }).strict();

const salesReport = z
  .object({
    from: dateOnly.optional(),
    to: dateOnly.optional(),
    groupBy: z.enum(['day', 'week', 'month', 'year']).default('day'),
  })
  .strict();

const customerList = z.object({ page, limit: limit(20, 100), search }).strict();
const customerParams = z.object({ phoneKey: z.string().regex(/^\d{7,15}$/) }).strict();

module.exports = { contact, messageList, messageStatus, settings, salesChart, salesReport, customerList, customerParams };
