const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');
const {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../validations/authValidation');
const {
  login,
  forgotPassword,
  resetPassword,
  seedAdmin,
  resetAdminPassword,
  resendInvitation,
} = require('../controllers/authController');

router.post('/login',           validate(loginSchema),          login);
router.post('/forgot-password', validate(forgotPasswordSchema),  forgotPassword);
router.post('/reset-password/:token', validate(resetPasswordSchema), resetPassword);
router.post('/users/:id/resend-invitation', protect, authorize(ROLES.SYSTEM_ADMIN), resendInvitation);

// SEC-04: These endpoints are disabled (return 403) in authController.
router.post('/seed-admin',         protect, authorize(ROLES.SYSTEM_ADMIN), seedAdmin);
router.post('/reset-admin-password', protect, authorize(ROLES.SYSTEM_ADMIN), resetAdminPassword);

module.exports = router;
