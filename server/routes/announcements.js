const express = require('express');
const router = express.Router();
const multer = require('multer');
const { MAX_ANNOUNCEMENT_COVER_BYTES, MAX_ANNOUNCEMENT_GALLERY_BYTES } = require('../utils/uploadLimits');
const { createTempUploadStorage, cleanupTempUploads } = require('../utils/tempUploadStorage');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createAnnouncementSchema, updateAnnouncementSchema, announcementIdParamsSchema } = require('../validations/announcementValidation');
const {
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  togglePublish,
} = require('../controllers/announcementController');
const { ROLES } = require('../utils/constants');

// SEC-05: Use memory storage so files go to Cloudinary, not local disk.
// Type and size validated before upload reaches the controller.
const upload = multer({
  storage: createTempUploadStorage({
    coverImage: MAX_ANNOUNCEMENT_COVER_BYTES,
    galleryImages: MAX_ANNOUNCEMENT_GALLERY_BYTES,
  }),
  limits: { fileSize: MAX_ANNOUNCEMENT_COVER_BYTES, files: 9, fields: 12, parts: 21, fieldSize: 50000 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed (JPEG, PNG, WebP, GIF).'));
  },
});

const parseAnnouncementUploads = (req, res, next) => {
  const galleryFiles = req.files?.galleryImages || [];
  const totalBytes = galleryFiles.reduce((total, file) => total + file.size, 0);
  if (galleryFiles.length > 8 || totalBytes > 32 * 1024 * 1024) {
    return res.status(413).json({ message: 'Choose up to 8 gallery photos with a combined size under 32 MiB.' });
  }
  next();
};

// Admin-only routes
router.get('/', protect, getAllAnnouncements);
router.get('/:id', protect, validate(announcementIdParamsSchema), getAnnouncementById);

router.post('/',
  protect,
  authorize(ROLES.SYSTEM_ADMIN, ROLES.SECRETARY),
  upload.fields([{ name: 'coverImage', maxCount: 1 }, { name: 'galleryImages', maxCount: 8 }]),
  cleanupTempUploads,
  parseAnnouncementUploads,
  validate(createAnnouncementSchema),
  createAnnouncement
);

router.put('/:id',
  protect,
  authorize(ROLES.SYSTEM_ADMIN, ROLES.SECRETARY),
  upload.fields([{ name: 'coverImage', maxCount: 1 }, { name: 'galleryImages', maxCount: 8 }]),
  cleanupTempUploads,
  parseAnnouncementUploads,
  validate(updateAnnouncementSchema),
  updateAnnouncement
);

router.patch('/:id/toggle-publish',
  protect,
  authorize(ROLES.SYSTEM_ADMIN, ROLES.SECRETARY),
  validate(announcementIdParamsSchema),
  togglePublish
);

router.delete('/:id',
  protect,
  authorize(ROLES.SYSTEM_ADMIN),
  validate(announcementIdParamsSchema),
  deleteAnnouncement
);

module.exports = router;
