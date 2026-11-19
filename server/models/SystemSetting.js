const mongoose = require('mongoose');
const { Schema } = mongoose;

const SystemSettingSchema = new Schema({
  key: { type: String, required: true, unique: true, trim: true },
  pdfHeaderUrl: { type: String, default: '' },
  pdfHeaderPublicId: { type: String, default: '' },
  pdfHeaderMimeType: { type: String, enum: ['application/pdf', 'image/png', 'image/jpeg', ''], default: '' },
}, { timestamps: true });

module.exports = mongoose.model('SystemSetting', SystemSettingSchema);
