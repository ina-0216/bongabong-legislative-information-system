const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');

const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 30 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [notifications, total] = await Promise.all([
    Notification.find({ recipientId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Notification.countDocuments({ recipientId: req.user._id })
  ]);

  res.json({ docs: notifications, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipientId: req.user._id },
    { isRead: true },
    { new: true }
  );
  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }
  res.json({ message: 'Marked as read' });
});

const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { recipientId: req.user._id, isRead: false },
    { isRead: true }
  );
  res.json({
    message: 'All marked as read',
    count: result.modifiedCount || 0,
  });
});

// H-2 fix: delete a single notification belonging to the authenticated user
const deleteNotification = asyncHandler(async (req, res) => {
  const deleted = await Notification.findOneAndDelete({
    _id: req.params.id,
    recipientId: req.user._id,
  });
  if (!deleted) {
    res.status(404);
    throw new Error('Notification not found');
  }
  res.json({ message: 'Notification deleted' });
});

// H-2 fix: bulk-clear all read notifications for the authenticated user
const deleteAllRead = asyncHandler(async (req, res) => {
  const result = await Notification.deleteMany({
    recipientId: req.user._id,
    isRead: true,
  });
  res.json({ message: `${result.deletedCount} read notification(s) cleared` });
});

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
};
