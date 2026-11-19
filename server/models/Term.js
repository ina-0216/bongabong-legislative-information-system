const mongoose = require('mongoose');
const { Schema } = mongoose;
const { isTermCurrent, isTermUpcoming } = require('../utils/termCalendar');

const TermSchema = new Schema({
  label: { type: String, required: true, trim: true, unique: true }, // e.g., "12th Sangguniang Bayan"
  startYear: { type: Number, required: true },
  endYear: { type: Number, required: true },
  description: { type: String, default: '' },
  presidingOfficer: { type: String, default: '' }
}, { timestamps: true });

TermSchema.pre('validate', function() {
  if (!Number.isInteger(this.startYear) || !Number.isInteger(this.endYear)) return;
  // Reject impossible year values before the span check so an endYear that
  // merely happens to be startYear + 3 cannot slip through.
  if (this.startYear < 1900 || this.startYear > 2100) {
    this.invalidate('startYear', 'Start year must be between 1900 and 2100.');
    return;
  }
  if (this.endYear < 1900 || this.endYear > 2100) {
    this.invalidate('endYear', 'End year must be between 1900 and 2100.');
    return;
  }
  if (this.endYear - this.startYear !== 3) {
    this.invalidate('endYear', 'Legislative terms must span exactly three years.');
    return;
  }
  this.label = `${this.startYear}-${this.endYear} Term`;
});

TermSchema.virtual('isCurrent').get(function() {
  return isTermCurrent(this.startYear, this.endYear);
});
TermSchema.virtual('isUpcoming').get(function() {
  return isTermUpcoming(this.startYear);
});

TermSchema.set('toJSON', {
  transform(_document, term) {
    if (Number.isInteger(term.startYear) && Number.isInteger(term.endYear)) {
      term.label = `${term.startYear}-${term.endYear} Term`;
      term.isCurrent = isTermCurrent(term.startYear, term.endYear);
      term.isUpcoming = isTermUpcoming(term.startYear);
    }
    return term;
  },
});

module.exports = mongoose.model('Term', TermSchema);
