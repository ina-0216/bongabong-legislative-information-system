const { z } = require('zod');

const updateCommitteeSchema = z.object({
  body: z.object({
    chairperson: z.string().optional(),
    viceChairperson: z.string().optional(),
    members: z.array(z.string()).optional(),
    description: z.string().optional(),
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Committee ID'),
  }),
});

const ensureTermCommitteesSchema = z.object({
  body: z.object({
    termId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Term ID'),
  }),
});

module.exports = {
  updateCommitteeSchema,
  ensureTermCommitteesSchema,
};
