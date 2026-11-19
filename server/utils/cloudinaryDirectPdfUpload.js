const crypto = require('node:crypto');
const { cloudinary } = require('./cloudinary');
const { MAX_ORDINANCE_PDF_BYTES } = require('./uploadLimits');

const PDF_UPLOAD_FOLDER = 'ibosys/ordinances/staging';
const PDF_ORDINANCE_FOLDER = 'ibosys/ordinances';
const PDF_UPLOAD_MAX_AGE_SECONDS = 60 * 60;
const PDF_DOWNLOAD_URL_TTL_SECONDS = 60 * 60;
const PDF_PUBLIC_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/i;

const getUploadSigningParams = ({ publicId, folder, timestamp }) => ({
  allowed_formats: 'pdf',
  folder,
  public_id: publicId,
  timestamp: Number(timestamp),
});

const createPdfUploadSignature = () => {
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `${crypto.randomUUID()}.pdf`;
  const params = getUploadSigningParams({ publicId, folder: PDF_UPLOAD_FOLDER, timestamp });
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!apiSecret) throw new Error('Cloudinary signing is not configured.');

  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    resourceType: 'raw',
    allowedFormats: 'pdf',
    folder: PDF_UPLOAD_FOLDER,
    publicId,
    timestamp,
    signature: cloudinary.utils.api_sign_request(params, apiSecret),
  };
};

const createTemporaryPdfDownloadUrl = (resource) => {
  const prefix = `${PDF_UPLOAD_FOLDER}/`;
  const publicId = resource?.public_id;
  const stagedFileId = typeof publicId === 'string' && publicId.startsWith(prefix)
    ? publicId.slice(prefix.length)
    : '';
  if (!PDF_PUBLIC_ID_PATTERN.test(stagedFileId)) {
    const error = new Error('The verified PDF is not in the temporary upload folder.');
    error.statusCode = 400;
    throw error;
  }

  return cloudinary.utils.private_download_url(publicId, 'pdf', {
    resource_type: 'raw',
    type: 'upload',
    expires_at: Math.floor(Date.now() / 1000) + PDF_DOWNLOAD_URL_TTL_SECONDS,
  });
};

const verifyPdfUpload = async (upload) => {
  if (!upload || typeof upload !== 'object') {
    const error = new Error('A signed PDF upload is required.');
    error.statusCode = 400;
    throw error;
  }

  const { publicId, folder, timestamp, signature } = upload;
  const numericTimestamp = Number(timestamp);
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (
    folder !== PDF_UPLOAD_FOLDER ||
    typeof publicId !== 'string' || !PDF_PUBLIC_ID_PATTERN.test(publicId) ||
    !Number.isInteger(numericTimestamp) ||
    Math.abs(Math.floor(Date.now() / 1000) - numericTimestamp) > PDF_UPLOAD_MAX_AGE_SECONDS ||
    typeof signature !== 'string' || !/^[a-f0-9]{40}$/i.test(signature) ||
    !apiSecret
  ) {
    const error = new Error('The signed PDF upload details are invalid or expired. Upload the PDF again.');
    error.statusCode = 400;
    throw error;
  }

  const expectedSignature = cloudinary.utils.api_sign_request(
    getUploadSigningParams({ publicId, folder, timestamp: numericTimestamp }),
    apiSecret,
  );
  const suppliedBytes = Buffer.from(signature, 'hex');
  const expectedBytes = Buffer.from(expectedSignature, 'hex');
  if (suppliedBytes.length !== expectedBytes.length || !crypto.timingSafeEqual(suppliedBytes, expectedBytes)) {
    const error = new Error('The signed PDF upload details could not be verified. Upload the PDF again.');
    error.statusCode = 400;
    throw error;
  }

  let resource;
  try {
    resource = await cloudinary.api.resource(`${folder}/${publicId}`, {
      resource_type: 'raw',
      type: 'upload',
    });
  } catch {
    const error = new Error('The PDF upload was not found or is not ready yet. Please retry.');
    error.statusCode = 400;
    throw error;
  }

  const expectedPublicId = `${folder}/${publicId}`;
  const reportedFormat = typeof resource.format === 'string' ? resource.format.toLowerCase() : '';
  if (
    resource.public_id !== expectedPublicId ||
    (reportedFormat && reportedFormat !== 'pdf') ||
    (resource.format != null && typeof resource.format !== 'string')
  ) {
    const error = new Error('The uploaded document must be a valid PDF.');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(resource.bytes) || resource.bytes < 0) {
    const error = new Error('The uploaded PDF size could not be verified. Please upload it again.');
    error.statusCode = 400;
    throw error;
  }

  if (resource.bytes > MAX_ORDINANCE_PDF_BYTES) {
    const error = new Error('The uploaded PDF exceeds the 100 MiB size limit.');
    error.statusCode = 413;
    throw error;
  }

  return resource;
};

const promoteVerifiedPdfUpload = async (upload) => {
  const resource = await verifyPdfUpload(upload);
  const permanentPublicId = `${PDF_ORDINANCE_FOLDER}/${crypto.randomUUID()}.pdf`;
  return cloudinary.uploader.rename(resource.public_id, permanentPublicId, {
    resource_type: 'raw',
    type: 'upload',
    overwrite: false,
    invalidate: true,
  });
};

const deleteVerifiedPdfUpload = async (upload) => {
  const resource = await verifyPdfUpload(upload);
  return cloudinary.uploader.destroy(resource.public_id, { resource_type: 'raw' });
};

module.exports = {
  PDF_UPLOAD_FOLDER,
  createPdfUploadSignature,
  createTemporaryPdfDownloadUrl,
  verifyPdfUpload,
  deleteVerifiedPdfUpload,
  promoteVerifiedPdfUpload,
};
