const mongoose = require('mongoose');
const { Schema } = mongoose;

const NotificationSchema = new Schema({
  recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  link: { type: String, default: '' }
}, { timestamps: true });

// Fast per-user notification queries (unread count, paginated list)
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
// Auto-expire notifications after 60 days to prevent unbounded growth
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 3600 });

module.exports = mongoose.model('Notification', NotificationSchema);
