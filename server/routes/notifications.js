const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { objectIdParamsSchema } = require('../validations/commonValidation');
const { getNotifications, markAsRead, markAllAsRead, deleteNotification, deleteAllRead } = require('../controllers/notificationController');

router.get('/',              protect, getNotifications);
router.put('/read-all',      protect, markAllAsRead);
router.put('/:id/read',      protect, validate(objectIdParamsSchema()), markAsRead);
router.delete('/clear-read', protect, deleteAllRead);
router.delete('/:id',        protect, validate(objectIdParamsSchema()), deleteNotification);

module.exports = router;
