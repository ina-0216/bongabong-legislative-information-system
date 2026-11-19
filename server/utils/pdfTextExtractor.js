/**
 * PDF/DOCX Text Extraction Service for iBOSys
 *
 * Extracts text from uploaded legislative documents (PDF/DOCX) so that
 * form fields can be auto-populated during ordinance/resolution creation.
 *
 * Supported formats:
 * - application/pdf  → pdf-parse
 * - application/vnd.openxmlformats-officedocument.wordprocessingml.document → mammoth (extractRawText)
 */

let PDFParse = null;
try {
  ({ PDFParse } = require('pdf-parse'));
} catch (err) {
  console.warn('[pdfTextExtractor] pdf-parse not available — install with: npm install pdf-parse');
}

/**
 * Extracts text from a PDF file buffer using pdf-parse.
 * @param {Buffer|string} source - A PDF buffer or temporary file path
 * @returns {Promise<{text: string, info: object, numPages: number}>}
 */
async function extractPdfText(source) {
  if (!PDFParse) {
    const err = new Error('PDF extraction is not available.');
    err.statusCode = 503;
    throw err;
  }

  const parser = new PDFParse(
    typeof source === 'string'
      ? { url: /^https?:\/\//i.test(source) ? source : require('node:url').pathToFileURL(source).href }
      : { data: source }
  );
  try {
    const textResult = await parser.getText();
    const infoResult = await parser.getInfo();

    return {
      text: textResult.text || '',
      info: infoResult.info || {},
      numPages: textResult.total || infoResult.total || 0,
    };
  } finally {
    await parser.destroy();
  }
}

/**
 * Extracts text from a DOCX file buffer using mammoth.extractRawText.
 * @param {Buffer|string} source - A DOCX buffer or temporary file path
 * @returns {Promise<{text: string}>}
 */
async function extractDocxText(source) {
  try {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText(
      typeof source === 'string' ? { path: source } : { buffer: source }
    );
    return {
      text: result.value || '',
    };
  } catch (err) {
    console.error('[pdfTextExtractor] DOCX extraction failed:', err.message);
    const extractionError = new Error('Failed to extract text from DOCX file.');
    extractionError.statusCode = 400;
    throw extractionError;
  }
}

/**
 * Auto-detects file type from buffer and extracts text.
 * @param {Buffer} buffer - The file buffer
 * @param {string} mimetype - The file mimetype
 * @returns {Promise<{text: string, sourceType: string, paragraphs?: number, numPages?: number, info?: object}>}
 */
async function extractText(source, mimetype) {
  if (mimetype === 'application/pdf') {
    const result = await extractPdfText(source);
    return {
      text: result.text,
      sourceType: 'pdf',
      numPages: result.numPages,
      info: result.info,
    };
  }

  if (
    mimetype ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await extractDocxText(source);
    return {
      text: result.text,
      sourceType: 'docx',
      paragraphs: (result.text.match(/\n\s*/g) || []).length + 1,
    };
  }

  const err = new Error(
    `Unsupported file type: ${mimetype}. Only PDF and DOCX files are supported.`
  );
  err.statusCode = 400;
  throw err;
}

module.exports = {
  extractPdfText,
  extractDocxText,
  extractText,
};
