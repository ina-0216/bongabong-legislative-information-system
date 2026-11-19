/**
 * PDF/DOCX Text Extraction Routes
 *
 * Provides an endpoint for extracting text from uploaded legislative
 * documents (PDF/DOCX) so that form fields can be auto-populated during
 * ordinance/resolution creation.
 *
 * Route: POST /api/ordinances/extract-text
 * Auth: protect + authorize(SECRETARY, SYSTEM_ADMIN)
 * Input: multipart/form-data with 'file' field (PDF up to 100 MB or DOCX up to 15 MB)
 * Output: JSON with extracted text, source type, and confidence info
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  MAX_ORDINANCE_PDF_BYTES,
  MAX_DOCUMENT_EXTRACTION_DOCX_BYTES,
} = require('../utils/uploadLimits');
const { createTempUploadStorage, cleanupTempUploads } = require('../utils/tempUploadStorage');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');
const {
  extractDocumentText,
} = require('../controllers/pdfExtractController');

const upload = multer({
  storage: createTempUploadStorage({
    'file:application/pdf': MAX_ORDINANCE_PDF_BYTES,
    'file:application/vnd.openxmlformats-officedocument.wordprocessingml.document': MAX_DOCUMENT_EXTRACTION_DOCX_BYTES,
  }),
  limits: { fileSize: MAX_ORDINANCE_PDF_BYTES, files: 1, fields: 0, parts: 1 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed.'));
    }
  },
});

/**
 * POST /api/ordinances/extract-text
 * Extract text from uploaded PDF/DOCX file for auto-populating form fields.
 *
 * @body {File} file - PDF or DOCX file buffer
 * @returns {JSON} { success, text, sourceType, numPages, info, error }
 */

router.post(
  '/',
  protect,
  authorize(ROLES.SECRETARY, ROLES.SYSTEM_ADMIN),
  upload.single('file'),
  cleanupTempUploads,
  extractDocumentText
);

module.exports = router;
