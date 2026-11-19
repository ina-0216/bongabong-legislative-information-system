const { z } = require('zod');

const verifyFeedbackSchema = z.object({
  body: z.object({
    status: z.enum(['Approved', 'Rejected']).optional(),
    area: z.enum(['eligibility', 'comment']).optional(),
    action: z.enum(['approve', 'request_rejection', 'confirm_rejection', 'resolve_appeal']).optional(),
    appealOutcome: z.enum(['approve', 'reject']).optional(),
    reason: z.string().trim().max(1000).optional(),
    sentiment: z.enum(['Positive', 'Negative', 'Neutral']).optional(),
  })
    .refine((body) => Boolean(body.action || body.status), { message: 'A review action is required.' })
    .refine((body) => body.action !== 'resolve_appeal' && body.action !== 'confirm_rejection' || Boolean(body.appealOutcome), {
      message: 'An approval or rejection outcome is required to resolve this review.',
    }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Feedback ID'),
  }),
});

const publicConsultationStatusSchema = z.object({
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Ordinance ID') }),
  body: z.object({
    feedbackId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Feedback ID'),
    token: z.string().regex(/^[A-Za-z0-9_-]{40,60}$/, 'Invalid appeal token'),
  }),
});

const publicConsultationAppealSchema = z.object({
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Ordinance ID') }),
  body: z.object({
    feedbackId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Feedback ID'),
    token: z.string().regex(/^[A-Za-z0-9_-]{40,60}$/, 'Invalid appeal token'),
    target: z.enum(['eligibility', 'comment']),
    reason: z.string().trim().min(8).max(1000),
  }),
});

const getFeedbackSchema = z.object({
  query: z.object({
    barangay: z.string().max(100).optional(),
    sentiment: z.enum(['Positive', 'Negative', 'Neutral']).optional(),
    search: z.string().max(100).optional(),
  }),
  params: z.object({
    ordinanceId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Ordinance ID'),
  }),
});

const getPendingFeedbackSchema = z.object({
  query: z.object({
    page: z.string().regex(/^[1-9]\d{0,4}$/).refine((value) => Number(value) <= 10000).optional(),
    limit: z.string().regex(/^[1-9]\d{0,2}$/).refine((value) => Number(value) <= 100).optional(),
    search: z.string().max(100).optional(),
  }),
});

const getConsultationSubmissionsSchema = z.object({
  query: z.object({
    page: z.string().regex(/^[1-9]\d{0,4}$/).refine((value) => Number(value) <= 10000).optional(),
    limit: z.string().regex(/^[1-9]\d{0,2}$/).refine((value) => Number(value) <= 100).optional(),
    search: z.string().max(100).optional(),
  }),
});

const feedbackAttachmentSchema = z.object({
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Feedback ID') }),
});

module.exports = {
  verifyFeedbackSchema,
  getFeedbackSchema,
  getPendingFeedbackSchema,
  getConsultationSubmissionsSchema,
  feedbackAttachmentSchema,
  publicConsultationStatusSchema,
  publicConsultationAppealSchema,
};
