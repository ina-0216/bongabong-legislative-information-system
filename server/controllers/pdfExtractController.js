/**
 * PDF/DOCX Extraction Controller
 *
 * Handles the /api/pdf-extract endpoint. Reads an uploaded PDF or DOCX file,
 * extracts its text, then runs the legislative field-mapper to return
 * structured candidates the authoring form can pre-populate.
 *
 * The extraction flow is:
 *   1. Multer streams the multipart upload to a temporary file.
 *   2. pdfTextExtractor pulls the raw text from that file (pdf-parse / mammoth).
 *   3. documentExtractionService maps known patterns onto form fields
 *      (number, title, proponent, explanatory note, provisions, penalty, etc.)
 *   4. The full payload — including candidate fields with confidence scores —
 *      is returned so the client can show a review modal before the user saves.
 */

const asyncHandler = require('express-async-handler');
const {
  extractText,
} = require('../utils/pdfTextExtractor');
const {
  verifyPdfUpload,
  createTemporaryPdfDownloadUrl,
} = require('../utils/cloudinaryDirectPdfUpload');
const { deleteFromCloudinary } = require('../utils/cloudinary');
const {
  buildExtractionPayload,
} = require('../services/documentExtractionService');

/**
 * POST /api/pdf-extract
 *
 * Reads the file attached to `req.file` (a temporary file supplied by multer),
 * extracts its text, and returns structured field candidates.
 *
 * The response shape:
 *   {
 *     success: true,
 *     data: {
 *       text, textPreview, characterCount, pageCount,
 *       sourceType: 'pdf'|'docx',
 *       overallConfidence: 0..1,
 *       candidates: {
 *         type:      { value, confidence } | null,
 *         number:    { value, confidence } | null,
 *         title:     { value, confidence } | null,
 *         ...
 *       },
 *     }
 *   }
 */
const createExtractDocumentText = (overrides = {}) => {
  const dependencies = {
    extractText,
    verifyPdfUpload,
    createTemporaryPdfDownloadUrl,
    deleteFromCloudinary,
    buildExtractionPayload,
    ...overrides,
  };

  return asyncHandler(async (req, res) => {
    const pdfUpload = req.body?.pdfUpload;
    if (!req.file && !pdfUpload) {
      res.status(400);
      throw new Error('No file uploaded. Please provide a PDF or DOCX file.');
    }

    let temporaryCloudinaryPublicId;
    let extractionResult;
    try {
      if (pdfUpload) {
        const resource = await dependencies.verifyPdfUpload(pdfUpload);
        temporaryCloudinaryPublicId = resource.public_id;
        const downloadUrl = dependencies.createTemporaryPdfDownloadUrl(resource);
        extractionResult = await dependencies.extractText(downloadUrl, 'application/pdf');
      } else {
        extractionResult = await dependencies.extractText(req.file.path, req.file.mimetype);
      }
    } finally {
      if (temporaryCloudinaryPublicId) {
        await dependencies.deleteFromCloudinary(temporaryCloudinaryPublicId, 'raw').catch((error) => {
          console.error('[PDF Extraction] Could not remove temporary Cloudinary upload:', error.message);
        });
      }
    }

    if (
      !extractionResult.text ||
      extractionResult.text.trim().length < 50
    ) {
      res.status(400);
      throw new Error(
        'Could not extract meaningful text from the uploaded file. ' +
          'Please ensure the file is a valid PDF or DOCX containing selectable text.'
      );
    }

    // Pull sector options from the form's known set so the sector tag can
    // be guessed; the controller owns the mapping, the client just lists.
    const sectorOptions = [
      'General', 'Livelihood', 'Infrastructure', 'Social Services',
      'Governance', 'Environment', 'Youth', 'Senior Citizens', 'PWD', 'Agriculture'
    ];

    const payload = dependencies.buildExtractionPayload(extractionResult.text, extractionResult.sourceType, {
      sectorOptions,
      pageCount: extractionResult.numPages,
    });

    res.json({
      success: true,
      data: payload,
    });
  });
};

const extractDocumentText = createExtractDocumentText();

module.exports = {
  extractDocumentText,
  createExtractDocumentText,
};
