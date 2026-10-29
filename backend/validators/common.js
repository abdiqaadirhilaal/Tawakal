const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Aqoonsi (ID) aan sax ahayn');
const idParams = z.object({ id: objectId }).strict();

const page = z.coerce.number().int().min(1).max(100000).default(1);
const limit = (def = 12, max = 50) => z.coerce.number().int().min(1).max(max).default(def);
const search = z.string().trim().max(80).optional();

const money = z
  .number({ invalid_type_error: 'Waa in uu noqdaa lambar' })
  .finite()
  .min(0, 'Ma noqon karo wax ka yar 0')
  .max(100000000);

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s-]{5,22}$/, 'Lambarka taleefanku sax ma aha')
  .refine((v) => {
    const d = v.replace(/\D/g, '');
    return d.length >= 7 && d.length <= 15;
  }, 'Lambarka taleefanku sax ma aha');

const optionalEmail = z.union([z.literal(''), z.string().trim().toLowerCase().email('Email-ku sax ma aha').max(160)]).optional();

const uuid = z.string().uuid('idempotencyKey waa in uu noqdaa UUID');

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Taariikhdu waa in ay noqotaa YYYY-MM-DD');

// URL sawir: mid la soo dejiyey (/uploads/...) ama https://
const imageUrl = z
  .string()
  .trim()
  .max(600)
  .refine((v) => /^\/uploads\/[\w.-]+$/.test(v) || /^https?:\/\/[^\s<>"']+$/i.test(v), 'URL-ka sawirku sax ma aha');

const httpUrlOrEmpty = z
  .string()
  .trim()
  .max(600)
  .refine((v) => v === '' || /^https?:\/\/[^\s<>"']+$/i.test(v), 'URL-ku waa in uu ku bilaabmaa http:// ama https://');

module.exports = { z, objectId, idParams, page, limit, search, money, phone, optionalEmail, uuid, dateOnly, imageUrl, httpUrlOrEmpty };
