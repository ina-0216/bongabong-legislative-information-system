const { z } = require('zod');
const { objectIdParamsSchema } = require('./commonValidation');

const TERM_LENGTH_ERROR = 'Legislative terms must span exactly three years';

const createTermSchema = z.object({
  body: z.object({
    label: z.string().optional(),
    startYear: z.number().int().min(1900),
    endYear: z.number().int().min(1900),
    presidingOfficer: z.string().optional(),
    description: z.string().optional(),
  }).refine(({ startYear, endYear }) => endYear - startYear === 3, {
    message: TERM_LENGTH_ERROR,
    path: ['endYear'],
  }),
});

const updateTermSchema = z.object({
  body: z.object({
    label: z.string().optional(),
    startYear: z.number().int().min(1900).optional(),
    endYear: z.number().int().min(1900).optional(),
    presidingOfficer: z.string().optional(),
    description: z.string().optional(),
  }).refine(({ startYear, endYear }) => startYear === undefined || endYear === undefined || endYear - startYear === 3, {
    message: TERM_LENGTH_ERROR,
    path: ['endYear'],
  }),
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Term ID') }),
});

const termIdParamsSchema = objectIdParamsSchema();

module.exports = {
  createTermSchema,
  updateTermSchema,
  termIdParamsSchema,
};
