const mongoose = require('mongoose');

const SBMemberSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  middleName: { type: String, trim: true, default: '' },
  lastName: { type: String, required: true, trim: true },
  position: { type: String, required: true, trim: true }, // e.g. "Vice Mayor", "SB Member"
  photoUrl: { type: String, default: '' },
  photoPublicId: { type: String, default: '' },
  biography: { type: String, default: '' },
  termId: { type: mongoose.Schema.Types.ObjectId, ref: 'Term' },
  committees: [{ type: String }],
  termStart: { type: Date },
  termEnd: { type: Date },
  contactEmail: { type: String, default: '' },
  fbLink: { type: String, default: '' },
  sbNumber: { type: String, default: '' }, // e.g. "12th SB"
  order: { type: Number, min: 1, default: 1 }, // one-based display ordering
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

SBMemberSchema.virtual('name').get(function() {
  if (this.middleName) {
    return `${this.firstName} ${this.middleName} ${this.lastName}`;
  }
  return `${this.firstName} ${this.lastName}`;
});

SBMemberSchema.index({ termId: 1, position: 1 });
SBMemberSchema.index({ termId: 1, isActive: 1 });
SBMemberSchema.index({ order: 1 });
SBMemberSchema.index({ committees: 1 });

SBMemberSchema.set('toJSON', { virtuals: true });
SBMemberSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('SBMember', SBMemberSchema);
