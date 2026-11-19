const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ROLES } = require('../utils/constants');
const { verifyFeedbackSchema, getFeedbackSchema, getPendingFeedbackSchema, getConsultationSubmissionsSchema, feedbackAttachmentSchema } = require('../validations/consultationValidation');
const { getPendingFeedback, getConsultationSubmissions, getFeedbackAttachment, verifyFeedback, getOrdinanceFeedback } = require('../controllers/consultationController');

const REVIEW_ROLES = [ROLES.SECRETARY, ROLES.SYSTEM_ADMIN];
const ANALYTICS_ROLES = [ROLES.SECRETARY, ROLES.VICE_MAYOR, ROLES.SB_MEMBER, ROLES.SYSTEM_ADMIN];

router.get('/submissions',
  protect,
  authorize(...REVIEW_ROLES),
  validate(getConsultationSubmissionsSchema),
  getConsultationSubmissions
);

router.get('/pending',
  protect,
  authorize(...REVIEW_ROLES),
  validate(getPendingFeedbackSchema),
  getPendingFeedback
);

router.get('/:id/attachment',
  protect,
  authorize(...REVIEW_ROLES),
  validate(feedbackAttachmentSchema),
  getFeedbackAttachment
);

router.put('/:id/verify',
  protect,
  authorize(...REVIEW_ROLES),
  validate(verifyFeedbackSchema),
  verifyFeedback
);

router.get('/ordinance/:ordinanceId/feedback',
  protect,
  authorize(...ANALYTICS_ROLES),
  validate(getFeedbackSchema),
  getOrdinanceFeedback
);

module.exports = router;
