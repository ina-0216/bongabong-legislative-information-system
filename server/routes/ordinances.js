const express = require('express');
const router = express.Router();
const multer = require('multer');
const { MAX_ORDINANCE_PDF_BYTES } = require('../utils/uploadLimits');
const { createTempUploadStorage, cleanupTempUploads } = require('../utils/tempUploadStorage');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { objectIdParamsSchema } = require('../validations/commonValidation');
const { ROLES } = require('../utils/constants');
const {
  createOrdinanceSchema,
  updateOrdinanceStatusSchema,
  rejectOrdinanceSchema,
  assignCommitteeSchema,
  updateOrdinanceSchema,
  amendOrdinanceSchema,
  committeeReportSchema,
} = require('../validations/ordinanceValidation');
const {
  getOrdinances,
  getOrdinanceStats,
  getOrdinanceById,
  getNextOrdinanceNumber,
  createOrdinance,
  updateOrdinanceStatus,
  rejectOrdinance,
  assignCommittee,
  amendOrdinance,
  updateOrdinance,
  saveCommitteeReport,
  downloadOrdinancePdf,
  backfillTranslations,
} = require('../controllers/ordinanceController');
const { getPdfUploadSignature, discardPdfUpload } = require('../controllers/pdfUploadController');

const pdfExtraction = require('./pdfExtraction');

const upload = multer({
  storage: createTempUploadStorage({ pdf: MAX_ORDINANCE_PDF_BYTES }),
  limits: { fileSize: MAX_ORDINANCE_PDF_BYTES, files: 1, fields: 40, parts: 41, fieldSize: 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed.'));
  },
});

const parsePdfUploadField = (req, res, next) => {
  if (typeof req.body?.pdfUpload !== 'string') return next();
  try {
    req.body.pdfUpload = JSON.parse(req.body.pdfUpload);
    return next();
  } catch {
    res.status(400);
    return next(new Error('Invalid signed PDF upload details.'));
  }
};

router.get('/', protect, getOrdinances);

router.get('/stats', protect, getOrdinanceStats);

router.get('/next-number', protect, getNextOrdinanceNumber);

router.post(
  '/pdf-upload-signature',
  protect,
  authorize(ROLES.SECRETARY, ROLES.SYSTEM_ADMIN),
  getPdfUploadSignature,
);
router.post(
  '/pdf-upload-discard',
  protect,
  authorize(ROLES.SECRETARY, ROLES.SYSTEM_ADMIN),
  discardPdfUpload,
);

router.get('/:id', protect, validate(objectIdParamsSchema()), getOrdinanceById);

router.post('/', 
  protect, 
  authorize(ROLES.SECRETARY, ROLES.SYSTEM_ADMIN), 
  upload.single('pdf'),
  cleanupTempUploads,
  parsePdfUploadField,
  validate(createOrdinanceSchema),
  createOrdinance
);


router.put('/:id/assign-committee',
  protect,
  authorize(ROLES.SECRETARY, ROLES.SYSTEM_ADMIN),
  validate(assignCommitteeSchema),
  assignCommittee
);

router.put('/:id/status', 
  protect, 
  authorize(ROLES.SECRETARY, ROLES.SYSTEM_ADMIN), 
  validate(updateOrdinanceStatusSchema),
  updateOrdinanceStatus
);

router.put('/:id/reject',
  protect,
  authorize(ROLES.SECRETARY, ROLES.SYSTEM_ADMIN),
  validate(rejectOrdinanceSchema),
  rejectOrdinance
);

router.put('/:id/amend', 
  protect, 
  authorize(ROLES.SECRETARY, ROLES.SYSTEM_ADMIN), 
  validate(amendOrdinanceSchema),
  amendOrdinance
);

router.put('/:id/committee-report', 
  protect, 
  authorize(ROLES.SECRETARY, ROLES.SYSTEM_ADMIN), 
  validate(committeeReportSchema),
  saveCommitteeReport
);

router.put('/:id',
  protect,
  authorize(ROLES.SECRETARY, ROLES.SYSTEM_ADMIN),
  upload.single('pdf'),
  cleanupTempUploads,
  parsePdfUploadField,
  validate(updateOrdinanceSchema),
  updateOrdinance
);

router.use('/extract-text', pdfExtraction);

router.get('/:id/generate-pdf', protect, authorize(ROLES.SECRETARY, ROLES.SYSTEM_ADMIN), validate(objectIdParamsSchema()), downloadOrdinancePdf);

router.post('/backfill-translations', 
  protect, 
  authorize(ROLES.SYSTEM_ADMIN), 
  backfillTranslations
);

module.exports = router;
