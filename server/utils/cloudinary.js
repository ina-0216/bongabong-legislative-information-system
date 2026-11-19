const { v2: cloudinary } = require('cloudinary');
const { Readable } = require('stream');
const https = require('https');
const fs = require('node:fs');

// Cloudinary's SDK omits response headers from errors for unexpected statuses
// (including 403). The SDK supports a per-request Agent, which lets us retain
// only the provider's diagnostic header without logging request bodies.
class CloudinaryDiagnosticAgent extends https.Agent {
  addRequest(request, options) {
    request.once('response', (response) => {
      if (response.statusCode < 400) return;

      const providerMessage = response.headers['x-cld-error'];
      const requestId = response.headers['x-cld-request-id']
        || response.headers['x-request-id'];

      console.error('[Cloudinary Upload Response]', {
        status: response.statusCode,
        providerMessage: typeof providerMessage === 'string'
          ? providerMessage.slice(0, 500)
          : undefined,
        requestId: typeof requestId === 'string' ? requestId.slice(0, 200) : undefined,
      });
    });

    return super.addRequest(request, options);
  }
}

const cloudinaryDiagnosticAgent = new CloudinaryDiagnosticAgent({ keepAlive: true });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      resource_type: 'auto',
      agent: cloudinaryDiagnosticAgent,
      folder: options.folder || 'ibosys',
      public_id: options.public_id,
      overwrite: options.overwrite !== false,
      invalidate: true,
      ...options,
    };

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });

    Readable.from(buffer).pipe(stream);
  });
};

const uploadFileToCloudinary = (filePath, options = {}) => new Promise((resolve, reject) => {
  const uploadOptions = {
    resource_type: 'auto',
    agent: cloudinaryDiagnosticAgent,
    folder: options.folder || 'ibosys',
    public_id: options.public_id,
    overwrite: options.overwrite !== false,
    invalidate: true,
    ...options,
  };
  const complete = (error, result) => {
    if (error) reject(error);
    else resolve(result);
  };
  const fileSize = fs.statSync(filePath).size;
  if (fileSize > 100_000_000) {
    cloudinary.uploader.upload_large(filePath, complete, uploadOptions);
  } else {
    cloudinary.uploader.upload(filePath, complete, uploadOptions);
  }
});

const deleteFromCloudinary = (publicId, resourceType = 'image') => {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

const generateSignedUrl = (publicId, format = 'jpg', options = {}) => {
  const { expiresIn: requestedExpiry, ...urlOptions } = options;
  const expiresIn = Number.isFinite(requestedExpiry) ? requestedExpiry : 300;
  return cloudinary.utils.private_download_url(publicId, format, {
    type: 'authenticated',
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    resource_type: 'image',
    ...urlOptions,
  });
};

const generateSignedImageUrl = (publicId, options = {}) => {
  return cloudinary.url(publicId, {
    resource_type: 'image',
    type: 'authenticated',
    sign_url: true,
    secure: true,
    ...options,
  });
};

const extractPublicId = (url) => {
  if (!url) return null;
  const match = url.match(/\/v\d+\/(.+)\.\w+$/);
  return match ? match[1] : null;
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  uploadFileToCloudinary,
  deleteFromCloudinary,
  generateSignedUrl,
  generateSignedImageUrl,
  extractPublicId,
};
