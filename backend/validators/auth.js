const { z } = require('./common');
const { ROLES } = require('../config/constants');

const password = z.string().min(10, 'Furaha sirta ah waa in uu ahaadaa ugu yaraan 10 xaraf').max(128);

const login = z
  .object({
    email: z.string().trim().toLowerCase().email('Email-ku sax ma aha').max(160),
    password: z.string().min(1, 'Geli furaha sirta ah').max(128),
  })
  .strict();

const changePassword = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: password,
  })
  .strict()
  .refine((v) => v.currentPassword !== v.newPassword, { message: 'Furaha cusub waa in uu ka duwanaadaa kii hore', path: ['newPassword'] });

const createUser = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().toLowerCase().email().max(160),
    password,
    role: z.enum(ROLES).default('staff'),
  })
  .strict();

const updateUser = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    role: z.enum(ROLES).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Wax la beddelayo lama soo dirin');

module.exports = { login, changePassword, createUser, updateUser, password };
