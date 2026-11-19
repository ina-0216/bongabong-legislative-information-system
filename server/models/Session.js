const mongoose = require('mongoose');
const { Schema } = mongoose;

const SessionSchema = new Schema({
  title: { type: String, required: true, trim: true },
  sessionNumber: { type: String, trim: true, default: '' },
  sessionType: { type: String, trim: true, default: 'Regular Session' },
  legislativeBody: { type: String, trim: true, default: '12th Sangguniang Bayan' },
  venue: { type: String, trim: true, default: 'Sangguniang Bayan Session Hall, 2nd Floor, Executive and Legislative Building, Poblacion, Bongabong, Oriental Mindoro' },
  municipality: { type: String, trim: true, default: 'Bongabong, Oriental Mindoro' },
  date: { type: Date, required: true },
  itemsDiscussed: [{ type: Schema.Types.ObjectId, ref: 'Ordinance' }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

  attendance: {
    present: [{ type: Schema.Types.ObjectId, ref: 'SBMember' }],
    onOfficialBusiness: [{ type: Schema.Types.ObjectId, ref: 'SBMember' }],
    absent: [{ type: Schema.Types.ObjectId, ref: 'SBMember' }]
  },
  callToOrder: { type: String, default: '' },
  invocation: { type: String, default: '' },
  rollCall: { type: String, default: '' },
  readingOfPreviousMinutes: { type: String, default: '' },
  orderOfBusiness: { type: String, default: '' },
  privilegeHour: { type: String, default: '' },
  citizensHour: { type: String, default: '' }, // Retained for backwards compatibility with older records
  questionHour: { type: String, default: '' },
  committeeReport: { type: String, default: '' },
  firstReading: { type: String, default: '' },
  unfinishedBusiness: { type: String, default: '' },
  referralForAction: { type: String, default: '' },
  referralForReference: { type: String, default: '' },
  referenceOfBusiness: { type: String, default: '' },
  otherMatters: { type: String, default: '' },
  thanksgivingPrayer: { type: String, default: '' },
  adjournment: { type: String, default: '' },
  status: { type: String, enum: ['Draft', 'Final'], default: 'Draft' }
}, { timestamps: true });

// Virtual for privilegeHour that falls back to citizensHour for backward compatibility
SessionSchema.virtual('effectivePrivilegeHour').get(function() {
  return this.privilegeHour || this.citizensHour || '';
});

SessionSchema.index({ date: -1 });
SessionSchema.index({ status: 1, date: -1 });
SessionSchema.index({ createdBy: 1 });
SessionSchema.index({ 'attendance.present': 1 });
SessionSchema.index({ 'attendance.onOfficialBusiness': 1 });
SessionSchema.index({ 'attendance.absent': 1 });
SessionSchema.index({ 'itemsDiscussed': 1 });

module.exports = mongoose.model('Session', SessionSchema);
