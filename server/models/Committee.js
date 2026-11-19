const mongoose = require('mongoose');
const { Schema } = mongoose;

const CommitteeSchema = new Schema({
  name: { type: String, required: true, trim: true },
  termId: { type: Schema.Types.ObjectId, ref: 'Term' },
  chairperson: { type: String, default: '' },
  viceChairperson: { type: String, default: '' },
  members: [{ type: String }],
  description: { type: String, default: '' }
}, { timestamps: true });

CommitteeSchema.index({ name: 1, termId: 1 }, { unique: true });
CommitteeSchema.index({ termId: 1 });
CommitteeSchema.index({ chairperson: 1 });
CommitteeSchema.index({ viceChairperson: 1 });

module.exports = mongoose.model('Committee', CommitteeSchema);
