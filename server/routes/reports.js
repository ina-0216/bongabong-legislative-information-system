const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');
const validate = require('../middleware/validate');
const { objectIdParamsSchema } = require('../validations/commonValidation');
const {
  getCommitteeReport,
  getAnnualReport,
  getParticipationReport,
  getTimelineReport,
  getMinutesReport,
  getDocumentPdf,
} = require('../controllers/reportController');

const REPORT_ROLES = [ROLES.SECRETARY, ROLES.VICE_MAYOR, ROLES.SB_MEMBER, ROLES.SYSTEM_ADMIN];

router.get('/committee/:ordinanceId', protect, authorize(...REPORT_ROLES), validate(objectIdParamsSchema('ordinanceId')), getCommitteeReport);

router.get('/annual', protect, authorize(...REPORT_ROLES), getAnnualReport);

router.get('/participation/:ordinanceId', protect, authorize(...REPORT_ROLES), validate(objectIdParamsSchema('ordinanceId')), getParticipationReport);

router.get('/timeline/:ordinanceId', protect, authorize(...REPORT_ROLES), validate(objectIdParamsSchema('ordinanceId')), getTimelineReport);

router.get('/minutes/:sessionId', protect, authorize(...REPORT_ROLES), validate(objectIdParamsSchema('sessionId')), getMinutesReport);

router.get('/document/:id', protect, authorize(...REPORT_ROLES), validate(objectIdParamsSchema()), getDocumentPdf);

module.exports = router;
