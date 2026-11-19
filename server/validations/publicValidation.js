const { z } = require('zod');
const { objectIdSchema, objectIdParamsSchema } = require('./commonValidation');

const pageQuery = z.string()
  .regex(/^[1-9]\d{0,4}$/, 'Page must be a positive integer.')
  .refine((value) => Number(value) <= 10000, 'Page cannot exceed 10000.')
  .optional();
const limitQuery = z.string()
  .regex(/^\d{1,3}$/, 'Limit must be a positive integer.')
  .refine((value) => Number(value) >= 1 && Number(value) <= 100, 'Limit cannot exceed 100.')
  .optional();

const paginatedPublicQuerySchema = z.object({
  query: z.object({ page: pageQuery, limit: limitQuery }),
});

const getDocumentsSchema = z.object({
  query: z.object({
    search: z.string().max(100, 'Search must be 100 characters or fewer.').optional(),
    type: z.string().max(30).optional(),
    status: z.string().max(60).optional(),
    year: z.string().regex(/^\d{4}$/).optional(),
    page: pageQuery,
    limit: limitQuery,
    termId: objectIdSchema.optional(),
    committee: z.string().max(150).optional(),
  }),
});

const getAnnouncementsSchema = z.object({
  query: z.object({
    ...paginatedPublicQuerySchema.shape.query.shape,
    category: z.string().max(40).optional(),
  }),
});

const guestConsultSchema = z.object({
  body: z.object({
    full_name: z.string().trim().min(3, 'Full name must be at least 3 characters').max(120, 'Full name must be 120 characters or fewer'),
    barangay: z.string().min(1, 'Barangay is required').max(100, 'Barangay must be 100 characters or fewer'),
    contact_number: z.string().regex(/^09\d{9}$/, 'Enter a valid 11-digit mobile number'),
    otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits').optional(),
    email: z.string().trim().email('Enter a valid email address').max(254, 'Email must be 254 characters or fewer').optional(),
    emailVerificationToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'Email verification is invalid or expired').optional(),
    vote: z.enum(['Agree', 'Disagree', 'Neutral', 'None']).optional(),
    comment: z.string().max(4000, 'Comment must be 4000 characters or fewer').optional(),
    data_privacy_consent: z.literal('true', {
      errorMap: () => ({ message: 'You must accept the Data Privacy Consent' }),
    }),
  }).superRefine((body, ctx) => {
    if (Boolean(body.email) !== Boolean(body.emailVerificationToken)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [body.email ? 'emailVerificationToken' : 'email'],
        message: 'Email and its verified token must be provided together.',
      });
    }
    if (!body.otp && !body.emailVerificationToken) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['emailVerificationToken'],
        message: 'Verify your email or provide the SMS OTP.',
      });
    }
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Ordinance ID'),
  }),
});

const sendOtpSchema = z.object({
  body: z.object({
    contactNumber: z.string().regex(/^09\d{9}$/, 'Enter a valid 11-digit mobile number'),
  }),
});

const sendEmailVerificationSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Enter a valid email address').max(254, 'Email must be 254 characters or fewer'),
  }),
});

const verifyEmailCodeSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Enter a valid email address').max(254, 'Email must be 254 characters or fewer'),
    code: z.string().regex(/^\d{6}$/, 'Verification code must be 6 digits'),
  }),
});

const termFilterSchema = z.object({
  query: z.object({ termId: objectIdSchema.optional() }),
});

const publicFeedbackIdSchema = objectIdParamsSchema();

module.exports = {
  getDocumentsSchema,
  paginatedPublicQuerySchema,
  getAnnouncementsSchema,
  guestConsultSchema,
  sendOtpSchema,
  sendEmailVerificationSchema,
  verifyEmailCodeSchema,
  termFilterSchema,
  publicFeedbackIdSchema,
};
