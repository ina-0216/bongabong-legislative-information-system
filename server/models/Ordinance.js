const mongoose = require('mongoose');
const { Schema } = mongoose;
const { ORDINANCE_STATUSES } = require('../utils/constants');

const OrdinanceSchema = new Schema({
  type: { type: String, enum: ['Ordinance', 'Resolution'], default: 'Ordinance' },
  number: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  title_tl: { type: String, trim: true, default: '' },
  proponentId: { type: Schema.Types.ObjectId, ref: 'SBMember', required: true },
  termId: { type: Schema.Types.ObjectId, ref: 'Term' },
  committee: { type: String, default: '' },
  sectorTag: { type: String, default: 'General' },
  isDraft: { type: Boolean, default: false },
  filedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  filedAt: { type: Date },
  seriesYear: { type: Number },
  coAuthors: [{ type: Schema.Types.ObjectId, ref: 'SBMember' }],
  committeeAssignment: {
    committee: { type: String, default: '' },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date },
    notes: { type: String, default: '' }
  },
  // Resolution deliberation and action fields
  motionBy: { type: Schema.Types.ObjectId, ref: 'SBMember' },
  secondedBy: [{ type: Schema.Types.ObjectId, ref: 'SBMember' }],
  adoptionResult: { type: String, default: '' },
  adoptionDate: { type: Date },
  distribution: [{ type: String }],
  explanatoryNote: { type: String, required: function () { return !this.isDraft; } },
  definitionsOfTerms: { type: String, default: '' },
  enactingClause: { type: String },
  provisions: { type: String, required: function () { return !this.isDraft; } },
  penaltyClause: { type: String },
  effectivityDate: { type: Date },
  pdfUrl: { type: String },
  status: { type: String, enum: ORDINANCE_STATUSES, default: 'First Reading' },
  plainLanguageSummary: { type: String },
  plainLanguageSummary_tl: { type: String },
  isLocked: { type: Boolean, default: false },
  amendsOrdinanceId: { type: Schema.Types.ObjectId, ref: 'Ordinance', default: null },
  amendedByOrdinanceId: { type: Schema.Types.ObjectId, ref: 'Ordinance', default: null },
  // Legacy structured text is retained for migration/backward compatibility.
  // New and edited measures keep their complete legal body in `provisions`.
  sections: [{
    title: { type: String },
    content: { type: String }
  }],
  committeeReport: {
    findings: { type: String },
    recommendation: { type: String },
    viceSecretaryName: { type: String },
    createdAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  timeline: [{
    status: { type: String, required: true },
    notes: { type: String },
    session: { type: Schema.Types.ObjectId, ref: 'Session', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now }
  }],
  rejection: {
    reason: { type: String, default: '' },
    minutesReference: { type: String, default: '' },
    stage: { type: String, default: '' },
    recordedAt: { type: Date },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    session: { type: Schema.Types.ObjectId, ref: 'Session', default: null },
    voteTally: {
      votesFor: { type: Number },
      votesAgainst: { type: Number },
      abstentions: { type: Number },
      absent: { type: Number },
    },
  }
}, { timestamps: true });

OrdinanceSchema.index({ status: 1, createdAt: -1 });
OrdinanceSchema.index({ number: 1, termId: 1 }, { unique: true });
OrdinanceSchema.index({ committee: 1, status: 1 });
OrdinanceSchema.index({ termId: 1, createdAt: -1 });
OrdinanceSchema.index({ proponentId: 1 });
OrdinanceSchema.index({ sectorTag: 1 });
OrdinanceSchema.index({ type: 1, status: 1 });
OrdinanceSchema.index({ 'timeline.status': 1 });
OrdinanceSchema.index({ amendsOrdinanceId: 1 });
OrdinanceSchema.index({ amendedByOrdinanceId: 1 });
OrdinanceSchema.index({
  title: 'text',
  title_tl: 'text',
  number: 'text',
  plainLanguageSummary: 'text',
  plainLanguageSummary_tl: 'text',
}, { name: 'ordinance_fulltext', weights: { title: 10, number: 8, title_tl: 7, plainLanguageSummary: 3 } });

// SEC-02: Prevent self-referencing amendment links at the schema level. A
// measure cannot amend itself or form a direct circular pair in one save.
// The controller enforces the broader acyclic invariant across the chain.
OrdinanceSchema.pre('validate', function (next) {
  if (this.amendsOrdinanceId && this._id && this.amendsOrdinanceId.equals(this._id)) {
    return next(new Error('A measure cannot amend itself.'));
  }
  if (this.amendedByOrdinanceId && this._id && this.amendedByOrdinanceId.equals(this._id)) {
    return next(new Error('A measure cannot be amended by itself.'));
  }
  next();
});

module.exports = mongoose.model('Ordinance', OrdinanceSchema);
