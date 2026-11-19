const mongoose = require('mongoose');
const { Schema } = mongoose;

const AnnouncementPhotoSchema = new Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  caption: { type: String, default: '', trim: true, maxlength: 200 },
  altText: { type: String, default: '', trim: true, maxlength: 200 },
}, { _id: true });

const AnnouncementSchema = new Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, sparse: true },
  excerpt: { type: String, default: '', trim: true },
  content: { type: String, default: '' },
  category: {
    type: String,
    enum: ['General', 'Ordinance Update', 'Session Notice', 'Public Consultation', 'SP Corner', 'Press Release'],
    default: 'General'
  },
  coverImage: { type: String, default: '' }, // Cloudinary secure URL
  coverImagePublicId: { type: String, default: '' }, // M-1 fix: store publicId for reliable cleanup
  gallery: { type: [AnnouncementPhotoSchema], default: [] },
  author: { type: String, default: 'Sangguniang Bayan ng Bongabong' },
  isPublished: { type: Boolean, default: false },
  publishedAt: { type: Date, default: null },
  isFeatured: { type: Boolean, default: false },
  tags: [{ type: String, trim: true }],
}, { timestamps: true });

// Auto-generate slug from title before save
AnnouncementSchema.pre('save', function (next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 100);
  }
  if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

AnnouncementSchema.index({ isPublished: 1, publishedAt: -1 });
AnnouncementSchema.index({ category: 1 });

module.exports = mongoose.model('Announcement', AnnouncementSchema);
