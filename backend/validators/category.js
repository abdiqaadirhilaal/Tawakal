const { z, imageUrl } = require('./common');

const create = z
  .object({
    name: z.string().trim().min(2, 'Magaca qaybta waa lagama maarmaan').max(80),
    description: z.string().trim().max(500).default(''),
    image: z.union([z.literal(''), imageUrl]).default(''),
    isActive: z.boolean().default(true),
  })
  .strict();

const update = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    description: z.string().trim().max(500).optional(),
    image: z.union([z.literal(''), imageUrl]).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Wax la beddelayo lama soo dirin');

module.exports = { create, update };
