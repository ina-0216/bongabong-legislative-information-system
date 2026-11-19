const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');
const { syncViceMayors, migrateCommittees } = require('../controllers/systemController');
const multer = require('multer');
const { MAX_PDF_HEADER_BYTES } = require('../utils/uploadLimits');
const { getPdfHeaderSettings, updatePdfHeaderSettings } = require('../controllers/systemController');

const pdfHeaderUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_HEADER_BYTES, files: 1, fields: 0, parts: 1 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else {
      const error = new Error('Only PDF header files are allowed.');
      error.statusCode = 400;
      cb(error);
    }
  },
});

// Active utility routes — still useful for admin operations.
router.post('/sync-vice-mayors',   protect, authorize(ROLES.SYSTEM_ADMIN), syncViceMayors);
router.post('/migrate-committees', protect, authorize(ROLES.SYSTEM_ADMIN), migrateCommittees);
router.get('/pdf-header', protect, authorize(ROLES.SYSTEM_ADMIN), getPdfHeaderSettings);
router.put('/pdf-header', protect, authorize(ROLES.SYSTEM_ADMIN), pdfHeaderUpload.single('header'), updatePdfHeaderSettings);

// Keep the original /api/pdf-header URLs working while also exposing the
// documented /api/system/pdf-header URLs used by the admin client.
router.get('/system/pdf-header', protect, authorize(ROLES.SYSTEM_ADMIN), getPdfHeaderSettings);
router.put('/system/pdf-header', protect, authorize(ROLES.SYSTEM_ADMIN), pdfHeaderUpload.single('header'), updatePdfHeaderSettings);

module.exports = router;
