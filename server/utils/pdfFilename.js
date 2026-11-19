/* eslint-disable no-control-regex -- control characters are intentionally stripped from filenames. */
const cleanPart = (value) => String(value ?? '')
  .normalize('NFKC')
  .replace(/\.pdf$/i, '')
  .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, ' ')
  .replace(/\s+/g, ' ')
  .replace(/\.{2,}/g, '.')
  .replace(/^[. ]+/g, '')
  .replace(/[. ]+$/g, '')
  .trim();

const createPdfFilename = (...parts) => {
  const label = parts.map(cleanPart).filter(Boolean).join(' - ').slice(0, 175).trim().replace(/[. ]+$/g, '');
  const basename = label || 'document';
  const safeBasename = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(basename)
    ? `_${basename}`
    : basename;
  return `${safeBasename}.pdf`;
};

const pdfContentDisposition = (filename, disposition = 'attachment') => {
  const mode = disposition === 'inline' ? 'inline' : 'attachment';
  const safeFilename = createPdfFilename(filename);
  const fallback = safeFilename
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/["\\]/g, '_');
  const encoded = encodeURIComponent(safeFilename).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `${mode}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
};

const setPdfResponseHeaders = (res, filename, disposition = 'attachment') => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', pdfContentDisposition(filename, disposition));
};

const sessionMinutesFilename = (session) => {
  const date = session?.date && !Number.isNaN(new Date(session.date).getTime())
    ? new Date(session.date).toISOString().slice(0, 10)
    : '';
  const title = cleanPart(session?.title);
  const number = cleanPart(session?.sessionNumber);
  const separateNumber = number && !title.toLocaleLowerCase().includes(number.toLocaleLowerCase())
    ? number
    : '';
  return createPdfFilename('Official Minutes', separateNumber, title, date);
};

const legislativeDocumentFilename = (document) => createPdfFilename(
  document?.type || 'Legislative Document',
  document?.number,
  document?.title
);

module.exports = {
  createPdfFilename,
  pdfContentDisposition,
  setPdfResponseHeaders,
  sessionMinutesFilename,
  legislativeDocumentFilename,
};
