const asyncHandler = require('express-async-handler');
const {
  generateCommitteeReportPdf,
  generateAnnualReportPdf,
  generateParticipationReportPdf,
  generateTimelineReportPdf,
  generateDocumentPdf,
} = require('../services/analyticsService');
const { downloadSessionPdf } = require('./sessionController');
const { setPdfResponseHeaders } = require('../utils/pdfFilename');

const getCommitteeReport = asyncHandler(async (req, res) => {
  const { doc, filename } = await generateCommitteeReportPdf(req.params.ordinanceId);
  setPdfResponseHeaders(res, filename);
  await new Promise((resolve, reject) => {
    doc.on('error', reject);
    doc.pipe(res);
    doc.on('finish', resolve);
  });
});

const getAnnualReport = asyncHandler(async (req, res) => {
  const currentYear = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
  }).format(new Date()));
  const year = req.query.year === undefined
    ? currentYear
    : /^\d{4}$/.test(req.query.year) ? Number(req.query.year) : NaN;
  if (!Number.isInteger(year) || year < 1000 || year > 9998) {
    res.status(400);
    throw new Error('Year must be a valid four-digit calendar year.');
  }
  const { doc, filename } = await generateAnnualReportPdf(year);
  setPdfResponseHeaders(res, filename);
  doc.pipe(res);
});

const getParticipationReport = asyncHandler(async (req, res) => {
  const { doc, filename } = await generateParticipationReportPdf(req.params.ordinanceId);
  setPdfResponseHeaders(res, filename);
  doc.pipe(res);
});

const getTimelineReport = asyncHandler(async (req, res) => {
  const includeCommitteeReport = req.query.includeCommitteeReport !== 'false';
  const { doc, filename } = await generateTimelineReportPdf(req.params.ordinanceId, req.query.stages, includeCommitteeReport);
  setPdfResponseHeaders(res, filename);
  doc.pipe(res);
});

// Keep the report route on the same population and PDF-generation path as the
// Sessions & Minutes page so both downloads contain identical session data.
const getMinutesReport = downloadSessionPdf;

const getDocumentPdf = asyncHandler(async (req, res) => {
  const { doc, filename } = await generateDocumentPdf(req.params.id);
  const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
  setPdfResponseHeaders(res, filename, disposition);
  doc.pipe(res);
});

module.exports = {
  getCommitteeReport,
  getAnnualReport,
  getParticipationReport,
  getTimelineReport,
  getMinutesReport,
  getDocumentPdf,
};
