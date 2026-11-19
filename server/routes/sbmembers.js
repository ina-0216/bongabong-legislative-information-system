const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createSbMemberSchema, updateSbMemberSchema, sbMemberIdParamsSchema } = require('../validations/sbMemberValidation');
const {
  getSbMembers,
  createSbMember,
  updateSbMember,
  deleteSbMember,
} = require('../controllers/sbMemberController');
const { ROLES } = require('../utils/constants');
const { MAX_PHOTO_UPLOAD_BYTES } = require('../utils/uploadLimits');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed (JPEG, PNG, WebP, GIF).'));
  }
});

router.get('/', protect, getSbMembers);

router.post('/', 
  protect, 
  authorize(ROLES.SYSTEM_ADMIN, ROLES.SECRETARY), // Assuming we restrict this to admins
  upload.single('photo'), 
  validate(createSbMemberSchema),
  createSbMember
);

router.put('/:id', 
  protect, 
  authorize(ROLES.SYSTEM_ADMIN, ROLES.SECRETARY), 
  upload.single('photo'), 
  validate(updateSbMemberSchema),
  updateSbMember
);

router.delete('/:id', 
  protect, 
  authorize(ROLES.SYSTEM_ADMIN, ROLES.SECRETARY), 
  validate(sbMemberIdParamsSchema),
  deleteSbMember
);

module.exports = router;
