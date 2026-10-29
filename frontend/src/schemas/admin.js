import { z } from 'zod';
import { UNITS } from '../utils/format';

const num = (msg = 'Geli lambar sax ah') => z.number({ invalid_type_error: msg, required_error: msg }).finite(msg);
const money = num().min(0, 'Ma noqon karo wax ka yar 0');

export const loginSchema = z.object({
  email: z.string().trim().email('Email-ku sax ma aha'),
  password: z.string().min(1, 'Geli furaha sirta ah'),
});

const password = z.string().min(10, 'Ugu yaraan 10 xaraf').max(128);

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, 'Geli furaha hadda'), newPassword: password, confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, { message: 'Labada fure isma laha', path: ['confirm'] })
  .refine((v) => v.newPassword !== v.currentPassword, { message: 'Furaha cusub waa in uu ka duwanaadaa kii hore', path: ['newPassword'] });

export const userSchema = z.object({
  name: z.string().trim().min(2, 'Geli magaca').max(80),
  email: z.string().trim().email('Email-ku sax ma aha'),
  password,
  role: z.enum(['admin', 'manager', 'staff', 'cashier']),
});

export const productSchema = z.object({
  name: z.string().trim().min(2, 'Magaca alaabta waa lagama maarmaan').max(140),
  sku: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{1,39}$/, 'SKU: xarfo, lambarro, - _ . (2-40 xaraf)'),
  barcode: z.string().trim().regex(/^[A-Za-z0-9._-]{0,64}$/, 'Xarfo, lambarro, - _ . kaliya'),
  category: z.string().min(1, 'Dooro qayb'),
  description: z.string().trim().max(3000),
  price: money,
  costPrice: money,
  unit: z.enum(UNITS),
  allowDecimal: z.boolean(),
  stock: money,
  lowStockThreshold: money,
  isActive: z.boolean(),
  isFeatured: z.boolean(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, 'Magaca qaybta waa lagama maarmaan').max(80),
  description: z.string().trim().max(500),
  isActive: z.boolean(),
});

export const adjustmentSchema = z.object({
  direction: z.enum(['increase', 'decrease']),
  quantity: num().positive('Tiradu waa in ay ka badnaataa 0'),
  reason: z.string().trim().min(3, 'Qor sababta isbeddelka').max(300),
});

export const receiptSchema = z.object({
  quantity: num().positive('Tiradu waa in ay ka badnaataa 0'),
  unitCost: money,
  supplier: z.string().trim().max(120),
  note: z.string().trim().max(300),
  updateCostPrice: z.boolean(),
});

const url = z
  .string()
  .trim()
  .max(600)
  .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'Waa in uu ku bilaabmaa http:// ama https://');

export const settingsSchema = z.object({
  companyName: z.string().trim().min(2, 'Geli magaca shirkadda').max(80),
  tagline: z.string().trim().max(120),
  announcement: z.string().trim().max(200),
  phone: z.string().trim().refine((v) => v === '' || /^\+?[0-9][0-9\s-]{5,22}$/.test(v), 'Lambarka taleefanku sax ma aha'),
  whatsappNumber: z.string().trim().regex(/^(\d{8,15})?$/, 'Lambarro kaliya, oo leh koodhka waddanka. Tusaale: 25261XXXXXXX'),
  email: z.union([z.literal(''), z.string().trim().email('Email-ku sax ma aha')]),
  address: z.string().trim().max(250),
  businessHours: z.string().trim().max(200),
  mapUrl: url,
  aboutIntro: z.string().trim().max(3000),
  mission: z.string().trim().max(1500),
  vision: z.string().trim().max(1500),
  currency: z.string().trim().regex(/^[A-Za-z]{2,5}$/, 'Tusaale: USD'),
  deliveryFee: money,
  freeDeliveryThreshold: money,
  lowStockDefault: money,
  paymentMethods: z
    .array(
      z.object({
        code: z.string().trim().regex(/^[a-z0-9_]{2,40}$/, 'Xarfo yaryar, lambarro iyo _ kaliya'),
        label: z.string().trim().min(2, 'Geli magaca').max(80),
        enabled: z.boolean(),
      })
    )
    .min(1, 'Ugu yaraan hal hab')
    .refine((arr) => arr.some((m) => m.enabled), 'Ugu yaraan hal hab waa in uu shaqeeyaa')
    .refine((arr) => new Set(arr.map((m) => m.code)).size === arr.length, 'Koodhadhku waa in ay kala duwanaadaan'),
  socialLinks: z.object({ facebook: url, instagram: url, tiktok: url }),
  pos: z
    .object({
      requireOpenShift: z.boolean(),
      discountsEnabled: z.boolean(),
      cashierMaxDiscountPercent: num().min(0, 'Ugu yaraan 0').max(100, 'Ugu badnaan 100'),
      maxDiscountPercent: num().min(0, 'Ugu yaraan 0').max(100, 'Ugu badnaan 100'),
      receiptFooter: z.string().trim().max(200),
      paymentMethods: z
        .array(
          z.object({
            code: z.string().trim().regex(/^[a-z0-9_]{2,40}$/, 'Xarfo yaryar, lambarro iyo _ kaliya'),
            label: z.string().trim().min(2, 'Geli magaca').max(60),
            type: z.enum(['cash', 'mobile_money', 'bank_transfer', 'other']),
            enabled: z.boolean(),
          })
        )
        .min(1, 'Ugu yaraan hal hab')
        .refine((arr) => arr.some((m) => m.enabled), 'Ugu yaraan hal hab waa in uu shaqeeyaa')
        .refine((arr) => new Set(arr.map((m) => m.code)).size === arr.length, 'Koodhadhku waa in ay kala duwanaadaan'),
    })
    .refine((v) => v.cashierMaxDiscountPercent <= v.maxDiscountPercent, { message: 'Kama badnaan karo xadka guud', path: ['cashierMaxDiscountPercent'] }),
});
