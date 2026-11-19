const asyncHandler = require('express-async-handler');
const { createPdfUploadSignature, deleteVerifiedPdfUpload } = require('../utils/cloudinaryDirectPdfUpload');

const getPdfUploadSignature = asyncHandler(async (req, res) => {
  res.json({ success: true, data: createPdfUploadSignature() });
});

const discardPdfUpload = asyncHandler(async (req, res) => {
  await deleteVerifiedPdfUpload(req.body?.pdfUpload);
  res.json({ success: true });
});

module.exports = { getPdfUploadSignature, discardPdfUpload };
