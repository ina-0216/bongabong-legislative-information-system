const { z } = require('zod');
const { objectIdSchema, objectIdParamsSchema } = require('./commonValidation');

const createSbMemberSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First name is required'),
    middleName: z.string().optional(),
    lastName: z.string().min(1, 'Last name is required'),
    position: z.string().min(1, 'Position is required').refine((value) => ['Vice Mayor', 'SB Member'].includes(value), {
      message: 'Position must be Vice Mayor or SB Member',
    }),
    biography: z.string().optional(),
    committees: z.string().optional(), // It comes as stringified JSON from FormData
    termStart: z.string().optional(),
    termEnd: z.string().optional(),
    contactEmail: z.string().email().optional().or(z.literal('')),
    fbLink: z.string().url().optional().or(z.literal('')),
    sbNumber: z.string().optional(),
    order: z.preprocess((val) => Number(val), z.number().int().min(1)).optional(),
    termId: objectIdSchema.optional(),
  }),
});

const updateSbMemberSchema = z.object({
  body: z.object({
    firstName: z.string().optional(),
    middleName: z.string().optional(),
    lastName: z.string().optional(),
    position: z.string().min(1, 'Position is required').refine((value) => ['Vice Mayor', 'SB Member'].includes(value), {
      message: 'Position must be Vice Mayor or SB Member',
    }).optional(),
    biography: z.string().optional(),
    committees: z.string().optional(),
    termStart: z.string().optional(),
    termEnd: z.string().optional(),
    contactEmail: z.string().email().optional().or(z.literal('')),
    fbLink: z.string().url().optional().or(z.literal('')),
    sbNumber: z.string().optional(),
    order: z.preprocess((val) => val === undefined || val === '' ? undefined : Number(val), z.number().int().min(1).optional()),
    isActive: z.string().optional(),
    termId: objectIdSchema.optional(),
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Member ID'),
  }),
});

module.exports = {
  createSbMemberSchema,
  updateSbMemberSchema,
  sbMemberIdParamsSchema: objectIdParamsSchema(),
};
