const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createTermSchema, updateTermSchema, termIdParamsSchema } = require('../validations/termValidation');
const {
  getTerms,
  getTerm,
  createTerm,
  updateTerm,
  deleteTerm,
} = require('../controllers/termController');
const { ROLES } = require('../utils/constants');

router.get('/', getTerms);

router.get('/:id', protect, validate(termIdParamsSchema), getTerm);

router.post('/', 
  protect, 
  authorize(ROLES.SYSTEM_ADMIN, ROLES.SECRETARY), 
  validate(createTermSchema),
  createTerm
);

router.put('/:id', 
  protect, 
  authorize(ROLES.SYSTEM_ADMIN, ROLES.SECRETARY), 
  validate(updateTermSchema),
  updateTerm
);

router.delete('/:id', 
  protect, 
  authorize(ROLES.SYSTEM_ADMIN, ROLES.SECRETARY), 
  validate(termIdParamsSchema),
  deleteTerm
);

module.exports = router;
