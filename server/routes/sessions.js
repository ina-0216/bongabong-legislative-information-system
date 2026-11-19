const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ROLES } = require('../utils/constants');
const { createSessionSchema, updateSessionSchema, sessionIdParamsSchema } = require('../validations/sessionValidation');
const {
  getSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  downloadSessionPdf,
} = require('../controllers/sessionController');

router.get('/', protect, getSessions);

router.get('/:id', protect, validate(sessionIdParamsSchema), getSessionById);

router.post('/', 
  protect, 
  authorize(ROLES.SECRETARY, ROLES.SYSTEM_ADMIN), 
  validate(createSessionSchema),
  createSession
);

router.put('/:id', 
  protect, 
  authorize(ROLES.SECRETARY, ROLES.SYSTEM_ADMIN), 
  validate(updateSessionSchema),
  updateSession
);

router.delete('/:id', 
  protect, 
  authorize(ROLES.SECRETARY, ROLES.SYSTEM_ADMIN), 
  validate(sessionIdParamsSchema),
  deleteSession
);

router.get('/:id/generate-pdf', protect, authorize(ROLES.SECRETARY, ROLES.SYSTEM_ADMIN), validate(sessionIdParamsSchema), downloadSessionPdf);

module.exports = router;
