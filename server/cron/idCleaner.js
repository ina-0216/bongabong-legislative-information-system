const mongoose = require('mongoose');
const path = require('path');
const ConsultationFeedback = require('../models/ConsultationFeedback');
const { deleteFromCloudinary } = require('../utils/cloudinary');

const cleanOldIds = async () => {
  try {
    console.log('[CRON] Starting ID auto-deletion script for DPA compliance...');

    // Find records older than 30 days that still have an ID attachment
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldFeedbacks = await ConsultationFeedback.find({
      createdAt: { $lt: thirtyDaysAgo },
      $or: [
        { id_attachment_url: { $type: 'string', $ne: '' } },
        { id_attachment_public_id: { $type: 'string', $ne: '' } },
        { id_attachment_legacy_public_id: { $type: 'string', $ne: '' } },
      ]
    });

    if (oldFeedbacks.length === 0) {
      console.log('[CRON] No old IDs found to delete.');
      return;
    }

    let deletedCount = 0;

    for (const feedback of oldFeedbacks) {
      const attachmentPublicIds = [feedback.id_attachment_public_id, feedback.id_attachment_legacy_public_id].filter(Boolean);
      if (!attachmentPublicIds.length) {
        console.error(`[CRON] Cannot delete expired ID for feedback ${feedback._id}: missing Cloudinary public ID.`);
        continue;
      }

      try {
        for (const publicId of new Set(attachmentPublicIds)) {
          const result = await deleteFromCloudinary(publicId, 'image');
          if (!['ok', 'not found', 'already deleted'].includes(String(result?.result || '').toLowerCase())) {
            throw new Error(`Cloudinary delete failed: ${result?.result || 'unknown'}`);
          }
        }

        feedback.id_attachment_url = '';
        feedback.id_attachment_public_id = '';
        feedback.id_attachment_legacy_public_id = '';
        await feedback.save();
        deletedCount++;
      } catch (cloudinaryErr) {
        console.error(`[CRON] Failed to delete Cloudinary image for feedback ${feedback._id}; retaining references for retry:`, cloudinaryErr.message);
      }
    }

    console.log(`[CRON] Successfully deleted ${deletedCount} old ID attachments.`);
  } catch (error) {
    console.error('[CRON] Error during ID cleanup:', error);
  }
};

module.exports = cleanOldIds;

// If run directly
if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('[CRON] MONGODB_URI is required to run ID cleanup.');
    process.exit(1);
  }

  mongoose.connect(mongoUri)
    .then(async () => {
      await cleanOldIds();
      process.exit(0);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
