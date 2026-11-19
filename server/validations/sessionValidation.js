const { z } = require('zod');

const { objectIdSchema, objectIdParamsSchema } = require('./commonValidation');
const sessionStatusSchema = z.enum(['Draft', 'Final']);

// A session cannot link more measures than this; the array is stored inline on
// the session document, so an unbounded list would eventually exceed the
// MongoDB 16 MB document ceiling.
const MAX_ITEMS_DISCUSSED = 100;

const MAX_LENGTHS = {
  title: 300,
  sessionNumber: 50,
  sessionType: 100,
  legislativeBody: 150,
  venue: 300,
  municipality: 150,
  narrative: 50000,
};

const attendanceItemSchema = z.object({
  present: z.array(objectIdSchema).optional(),
  onOfficialBusiness: z.array(objectIdSchema).optional(),
  absent: z.array(objectIdSchema).optional(),
}).strict();

// A calendar date in YYYY-MM-DD form that is also a real date.
const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    const year = parsed.getFullYear();
    return !Number.isNaN(parsed.getTime())
      && parsed.toISOString().slice(0, 10) === value
      && year >= 2000
      && year <= 2100;
  }, 'Date must be a valid calendar date between 2000 and 2100');

const sessionFields = {
  title: z.string().trim().min(1, 'Title is required').max(MAX_LENGTHS.title),
  sessionNumber: z.string().max(MAX_LENGTHS.sessionNumber).optional(),
  sessionType: z.string().max(MAX_LENGTHS.sessionType).optional(),
  legislativeBody: z.string().max(MAX_LENGTHS.legislativeBody).optional(),
  venue: z.string().max(MAX_LENGTHS.venue).optional(),
  municipality: z.string().max(MAX_LENGTHS.municipality).optional(),
  date: isoDateSchema,
  itemsDiscussed: z.array(objectIdSchema).max(
    MAX_ITEMS_DISCUSSED,
    `A session can reference at most ${MAX_ITEMS_DISCUSSED} measures`,
  ).optional(),
  attendance: attendanceItemSchema.optional(),
  callToOrder: z.string().max(MAX_LENGTHS.narrative).optional(),
  invocation: z.string().max(MAX_LENGTHS.narrative).optional(),
  rollCall: z.string().max(MAX_LENGTHS.narrative).optional(),
  readingOfPreviousMinutes: z.string().max(MAX_LENGTHS.narrative).optional(),
  orderOfBusiness: z.string().max(MAX_LENGTHS.narrative).optional(),
  privilegeHour: z.string().max(MAX_LENGTHS.narrative).optional(),
  citizensHour: z.string().max(MAX_LENGTHS.narrative).optional(),
  questionHour: z.string().max(MAX_LENGTHS.narrative).optional(),
  committeeReport: z.string().max(MAX_LENGTHS.narrative).optional(),
  firstReading: z.string().max(MAX_LENGTHS.narrative).optional(),
  unfinishedBusiness: z.string().max(MAX_LENGTHS.narrative).optional(),
  referralForAction: z.string().max(MAX_LENGTHS.narrative).optional(),
  referralForReference: z.string().max(MAX_LENGTHS.narrative).optional(),
  referenceOfBusiness: z.string().max(MAX_LENGTHS.narrative).optional(),
  otherMatters: z.string().max(MAX_LENGTHS.narrative).optional(),
  thanksgivingPrayer: z.string().max(MAX_LENGTHS.narrative).optional(),
  adjournment: z.string().max(MAX_LENGTHS.narrative).optional(),
};

const createSessionSchema = z.object({
  body: z.object({
    ...sessionFields,
    title: sessionFields.title,
    date: sessionFields.date,
    status: sessionStatusSchema.optional(),
  }).strict(),
});

const updateSessionSchema = z.object({
  body: z.object({
    ...sessionFields,
    title: sessionFields.title.optional(),
    date: sessionFields.date.optional(),
    status: sessionStatusSchema.optional(),
  }).strict(),
  params: z.object({ id: objectIdSchema }),
});

module.exports = {
  createSessionSchema,
  updateSessionSchema,
  sessionIdParamsSchema: objectIdParamsSchema(),
  MAX_ITEMS_DISCUSSED,
};
