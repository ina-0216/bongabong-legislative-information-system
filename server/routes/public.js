const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { MAX_PHOTO_UPLOAD_BYTES } = require('../utils/uploadLimits');
const validate = require('../middleware/validate');
const { objectIdParamsSchema } = require('../validations/commonValidation');
const {
  getDocumentsSchema,
  paginatedPublicQuerySchema,
  getAnnouncementsSchema,
  guestConsultSchema,
  sendOtpSchema,
  sendEmailVerificationSchema,
  verifyEmailCodeSchema,
  termFilterSchema,
  publicFeedbackIdSchema,
} = require('../validations/publicValidation');
const { publicConsultationStatusSchema, publicConsultationAppealSchema } = require('../validations/consultationValidation');
const {
  getPublicStats,
  getPublicDocuments,
  getPublicDocumentById,
  getPublicDocumentPdf,
  getPublicSessions,
  getPublicMembers,
  getLatestDocuments,
  getRecentSessions,
  getPublicMinutes,
  sendOtp,
  sendPublicEmailVerification,
  verifyPublicEmailCode,
  submitGuestConsultation,
  getPublicCommittees,
  getPublicTerms,
  getPublicAnnouncements,
  getPublicAnnouncementById,
  getFeaturedAnnouncements,
  getPublicConsultationStatus,
  submitPublicConsultationAppeal,
} = require('../controllers/publicController');

// Guest uploads are public and buffered before OTP/body validation, so keep
// their request rate and multipart parser work bounded independently of the
// broader API limit.
const guestConsultUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many consultation submissions. Please try again later.' },
});

const emailVerificationSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many email verification requests. Please wait and try again.' },
});

const emailVerificationCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many verification attempts. Please wait and try again.' },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PHOTO_UPLOAD_BYTES,
    files: 1,
    fields: 9,
    parts: 10,
    fieldSize: 16 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else {
      const error = new Error('Only image files are allowed (JPEG, PNG, WebP, GIF).');
      error.statusCode = 400;
      cb(error);
    }
  }
});

router.get('/stats',                             getPublicStats);
router.get('/documents',        validate(getDocumentsSchema), getPublicDocuments);
router.get('/documents/:id/pdf', validate(objectIdParamsSchema()), getPublicDocumentPdf);
router.get('/documents/:id',    validate(objectIdParamsSchema()), getPublicDocumentById);
router.get('/sessions',        validate(paginatedPublicQuerySchema), getPublicSessions);
router.get('/members',          validate(termFilterSchema), getPublicMembers);
router.get('/latest',                            getLatestDocuments);
router.get('/recent-sessions',                   getRecentSessions);
router.get('/minutes/:sessionId', validate(objectIdParamsSchema('sessionId')), getPublicMinutes);
router.get('/committees',       validate(termFilterSchema), getPublicCommittees);
router.get('/terms',                             getPublicTerms);
router.get('/news',            validate(getAnnouncementsSchema), getPublicAnnouncements);
router.get('/news/featured',                     getFeaturedAnnouncements);
router.get('/news/:id',         validate(objectIdParamsSchema()), getPublicAnnouncementById);
router.post('/send-otp',        validate(sendOtpSchema),      sendOtp);
router.post('/send-email-verification', emailVerificationSendLimiter, validate(sendEmailVerificationSchema), sendPublicEmailVerification);
router.post('/verify-email-code', emailVerificationCheckLimiter, validate(verifyEmailCodeSchema), verifyPublicEmailCode);
router.post('/consult/:id/guest', guestConsultUploadLimiter, upload.single('idImage'), validate(guestConsultSchema), submitGuestConsultation);
router.post('/consult/:id/status', validate(publicConsultationStatusSchema), getPublicConsultationStatus);
router.post('/consult/:id/appeal', validate(publicConsultationAppealSchema), submitPublicConsultationAppeal);

// Public: get approved feedback/comments for an ordinance
const ConsultationFeedback = require('../models/ConsultationFeedback');
const Ordinance = require('../models/Ordinance');
const { toPublicFeedback, buildPublicFeedbackFilter } = require('../utils/publicFeedback');
router.get('/consult/:id/public', validate(publicFeedbackIdSchema), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Document not found.' });
    const ordinance = await Ordinance.findOne({
      _id: req.params.id,
      type: 'Ordinance',
      isDraft: { $ne: true },
      status: { $ne: 'Draft' },
    }).select('_id');
    if (!ordinance) return res.status(404).json({ error: 'Document not found.' });

    const feedback = await ConsultationFeedback.find(buildPublicFeedbackFilter(req.params.id))
    .select('vote comment sentiment createdAt')
    .sort({ createdAt: -1 })
    .limit(50);
    res.json(feedback.map(toPublicFeedback));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feedback.' });
  }
});

module.exports = router;
