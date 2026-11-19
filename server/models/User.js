const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  firstName: { type: String, required: true, trim: true },
  middleName: { type: String, trim: true, default: '' },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['System Admin', 'Secretary', 'Vice Mayor', 'SB Member'],
    required: true
  },

  contactNumber: { type: String, required: true },
  status: {
    type: String,
    enum: ['Pending', 'Active', 'Deactivated'],
    default: 'Active'
  },

  position: {
    type: String,
    required: function () { return ['Vice Mayor', 'SB Member'].includes(this.role); }
  },
  termStart: { type: Date },
  termEnd: { type: Date },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  mustChangePassword: { type: Boolean, default: false },
  tokenVersion: { type: Number, default: 0 },
  profilePicture: { type: String, default: '' },
  profilePicturePublicId: { type: String, default: '' },
  // Legacy lockout fields retained for compatibility; login throttling is now
  // enforced per source IP so unauthenticated traffic cannot lock a victim out.
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  lastFailedLoginAt: { type: Date, default: null }
}, { timestamps: true });

// Virtual full name — mirrors the SBMember pattern so all existing
// code that reads user.name continues to work with zero changes.
UserSchema.virtual('name').get(function () {
  return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
});

UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ contactNumber: 1 }, { unique: true });
UserSchema.index({ resetPasswordToken: 1 });
UserSchema.index({ resetPasswordExpires: 1 });
UserSchema.index({ mustChangePassword: 1 });

// SEC-01: Enforce position requirement for Vice Mayor and SB Member roles
// on every save (create or update). The schema validator only runs on
// creation; this middleware ensures updates cannot clear the position.
UserSchema.pre('save', function (next) {
  if (['Vice Mayor', 'SB Member'].includes(this.role) && !this.position?.trim()) {
    return next(new Error('Position is required for Vice Mayor and SB Member roles'));
  }
  next();
});

UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', UserSchema);
