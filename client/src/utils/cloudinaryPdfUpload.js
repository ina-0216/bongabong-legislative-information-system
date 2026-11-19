import { api } from './api';

const CHUNK_SIZE = 8 * 1024 * 1024;

const postChunk = (url, formData, headers) => new Promise((resolve, reject) => {
  const request = new XMLHttpRequest();
  request.open('POST', url);
  request.setRequestHeader('Content-Range', headers.contentRange);
  request.setRequestHeader('X-Unique-Upload-Id', headers.uploadId);
  request.onload = () => {
    let response;
    try {
      response = JSON.parse(request.responseText);
    } catch {
      reject(new Error('Cloud storage returned an invalid upload response.'));
      return;
    }
    if (request.status < 200 || request.status >= 300) {
      reject(new Error(response.error?.message || 'PDF upload failed.'));
      return;
    }
    resolve(response);
  };
  request.onerror = () => reject(new Error('Network error while uploading the PDF.'));
  request.onabort = () => reject(new Error('PDF upload was canceled.'));
  request.send(formData);
});

/** Uploads a PDF directly to Cloudinary in bounded chunks using a short-lived server signature. */
export async function uploadOrdinancePdf(file) {
  const signatureResponse = await api.createOrdinancePdfUploadSignature();
  const credentials = signatureResponse?.data;
  if (!credentials?.cloudName || !credentials?.apiKey || !credentials?.signature) {
    throw new Error('Could not start the secure PDF upload. Please try again.');
  }

  const uploadId = crypto.randomUUID();
  const uploadUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(credentials.cloudName)}/raw/upload`;
  for (let start = 0; start < file.size; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE, file.size) - 1;
    const form = new FormData();
    form.append('file', file.slice(start, end + 1, 'application/pdf'), file.name || 'ordinance.pdf');
    form.append('api_key', credentials.apiKey);
    form.append('timestamp', String(credentials.timestamp));
    form.append('allowed_formats', credentials.allowedFormats || 'pdf');
    form.append('folder', credentials.folder);
    form.append('public_id', credentials.publicId);
    form.append('signature', credentials.signature);
    await postChunk(uploadUrl, form, {
      contentRange: `bytes ${start}-${end}/${file.size}`,
      uploadId,
    });
  }

  return {
    folder: credentials.folder,
    publicId: credentials.publicId,
    timestamp: credentials.timestamp,
    signature: credentials.signature,
  };
}
