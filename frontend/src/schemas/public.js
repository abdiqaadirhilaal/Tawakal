import { z } from 'zod';

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s-]{5,22}$/, 'Lambarka taleefanku sax ma aha')
  .refine((v) => {
    const d = v.replace(/\D/g, '');
    return d.length >= 7 && d.length <= 15;
  }, 'Lambarka taleefanku sax ma aha');

const optionalEmail = z.union([z.literal(''), z.string().trim().email('Email-ku sax ma aha').max(160)]);

export const checkoutSchema = z
  .object({
    name: z.string().trim().min(2, 'Geli magacaaga oo buuxa').max(80),
    phone: phoneSchema,
    email: optionalEmail,
    fulfillmentMethod: z.enum(['delivery', 'pickup']),
    address: z.string().trim().max(250),
    district: z.string().trim().max(80),
    paymentMethod: z.string().min(1, 'Dooro habka lacag bixinta'),
    customerNotes: z.string().trim().max(1000),
  })
  .superRefine((v, ctx) => {
    if (v.fulfillmentMethod === 'delivery') {
      if (v.address.length < 3) ctx.addIssue({ code: 'custom', path: ['address'], message: 'Geli cinwaanka gaarsiinta' });
      if (v.district.length < 2) ctx.addIssue({ code: 'custom', path: ['district'], message: 'Geli degmada ama magaalada' });
    }
  });

export const contactSchema = z
  .object({
    name: z.string().trim().min(2, 'Geli magacaaga').max(80),
    phone: z.union([z.literal(''), phoneSchema]),
    email: optionalEmail,
    subject: z.string().trim().max(150),
    message: z.string().trim().min(5, 'Farriintu aad ayay u gaaban tahay').max(2000),
  })
  .refine((v) => v.phone || v.email, { message: 'Geli taleefan ama email si laguula soo xiriiro', path: ['phone'] });

export const trackSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^TWK-\d{6}-\d{4,8}$/, 'Tusaale: TWK-261010-0001'),
  phone: phoneSchema,
});
