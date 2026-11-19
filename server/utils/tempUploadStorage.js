const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const multer = require('multer');

const createTempUploadStorage = (fieldLimits = {}) => ({
  _handleFile(req, file, callback) {
    const filename = `ibosys-upload-${randomUUID()}`;
    const destination = os.tmpdir();
    const filePath = path.join(destination, filename);
    const output = fs.createWriteStream(filePath, { flags: 'wx' });
    const maxBytes = fieldLimits[`${file.fieldname}:${file.mimetype}`]
      || fieldLimits[file.fieldname]
      || Number.POSITIVE_INFINITY;
    let size = 0;
    let failed = false;

    const fail = (error) => {
      if (failed) return;
      failed = true;
      file.stream.unpipe(output);
      output.destroy();
      file.stream.resume();
      fs.rm(filePath, { force: true }, () => callback(error));
    };

    file.stream.on('data', (chunk) => {
      if (failed) return;
      size += chunk.length;
      if (size > maxBytes) {
        fail(new multer.MulterError('LIMIT_FILE_SIZE', file.fieldname));
      }
    });
    file.stream.once('error', fail);
    output.once('error', fail);
    output.once('finish', () => {
      if (failed) return;
      callback(null, { destination, filename, path: filePath, size });
    });
    file.stream.pipe(output);
  },

  _removeFile(req, file, callback) {
    fs.rm(file.path, { force: true }, callback);
  },
});

const cleanupTempUploads = (req, res, next) => {
  const uploaded = req.file
    ? [req.file]
    : req.files
      ? Object.values(req.files).flat()
      : [];
  if (!uploaded.length) return next();

  let cleanupStarted = false;
  const cleanup = () => {
    if (cleanupStarted) return;
    cleanupStarted = true;
    for (const file of uploaded) {
      if (file.path) fs.rm(file.path, { force: true }, () => {});
    }
  };

  res.once('finish', cleanup);
  res.once('close', cleanup);
  next();
};

module.exports = { createTempUploadStorage, cleanupTempUploads };
