const { z } = require('zod');

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');
const stringOrJsonArray = (itemSchema) => z.union([z.string(), z.array(itemSchema)]);
const isDraftSchema = z.union([z.boolean(), z.enum(['true', 'false'])]);
const seriesYearSchema = z.union([
  z.number().int().min(1900).max(9999),
  z.string().regex(/^\d{4}$/, 'Series year must be a four-digit year'),
]);
// Legacy clients may still send structured sections; the current authoring form
// stores the complete legal body in `provisions` and clears this array.
const sectionsSchema = stringOrJsonArray(z.object({
  title: z.string().max(300, 'Section title is too long'),
  content: z.string().max(50000, 'Section content is too long'),
}));

// Field length ceilings. These bound request payload growth and keep the
// documents within what the PDF renderer and MongoDB document limit can hold.
const MAX_LENGTHS = {
  number: 64,
  title: 500,
  title_tl: 500,
  sectorTag: 100,
  committee: 300,
  notes: 2000,
  adoptionResult: 200,
  adoptionDate: 40,
  explanatoryNote: 60000,
  definitionsOfTerms: 60000,
  enactingClause: 20000,
  provisions: 200000,
  penaltyClause: 20000,
  effectivityDate: 40,
  plainLanguageSummary: 10000,
  plainLanguageSummary_tl: 10000,
  findings: 30000,
  recommendation: 20000,
  viceSecretaryName: 200,
};

// A calendar date in YYYY-MM-DD form that is also a real date.
const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Date must be a valid calendar date');

// Distribution holds the recipients of a resolution, so every entry must be a
// deliverable email address rather than free text.
const distributionItemSchema = z
  .string()
  .trim()
  .min(5, 'Distribution entry must be a valid email address')
  .max(254, 'Distribution entry is too long')
  .email('Distribution entry must be a valid email address');

const pdfUploadSchema = z.object({
  publicId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/i),
  folder: z.literal('ibosys/ordinances/staging'),
  timestamp: z.number().int().positive(),
  signature: z.string().regex(/^[a-f0-9]{40}$/i),
}).strict();

// A resolution records how the body voted. Free text here produced records
// like "adopted" / "Adopted unanimously" / "adopted unanimously" that could not
// be counted, so the outcome is an explicit enum.
const ADOPTION_RESULTS = [
  'Adopted',
  'Adopted Unanimously',
  'Approved',
  'Approved Unanimously',
  'Rejected',
  'Referred to Committee',
  'Postponed',
  'Deferred',
  'Other',
];

const adoptionResultSchema = z
  .string()
  .trim()
  .max(MAX_LENGTHS.adoptionResult)
  .optional()
  .refine(
    (value) => {
      if (!value || value.trim() === '') return true;
      return ADOPTION_RESULTS.some((candidate) => candidate.toLowerCase() === value.trim().toLowerCase());
    },
    { message: `Adoption result must be one of: ${ADOPTION_RESULTS.join(', ')}` },
  );

const createOrdinanceSchema = z.object({
  body: z.object({
    type: z.enum(['Ordinance', 'Resolution']),
    number: z.string().trim().min(1, 'Number is required').max(MAX_LENGTHS.number),
    title: z.string().trim().min(1, 'Title is required').max(MAX_LENGTHS.title),
    title_tl: z.string().max(MAX_LENGTHS.title_tl).optional(),
    proponentId: objectIdSchema,
    sectorTag: z.string().max(MAX_LENGTHS.sectorTag).optional(),
    isDraft: isDraftSchema.optional(),
    seriesYear: seriesYearSchema.optional(),
    coAuthors: stringOrJsonArray(objectIdSchema).optional(),
    motionBy: objectIdSchema.optional().nullable(),
    secondedBy: stringOrJsonArray(objectIdSchema).optional(),
    adoptionResult: adoptionResultSchema.optional(),
    adoptionDate: z.string().max(MAX_LENGTHS.adoptionDate).optional(),
    distribution: stringOrJsonArray(distributionItemSchema).optional(),
    explanatoryNote: z.string().max(MAX_LENGTHS.explanatoryNote).optional(),
    definitionsOfTerms: z.string().max(MAX_LENGTHS.definitionsOfTerms).optional(),
    enactingClause: z.string().max(MAX_LENGTHS.enactingClause).optional(),
    provisions: z.string().max(MAX_LENGTHS.provisions).optional(),
    penaltyClause: z.string().max(MAX_LENGTHS.penaltyClause).optional(),
    effectivityDate: isoDateSchema.optional(),
    plainLanguageSummary: z.string().max(MAX_LENGTHS.plainLanguageSummary).optional(),
    plainLanguageSummary_tl: z.string().max(MAX_LENGTHS.plainLanguageSummary_tl).optional(),
    sections: sectionsSchema.optional(),
    termId: objectIdSchema.optional(),
    amendsOrdinanceId: objectIdSchema.optional(),
    pdfUpload: pdfUploadSchema.optional(),
  }).strict().superRefine((body, ctx) => {
    if (body.type === 'Ordinance') {
      if (body.adoptionResult?.trim().toLowerCase() === 'rejected') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['adoptionResult'],
          message: 'Use the formal Reject Ordinance action to record an official decision.',
        });
      }
      const match = /^(\d{4})-(\d{3,})$/.exec(body.number);
      if (!match) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['number'],
          message: 'Ordinance number must use YYYY-NNN format, for example 2026-001.',
        });
      } else if (body.seriesYear !== undefined && Number(body.seriesYear) !== Number(match[1])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['seriesYear'],
          message: 'Series year must match the year at the start of the ordinance number.',
        });
      }
    }

    const isDraft = body.isDraft === true || body.isDraft === 'true';
    if (!isDraft) {
      for (const field of ['explanatoryNote', 'provisions']) {
        if (!body[field] || !body[field].trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: `${field} is required to file the measure`,
          });
        }
      }
    }
  }),
});

const updateOrdinanceStatusSchema = z.object({
  body: z.object({
    status: z.enum(['First Reading', 'Committee Assignment', 'Committee Hearing', 'Public Consultation', 'Second Reading', 'Third Reading', "For Mayor's Signature", 'For SP Review', 'Approved']),
    notes: z.string().max(MAX_LENGTHS.notes).optional(),
    sessionId: objectIdSchema.optional(),
  }).strict(),
  params: z.object({
    id: objectIdSchema,
  }),
});

const rejectOrdinanceSchema = z.object({
  body: z.object({
    reason: z.string().trim().min(8, 'Enter the official decision reason (at least 8 characters).').max(MAX_LENGTHS.notes),
    minutesReference: z.string().trim().max(300).optional(),
    sessionId: objectIdSchema.optional(),
    voteTally: z.object({
      votesFor: z.number().int().min(0).max(1000).optional(),
      votesAgainst: z.number().int().min(0).max(1000).optional(),
      abstentions: z.number().int().min(0).max(1000).optional(),
      absent: z.number().int().min(0).max(1000).optional(),
    }).strict().optional(),
  }).strict(),
  params: z.object({
    id: objectIdSchema,
  }),
});

const assignCommitteeSchema = z.object({
  body: z.object({
    committee: z.string().trim().min(1, 'Committee name is required').max(MAX_LENGTHS.committee),
    notes: z.string().max(MAX_LENGTHS.notes).optional(),
  }),
  params: z.object({
    id: objectIdSchema,
  }),
});

const updateOrdinanceSchema = z.object({
  body: z.object({
    number: z.string().trim().min(1, 'Number cannot be empty').max(MAX_LENGTHS.number).optional(),
    title: z.string().max(MAX_LENGTHS.title).optional(),
    title_tl: z.string().max(MAX_LENGTHS.title_tl).optional(),
    proponentId: objectIdSchema.optional(),
    sectorTag: z.string().max(MAX_LENGTHS.sectorTag).optional(),
    isDraft: isDraftSchema.optional(),
    seriesYear: seriesYearSchema.optional(),
    coAuthors: stringOrJsonArray(objectIdSchema).optional(),
    motionBy: z.union([objectIdSchema, z.literal('')]).optional().nullable(),
    secondedBy: stringOrJsonArray(objectIdSchema).optional(),
    adoptionResult: adoptionResultSchema.optional(),
    adoptionDate: z.string().max(MAX_LENGTHS.adoptionDate).optional(),
    distribution: stringOrJsonArray(distributionItemSchema).optional(),
    explanatoryNote: z.string().max(MAX_LENGTHS.explanatoryNote).optional(),
    definitionsOfTerms: z.string().max(MAX_LENGTHS.definitionsOfTerms).optional(),
    enactingClause: z.string().max(MAX_LENGTHS.enactingClause).optional(),
    provisions: z.string().max(MAX_LENGTHS.provisions).optional(),
    penaltyClause: z.string().max(MAX_LENGTHS.penaltyClause).optional(),
    effectivityDate: isoDateSchema.optional(),
    plainLanguageSummary: z.string().max(MAX_LENGTHS.plainLanguageSummary).optional(),
    plainLanguageSummary_tl: z.string().max(MAX_LENGTHS.plainLanguageSummary_tl).optional(),
    termId: objectIdSchema.optional(),
    sections: sectionsSchema.optional(),
    pdfUpload: pdfUploadSchema.optional(),
  }).strict(),
  params: z.object({
    id: objectIdSchema,
  }),
});

const amendOrdinanceSchema = z.object({
  body: z.object({
    newOrdinanceId: objectIdSchema,
  }),
  params: z.object({
    id: objectIdSchema,
  }),
});

const committeeReportSchema = z.object({
  body: z.object({
    findings: z.string().max(MAX_LENGTHS.findings).optional(),
    recommendation: z.string().max(MAX_LENGTHS.recommendation).optional(),
    viceSecretaryName: z.string().max(MAX_LENGTHS.viceSecretaryName).optional(),
  }),
  params: z.object({
    id: objectIdSchema,
  }),
});

module.exports = {
  createOrdinanceSchema,
  updateOrdinanceStatusSchema,
  rejectOrdinanceSchema,
  assignCommitteeSchema,
  updateOrdinanceSchema,
  amendOrdinanceSchema,
  committeeReportSchema,
  MAX_LENGTHS,
};
