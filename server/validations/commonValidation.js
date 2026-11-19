const { z } = require('zod');

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

const objectIdParamsSchema = (key = 'id') => z.object({
  params: z.object({ [key]: objectIdSchema }),
});

const objectIdQuerySchema = (key) => z.object({
  query: z.object({ [key]: objectIdSchema }),
});

module.exports = { objectIdSchema, objectIdParamsSchema, objectIdQuerySchema };
