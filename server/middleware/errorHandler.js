const {
  MAX_PHOTO_UPLOAD_BYTES,
  MAX_ORDINANCE_PDF_BYTES,
  MAX_DOCUMENT_EXTRACTION_DOCX_BYTES,
  MAX_ANNOUNCEMENT_COVER_BYTES,
  MAX_ANNOUNCEMENT_GALLERY_BYTES,
  MAX_PDF_HEADER_BYTES,
} = require('../utils/uploadLimits');

const toMegabytes = (bytes) => Math.round(bytes / (1024 * 1024));

const getUploadSizeMessage = (req, err) => {
  const requestPath = String(req?.originalUrl || req?.url || req?.path || '').split('?')[0];
  const field = err?.field;
  const matchesRoute = (route) => requestPath === route || requestPath.startsWith(`${route}/`);

  if (matchesRoute('/api/ordinances/extract-text') && field === 'file') {
    return `PDF files must be ${toMegabytes(MAX_ORDINANCE_PDF_BYTES)} MB or smaller; DOCX files must be ${toMegabytes(MAX_DOCUMENT_EXTRACTION_DOCX_BYTES)} MB or smaller.`;
  }
  if (matchesRoute('/api/ordinances') && field === 'pdf') {
    return `Ordinance PDF files must be ${toMegabytes(MAX_ORDINANCE_PDF_BYTES)} MB or smaller.`;
  }
  if (matchesRoute('/api/announcements')) {
    if (field === 'coverImage') return `Announcement cover images must be ${toMegabytes(MAX_ANNOUNCEMENT_COVER_BYTES)} MB or smaller.`;
    if (field === 'galleryImages') return `Announcement gallery images must be ${toMegabytes(MAX_ANNOUNCEMENT_GALLERY_BYTES)} MB each or smaller.`;
  }
  if ((requestPath === '/api/pdf-header' || requestPath === '/api/system/pdf-header') && field === 'header') {
    return `PDF header files must be ${toMegabytes(MAX_PDF_HEADER_BYTES)} MB or smaller.`;
  }
  if (['idImage', 'avatar', 'photo'].includes(field)) {
    return `Photo uploads must be ${toMegabytes(MAX_PHOTO_UPLOAD_BYTES)} MB or smaller.`;
  }

  return 'The uploaded file exceeds the allowed size limit.';
};

const errorHandler = (err, req, res, next) => {
  // Some SDKs (including Cloudinary's uploader) reject with a plain response
  // object instead of an Error. Log only stable diagnostic fields so provider
  // rejections are actionable without dumping request data or credentials.
  const providerError = err?.error && typeof err.error === 'object' ? err.error : null;
  const upstreamStatus = Number.isInteger(providerError?.http_code)
    ? providerError.http_code
    : Number.isInteger(err?.http_code) ? err.http_code : undefined;
  console.error('[API Error]', {
    name: err?.name || providerError?.name,
    message: err?.message || providerError?.message,
    upstreamStatus,
    stack: err?.stack,
  });

  const uploadErrorResponses = {
    LIMIT_FILE_SIZE: {
      statusCode: 413,
    },
    LIMIT_FIELD_KEY: { statusCode: 400, message: 'An upload form field name is too long.' },
    LIMIT_FIELD_VALUE: { statusCode: 413, message: 'An upload form field is too large.' },
    LIMIT_FIELD_COUNT: { statusCode: 400, message: 'The upload contains too many form fields.' },
    LIMIT_PART_COUNT: { statusCode: 400, message: 'The upload contains too many parts.' },
    LIMIT_FILE_COUNT: { statusCode: 400, message: 'The upload contains too many files.' },
    LIMIT_UNEXPECTED_FILE: { statusCode: 400, message: 'The upload contains an unexpected file field.' },
  };
  const uploadError = uploadErrorResponses[err?.code];
  const hasExplicitStatus = Number.isInteger(err?.statusCode) || res.statusCode !== 200;
  const statusCode = uploadError?.statusCode
    ?? (Number.isInteger(err?.statusCode) ? err.statusCode : (res.statusCode === 200 ? 500 : res.statusCode));
  const uploadMessage = err?.code === 'LIMIT_FILE_SIZE' ? getUploadSizeMessage(req, err) : undefined;
  const message = uploadMessage || uploadError?.message
    || (statusCode >= 500 && process.env.NODE_ENV === 'production' && !hasExplicitStatus
      ? 'Internal Server Error'
      : (err?.message || 'Internal Server Error'));
  
  res.status(statusCode).json({
    success: false,
    message,
    errors: [],
    ...(process.env.NODE_ENV === 'production' ? {} : { stack: err.stack }),
  });
};

module.exports = errorHandler;
