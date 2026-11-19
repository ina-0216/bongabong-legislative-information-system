const { z } = require('zod');
const { objectIdParamsSchema } = require('./commonValidation');

const announcementIdParamsSchema = objectIdParamsSchema();

const createAnnouncementSchema = z.object({
  body: z.object({
    title: z.string().min(5, 'Title must be at least 5 characters').max(200),
    excerpt: z.string().max(400).optional(),
    content: z.string().min(1, 'Content is required'),
    category: z.enum(['General', 'Ordinance Update', 'Session Notice', 'Public Consultation', 'SP Corner', 'Press Release']).optional(),
    author: z.string().max(100).optional(),
    isPublished: z.union([z.boolean(), z.string().transform(v => v === 'true')]).optional(),
    isFeatured: z.union([z.boolean(), z.string().transform(v => v === 'true')]).optional(),
    tags: z.string().optional(), // JSON string array from the token input; legacy comma-separated values are also accepted
    galleryItems: z.string().max(50000).optional(),
  }),
});

const updateAnnouncementSchema = z.object({
  params: announcementIdParamsSchema.shape.params,
  body: z.object({
    title: z.string().min(5).max(200).optional(),
    excerpt: z.string().max(400).optional(),
    content: z.string().optional(),
    category: z.enum(['General', 'Ordinance Update', 'Session Notice', 'Public Consultation', 'SP Corner', 'Press Release']).optional(),
    author: z.string().max(100).optional(),
    isPublished: z.union([z.boolean(), z.string().transform(v => v === 'true')]).optional(),
    isFeatured: z.union([z.boolean(), z.string().transform(v => v === 'true')]).optional(),
    tags: z.string().optional(),
    galleryItems: z.string().max(50000).optional(),
  }),
});

module.exports = { createAnnouncementSchema, updateAnnouncementSchema, announcementIdParamsSchema };
