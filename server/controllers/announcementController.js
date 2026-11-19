const asyncHandler = require('express-async-handler');
const Announcement = require('../models/Announcement');
const { uploadFileToCloudinary, deleteFromCloudinary, extractPublicId } = require('../utils/cloudinary');
const { sanitizeAnnouncementFields } = require('../utils/sanitize');

const parseGalleryManifest = (value, fileCount, existingGallery = []) => {
  let manifest = [];
  if (value) {
    try {
      manifest = JSON.parse(value);
    } catch {
      const error = new Error('Gallery data is invalid. Please review the selected photos.');
      error.statusCode = 400;
      throw error;
    }
    if (!Array.isArray(manifest)) {
      const error = new Error('Gallery data must be a list of photos.');
      error.statusCode = 400;
      throw error;
    }
  } else {
    manifest = Array.from({ length: fileCount }, (_, uploadIndex) => ({ uploadIndex }));
  }

  if (manifest.length > 50 || manifest.some((item) => !item || typeof item !== 'object')) {
    const error = new Error('An announcement can contain up to 50 gallery photos.');
    error.statusCode = 400;
    throw error;
  }

  const uploadIndexes = new Set();
  const existingIds = new Set();
  const existingById = new Map(existingGallery.map((photo) => [String(photo._id), photo]));

  return manifest.map((item) => {
    const caption = typeof item.caption === 'string' ? item.caption.trim().slice(0, 200) : '';
    const altText = typeof item.altText === 'string' ? item.altText.trim().slice(0, 200) : '';
    if (Number.isInteger(item.uploadIndex)) {
      if (item.uploadIndex < 0 || item.uploadIndex >= fileCount || uploadIndexes.has(item.uploadIndex)) {
        const error = new Error('Gallery photo order is invalid. Please reselect the photos.');
        error.statusCode = 400;
        throw error;
      }
      uploadIndexes.add(item.uploadIndex);
      return { type: 'upload', uploadIndex: item.uploadIndex, caption, altText };
    }

    const id = typeof item.id === 'string' ? item.id : '';
    const existing = existingById.get(id);
    if (!existing || existingIds.has(id)) {
      const error = new Error('One or more existing gallery photos are invalid. Refresh and try again.');
      error.statusCode = 400;
      throw error;
    }
    existingIds.add(id);
    return { type: 'existing', id, photo: existing, caption, altText };
  });
};

const uploadAnnouncementGallery = async (files, manifest) => {
  const uploaded = [];
  try {
    const gallery = [];
    for (const item of manifest) {
      if (item.type === 'existing') {
        gallery.push({
          _id: item.photo._id,
          url: item.photo.url,
          publicId: item.photo.publicId,
          caption: item.caption,
          altText: item.altText,
        });
        continue;
      }
      const result = await uploadFileToCloudinary(files[item.uploadIndex].path, {
        folder: 'ibosys/announcements/gallery',
        public_id: `photo_${Date.now()}_${item.uploadIndex}`,
        resource_type: 'image',
      });
      const photo = {
        url: result.secure_url,
        publicId: result.public_id,
        caption: item.caption,
        altText: item.altText,
      };
      uploaded.push(photo);
      gallery.push(photo);
    }
    return { gallery, uploaded };
  } catch (error) {
    await Promise.all(uploaded.map((photo) => deleteFromCloudinary(photo.publicId).catch(() => {})));
    throw error;
  }
};

const parseAnnouncementTags = (value) => {
  if (value === undefined || value === null || value === '') return [];

  let values;
  if (Array.isArray(value)) {
    values = value;
  } else {
    const serialized = String(value).trim();
    try {
      const parsed = JSON.parse(serialized);
      values = Array.isArray(parsed) ? parsed : serialized.split(',');
    } catch {
      values = serialized.split(',');
    }
  }

  const seen = new Set();
  return values
    .filter(tag => typeof tag === 'string')
    .map(tag => tag.trim())
    .filter(tag => {
      const key = tag.toLocaleLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

// --- ADMIN: Full CRUD ---

// GET /api/announcements — List all (admin, including unpublished)
const getAllAnnouncements = asyncHandler(async (req, res) => {
  const { category, published } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (published !== undefined) filter.isPublished = published === 'true';

  const announcements = await Announcement.find(filter)
    .sort({ createdAt: -1 })
    .lean();
  res.json({ data: announcements });
});

// GET /api/announcements/:id
const getAnnouncementById = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id).lean();
  if (!announcement) {
    res.status(404);
    throw new Error('Announcement not found');
  }
  res.json({ data: announcement });
});

// POST /api/announcements
const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, excerpt, content, category, author, isPublished, isFeatured, tags } = req.body;
  const tagArray = parseAnnouncementTags(tags);

  // SEC-03: Sanitize HTML fields
  const sanitized = sanitizeAnnouncementFields({ title, excerpt, content });

  const coverFile = req.files?.coverImage?.[0];
  const galleryFiles = req.files?.galleryImages || [];
  let coverImage = '';
  let coverImagePublicId = '';
  if (coverFile) {
    // SEC-01: Upload cover image to Cloudinary instead of local disk
    const result = await uploadFileToCloudinary(coverFile.path, {
      folder: 'ibosys/announcements',
      public_id: `news_${Date.now()}`,
      resource_type: 'image',
    });
    coverImage = result.secure_url;
    coverImagePublicId = result.public_id; // M-1 fix: persist for reliable cleanup
  }

  const manifest = parseGalleryManifest(req.body.galleryItems, galleryFiles.length);
  const { gallery, uploaded } = await uploadAnnouncementGallery(galleryFiles, manifest);

  const announcement = new Announcement({
    title: sanitized.title,
    excerpt: sanitized.excerpt,
    content: sanitized.content,
    category,
    author,
    isPublished,
    isFeatured,
    coverImage,
    coverImagePublicId, // M-1 fix
    gallery,
    tags: tagArray,
  });

  try {
    await announcement.save();
  } catch (error) {
    await Promise.all(uploaded.map((photo) => deleteFromCloudinary(photo.publicId).catch(() => {})));
    throw error;
  }
  res.status(201).json({ data: announcement, message: 'Announcement created successfully' });
});

// PUT /api/announcements/:id
const updateAnnouncement = asyncHandler(async (req, res) => {
  const { title, excerpt, content, category, author, isPublished, isFeatured, tags } = req.body;

  // SEC-03: Sanitize HTML fields
  const sanitized = sanitizeAnnouncementFields({
    title:   title   !== undefined ? title   : '',
    excerpt: excerpt !== undefined ? excerpt : '',
    content: content !== undefined ? content : '',
  });

  const updates = {
    category,
    author,
    title:   title   !== undefined ? sanitized.title   : undefined,
    excerpt: excerpt !== undefined ? sanitized.excerpt : undefined,
    content: content !== undefined ? sanitized.content : undefined,
  };

  // Strip undefined keys so we don't accidentally overwrite with empty
  Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);

  if (isPublished !== undefined) updates.isPublished = isPublished === 'true' || isPublished === true;
  if (isFeatured  !== undefined) updates.isFeatured  = isFeatured  === 'true' || isFeatured  === true;
  if (tags        !== undefined) updates.tags = parseAnnouncementTags(tags);

  const coverFile = req.files?.coverImage?.[0];
  const galleryFiles = req.files?.galleryImages || [];
  const existingForImg = await Announcement.findById(req.params.id);
  if (!existingForImg) {
    res.status(404);
    throw new Error('Announcement not found');
  }
  // M-1 fix: prefer stored publicId; fall back to URL parsing for legacy records
  const oldCoverId = existingForImg.coverImagePublicId || (existingForImg.coverImage ? extractPublicId(existingForImg.coverImage) : null);
  let replacementCover;
  if (coverFile) {
    replacementCover = await uploadFileToCloudinary(coverFile.path, {
      folder: 'ibosys/announcements',
      public_id: `news_${Date.now()}`,
      resource_type: 'image',
    });
    updates.coverImage = replacementCover.secure_url;
    updates.coverImagePublicId = replacementCover.public_id; // M-1 fix
  }

  const existingForGallery = existingForImg;
  if (req.body.galleryItems !== undefined || galleryFiles.length > 0) {
    try {
      const manifest = parseGalleryManifest(req.body.galleryItems, galleryFiles.length, existingForGallery.gallery || []);
      const { gallery, uploaded } = await uploadAnnouncementGallery(galleryFiles, manifest);
      updates.gallery = gallery;
      const oldPhotos = (existingForGallery.gallery || []).filter(
        (photo) => !gallery.some((nextPhoto) => nextPhoto.publicId === photo.publicId),
      );
      updates._galleryCleanup = { uploaded, oldPhotos };
    } catch (error) {
      if (replacementCover) await deleteFromCloudinary(replacementCover.public_id).catch(() => {});
      throw error;
    }
  }

  // Set publishedAt when first publishing
  if (updates.isPublished) {
    const existingDoc = existingForImg;
    if (existingDoc && !existingDoc.publishedAt) updates.publishedAt = new Date();
  }

  // Regenerate slug when title changes
  if (updates.title) {
    updates.slug = updates.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 100);
  }

  const galleryCleanup = updates._galleryCleanup;
  delete updates._galleryCleanup;
  let updated;
  try {
    updated = await Announcement.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  } catch (error) {
    await Promise.all((galleryCleanup?.uploaded || []).map((photo) => deleteFromCloudinary(photo.publicId).catch(() => {})));
    if (replacementCover) await deleteFromCloudinary(replacementCover.public_id).catch(() => {});
    throw error;
  }
  if (!updated) {
    if (replacementCover) await deleteFromCloudinary(replacementCover.public_id).catch(() => {});
    res.status(404);
    throw new Error('Announcement not found');
  }
  if (replacementCover && oldCoverId) await deleteFromCloudinary(oldCoverId).catch((error) => {
    console.error(`[Announcement] Replaced cover cleanup failed for ${updated._id}:`, error.message);
  });
  await Promise.all((galleryCleanup?.oldPhotos || []).map((photo) => deleteFromCloudinary(photo.publicId).catch(() => {})));
  res.json({ data: updated, message: 'Announcement updated successfully' });
});

// DELETE /api/announcements/:id
const deleteAnnouncement = asyncHandler(async (req, res) => {
  const deleted = await Announcement.findByIdAndDelete(req.params.id);
  if (!deleted) {
    res.status(404);
    throw new Error('Announcement not found');
  }
  // Clean up Cloudinary image if present
  if (deleted.coverImage) {
    const publicId = extractPublicId(deleted.coverImage);
    if (publicId) await deleteFromCloudinary(publicId).catch(() => {});
  }
  await Promise.all((deleted.gallery || []).map((photo) => deleteFromCloudinary(photo.publicId).catch(() => {})));
  res.json({ message: 'Announcement deleted successfully' });
});

// PATCH /api/announcements/:id/toggle-publish
const togglePublish = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) {
    res.status(404);
    throw new Error('Announcement not found');
  }
  announcement.isPublished = !announcement.isPublished;
  if (announcement.isPublished && !announcement.publishedAt) {
    announcement.publishedAt = new Date();
  }
  await announcement.save();
  res.json({ data: announcement, message: `Announcement ${announcement.isPublished ? 'published' : 'unpublished'}` });
});

module.exports = {
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  togglePublish,
};
