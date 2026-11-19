const mongoose = require('mongoose');
const { Schema } = mongoose;

const ConsultationFeedbackSchema = new Schema({
  ordinanceId: { type: Schema.Types.ObjectId, ref: 'Ordinance', required: true },
  full_name: { type: String, required: true, trim: true },
  barangay: { type: String, required: true, trim: true },
  contact_number: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true, default: '' },
  id_attachment_url: { type: String, default: '' },
  id_attachment_public_id: { type: String, default: '' },
  id_attachment_format: { type: String, default: 'jpg' },
  id_attachment_type: { type: String, enum: ['upload', 'authenticated'], default: 'upload' },
  id_attachment_legacy_public_id: { type: String, default: '' },
  vote: { type: String, enum: ['Agree', 'Disagree', 'Neutral', 'None'], default: 'None' },
  comment: { type: String, trim: true },
  // `status` remains populated for older readers. New workflow decisions are
  // stored independently so a comment review cannot control vote eligibility.
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  eligibility_status: {
    type: String,
    enum: ['Pending', 'Approved', 'RejectionRequested', 'Rejected', 'AppealPending'],
    default: undefined,
  },
  comment_status: {
    type: String,
    enum: ['Pending', 'Approved', 'RejectionRequested', 'Rejected', 'AppealPending', 'NotProvided'],
    default: undefined,
  },
  assigned_reviewer: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  review_due_at: { type: Date, default: null },
  eligibility_review_history: [{
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: ['Approve', 'RequestRejection', 'ConfirmApprove', 'ConfirmRejection', 'AppealApprove', 'AppealReject'], required: true },
    reason: { type: String, trim: true, default: '' },
    createdAt: { type: Date, default: Date.now },
  }],
  comment_review_history: [{
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: ['Approve', 'RequestRejection', 'ConfirmApprove', 'ConfirmRejection', 'AppealApprove', 'AppealReject'], required: true },
    reason: { type: String, trim: true, default: '' },
    createdAt: { type: Date, default: Date.now },
  }],
  public_appeals: [{
    target: { type: String, enum: ['eligibility', 'comment'], required: true },
    reason: { type: String, trim: true, required: true },
    createdAt: { type: Date, default: Date.now },
  }],
  id_scan: {
    status: { type: String, enum: ['Complete', 'LowConfidence', 'Unavailable'], default: 'Unavailable' },
    confidence: { type: Number, min: 0, max: 100, default: null },
    nameMatch: { type: String, enum: ['Match', 'Partial', 'NotFound', 'NotChecked'], default: 'NotChecked' },
    flags: { type: [String], default: [] },
    scannedAt: { type: Date, default: null },
  },
  appeal_token_hash: { type: String, default: '' },
  appeal_expires_at: { type: Date, default: null },
  sentiment: { type: String, enum: ['Positive', 'Negative', 'Neutral'], default: 'Neutral' },
  data_privacy_consent: { type: Boolean, default: false },
  approval_source: { type: String, enum: ['Automatic', 'Staff'], default: undefined },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  approved_at: { type: Date, default: null }
}, { timestamps: true });

ConsultationFeedbackSchema.index({ ordinanceId: 1, full_name: 1, contact_number: 1 }, { unique: true });
ConsultationFeedbackSchema.index({ ordinanceId: 1, status: 1, createdAt: -1 });
ConsultationFeedbackSchema.index({ ordinanceId: 1, eligibility_status: 1, createdAt: -1 });
ConsultationFeedbackSchema.index({ ordinanceId: 1, comment_status: 1, createdAt: -1 });
ConsultationFeedbackSchema.index({ appeal_token_hash: 1 }, { sparse: true });
ConsultationFeedbackSchema.index({ barangay: 1 });
ConsultationFeedbackSchema.index({ vote: 1 });
ConsultationFeedbackSchema.index({ sentiment: 1 });
ConsultationFeedbackSchema.index({ approved_by: 1 });
ConsultationFeedbackSchema.index({ approved_at: -1 });

module.exports = mongoose.model('ConsultationFeedback', ConsultationFeedbackSchema);
