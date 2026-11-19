const User = require('../models/User');

/**
 * Runs daily at midnight.
 * Automatically deactivates Vice Mayor / SB Member accounts
 * whose term end date has passed.
 */
const autoDeactivateExpiredTerms = async () => {
  try {
    const now = new Date();
    const result = await User.updateMany(
      {
        role: { $in: ['Vice Mayor', 'SB Member'] },
        status: 'Active',
        termEnd: { $lt: now, $ne: null }
      },
      { $set: { status: 'Deactivated' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`[CRON] Auto-deactivated ${result.modifiedCount} official(s) whose term has ended.`);
    } else {
      console.log('[CRON] No expired official terms found.');
    }
  } catch (error) {
    console.error('[CRON] Error during term auto-deactivation:', error);
  }
};

module.exports = autoDeactivateExpiredTerms;
