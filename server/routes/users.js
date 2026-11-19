const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ROLES } = require('../utils/constants');
const { MAX_PHOTO_UPLOAD_BYTES } = require('../utils/uploadLimits');
const {
  getUsersSchema,
  createUserSchema,
  updateStatusSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
} = require('../validations/userValidation');
const {
  getUsers,
  getMe,
  createUser,
  adminResetPassword,
  updateUserStatus,
  updateProfile,
  updateAvatar,
  changePassword,
} = require('../controllers/userController');

const avatarUpload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed (JPEG, PNG, WebP, GIF).'));
  }
});

router.get('/',        protect, authorize(ROLES.SYSTEM_ADMIN), validate(getUsersSchema), getUsers);
router.get('/me',      protect, getMe);
router.put('/profile', protect, validate(updateProfileSchema), updateProfile);
router.put('/avatar',  protect, avatarUpload.single('avatar'), updateAvatar);

router.post('/',                protect, authorize(ROLES.SYSTEM_ADMIN), validate(createUserSchema),   createUser);
router.put('/:id/reset-password', protect, authorize(ROLES.SYSTEM_ADMIN), validate(resetPasswordSchema), adminResetPassword);
router.put('/:id/status',       protect, authorize(ROLES.SYSTEM_ADMIN), validate(updateStatusSchema), updateUserStatus);
router.put('/:id/password',     protect, validate(changePasswordSchema), changePassword);

module.exports = router;
