const PDFDocument = require('pdfkit');
const Ordinance = require('../models/Ordinance');
const Session = require('../models/Session');
const ConsultationFeedback = require('../models/ConsultationFeedback');
const { STAGES: ALL_STAGES } = require('../utils/constants');
const { createPdfFilename, sessionMinutesFilename, legislativeDocumentFilename } = require('../utils/pdfFilename');
const { getManilaYearRange } = require('../utils/manilaDateRange');

const approvedEligibilityFilter = (ordinanceId) => ({
  ordinanceId,
  $or: [{ eligibility_status: 'Approved' }, { eligibility_status: { $exists: false }, status: 'Approved' }],
});

const approvedCommentFilter = (ordinanceId) => ({
  ordinanceId,
  $or: [{ comment_status: 'Approved' }, { comment_status: { $exists: false }, status: 'Approved' }],
});

const drawHeader = (doc, title) => {
  doc.rect(0, 0, doc.page.width, 80).fill('#0f172a');
  doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text('B-LIS', 40, 20);
  doc.fontSize(10).font('Helvetica').text('Sangguniang Bayan of Bongabong, Oriental Mindoro', 40, 46);
  doc.fillColor('#94a3b8').fontSize(9).text(`Generated: ${new Date().toLocaleDateString('en-PH', { dateStyle: 'long' })}`, 40, 62);
  doc.moveDown(4);
  doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown(1);
  doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke('#e2e8f0');
  doc.moveDown(1);
};

const stripHtml = (html) =>
  (html || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim();

/**
 * Generates a Committee Report PDF for a given ordinance.
 */
async function generateCommitteeReportPdf(ordinanceId) {
  const ord = await Ordinance.findById(ordinanceId).populate('proponentId', 'firstName middleName lastName position photoUrl');
  if (!ord) throw new Error('Ordinance not found');

  const feedbacks = await ConsultationFeedback.find(approvedEligibilityFilter(ord._id));
  const tally = { Agree: 0, Disagree: 0, Neutral: 0 };
  feedbacks.forEach(f => { if (tally.hasOwnProperty(f.vote)) tally[f.vote]++; });
  const total = feedbacks.length;

  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 100, bottom: 60, left: 40, right: 40 } });
  doc.info.Title = `Committee Report - ${ord.number} - ${ord.title}`;
  drawHeader(doc, 'Committee Report');

  doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text(`Ordinance No. ${ord.number}`);
  doc.fontSize(11).font('Helvetica').fillColor('#334155').text(ord.title);
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Proponent: ${ord.proponentId?.name || 'N/A'}  |  Committee: ${ord.committee}  |  Status: ${ord.status}`);
  doc.moveDown(1.5);

  doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('Public Consultation Results');
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica').fillColor('#334155');
  doc.text(`Total Submissions: ${total}`);
  doc.text(`Agree: ${tally.Agree} (${total ? ((tally.Agree / total) * 100).toFixed(1) : 0}%)`);
  doc.text(`Disagree: ${tally.Disagree} (${total ? ((tally.Disagree / total) * 100).toFixed(1) : 0}%)`);
  doc.text(`Neutral: ${tally.Neutral} (${total ? ((tally.Neutral / total) * 100).toFixed(1) : 0}%)`);

  const majority = total > 0
    ? (tally.Agree / total >= 0.5 ? 'Majority Agrees — Recommended for Approval'
      : tally.Disagree / total >= 0.5 ? 'Majority Disagrees — Review Required'
      : 'No Clear Majority — Further Deliberation Needed')
    : 'No submissions recorded';
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text(`Committee Recommendation: ${majority}`);
  doc.moveDown(1.5);

  const withComments = await ConsultationFeedback.find({
    ...approvedCommentFilter(ord._id),
    comment: { $exists: true, $ne: '' },
  }).select('full_name barangay comment');
  if (withComments.length > 0) {
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('Public Feedback Summary');
    doc.moveDown(0.5);
    withComments.slice(0, 20).forEach((f, i) => {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569').text(`${i + 1}. ${f.full_name} (${f.barangay})`);
      doc.font('Helvetica').fillColor('#334155').text(`   "${f.comment}"`, { width: 500 });
      doc.moveDown(0.3);
    });
  }

  doc.end();
  return { doc, filename: createPdfFilename('Committee Report', ord.number, ord.title) };
}

/**
 * Generates an annual report of non-draft ordinances and resolutions filed in a Manila calendar year.
 */
async function generateAnnualReportPdf(year) {
  const range = getManilaYearRange(year);
  if (!range) throw new Error('A valid report year is required.');
  const ordinances = await Ordinance.find({
    isDraft: { $ne: true },
    status: { $ne: 'Draft' },
    type: { $in: ['Ordinance', 'Resolution'] },
    $or: [
      { filedAt: { $gte: range.start, $lt: range.endExclusive } },
      { filedAt: null, createdAt: { $gte: range.start, $lt: range.endExclusive } },
    ],
  }).populate('proponentId', 'firstName middleName lastName position photoUrl').sort({ filedAt: 1, createdAt: 1 });

  const ordinanceCount = ordinances.filter((item) => item.type === 'Ordinance').length;
  const resolutionCount = ordinances.filter((item) => item.type === 'Resolution').length;
  const approvedCount = ordinances.filter((item) => item.status === 'Approved').length;

  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 100, bottom: 60, left: 40, right: 40 } });
  doc.info.Title = `Annual Legislative Documents Report - ${year}`;
  drawHeader(doc, `Annual Legislative Documents Report — ${year}`);

  doc.fontSize(10).font('Helvetica').fillColor('#334155')
    .text(`Filed documents: ${ordinances.length}  |  Ordinances: ${ordinanceCount}  |  Resolutions: ${resolutionCount}  |  Approved: ${approvedCount}`);
  doc.moveDown(1.5);

  ordinances.forEach((ord, i) => {
    const documentLabel = ord.type === 'Resolution' ? 'Resolution No.' : 'Ordinance No.';
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text(`${i + 1}. ${documentLabel} ${ord.number}`);
    doc.fontSize(9).font('Helvetica').fillColor('#475569').text(`   ${ord.title}`);
    doc.text(`   Proponent: ${ord.proponentId?.name || 'N/A'}  |  Committee: ${ord.committee}  |  Status: ${ord.status}`);
    doc.text(`   Filed: ${new Date(ord.filedAt || ord.createdAt).toLocaleDateString('en-PH')}`);
    doc.moveDown(0.6);
    if (doc.y > doc.page.height - 100) doc.addPage();
  });

  doc.end();
  return { doc, filename: createPdfFilename('Annual Legislative Report', year) };
}

/**
 * Generates a Participation Report PDF for a given ordinance.
 */
async function generateParticipationReportPdf(ordinanceId) {
  const ord = await Ordinance.findById(ordinanceId);
  if (!ord) throw new Error('Ordinance not found');

  const feedbacks = await ConsultationFeedback.find(approvedEligibilityFilter(ord._id));
  const byBarangay = {};
  feedbacks.forEach(f => {
    const b = f.barangay || 'Unknown';
    if (!byBarangay[b]) byBarangay[b] = { Agree: 0, Disagree: 0, Neutral: 0 };
    if (byBarangay[b].hasOwnProperty(f.vote)) byBarangay[b][f.vote]++;
  });

  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 100, bottom: 60, left: 40, right: 40 } });
  doc.info.Title = `Consultation Participation Report - ${ord.number} - ${ord.title}`;
  drawHeader(doc, 'Consultation Participation Report');

  doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text(`Ordinance No. ${ord.number}: ${ord.title}`);
  doc.fontSize(10).font('Helvetica').fillColor('#334155').text(`Total Submissions: ${feedbacks.length}`);
  doc.moveDown(1.5);

  doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('Vote Breakdown by Barangay');
  doc.moveDown(0.5);

  Object.entries(byBarangay).forEach(([barangay, tally]) => {
    const total = tally.Agree + tally.Disagree + tally.Neutral;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e40af').text(barangay);
    doc.fontSize(9).font('Helvetica').fillColor('#334155')
      .text(`   Agree: ${tally.Agree} | Disagree: ${tally.Disagree} | Neutral: ${tally.Neutral} | Total: ${total}`);
    doc.moveDown(0.4);
  });

  doc.end();
  return { doc, filename: createPdfFilename('Consultation Participation Report', ord.number, ord.title) };
}

/**
 * Generates a Legislative Timeline Report PDF.
 */
async function generateTimelineReportPdf(ordinanceId, queryStages, includeCommitteeReport) {
  const ord = await Ordinance.findById(ordinanceId)
    .populate('proponentId', 'firstName middleName lastName position photoUrl')
    .populate('timeline.updatedBy', 'name role')
    .populate('timeline.session', 'title sessionNumber date status');
  if (!ord) throw new Error('Ordinance not found');

  let selectedStages = ALL_STAGES;
  if (queryStages) {
    const requested = queryStages.split(',').map(s => s.trim());
    selectedStages = ALL_STAGES.filter(s => requested.includes(s));
    if (selectedStages.length === 0) selectedStages = ALL_STAGES;
  }

  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 100, bottom: 60, left: 40, right: 40 } });
  doc.info.Title = `Legislative Timeline Report - ${ord.number} - ${ord.title}`;

  const reportTitle = selectedStages.length < ALL_STAGES.length
    ? `Legislative Timeline Report (${selectedStages.length} Stage${selectedStages.length > 1 ? 's' : ''} Selected)`
    : 'Legislative Timeline Report';

  drawHeader(doc, reportTitle);

  doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text(`Ordinance No. ${ord.number}`);
  doc.fontSize(11).font('Helvetica').fillColor('#334155').text(ord.title, { width: 500 });
  doc.moveDown(0.3);
  doc.fontSize(10).text(`Proponent: ${ord.proponentId?.name || 'N/A'}  |  Committee: ${ord.committee}  |  Status: ${ord.status}`);
  doc.moveDown(0.3);

  if (selectedStages.length < ALL_STAGES.length) {
    doc.fontSize(9).fillColor('#64748b').text(`Stages included: ${selectedStages.join(', ')}`, { width: 500 });
  }
  doc.moveDown(1.5);

  doc.fontSize(13).font('Helvetica-Bold').fillColor('#0f172a').text('Legislative Timeline');
  doc.moveDown(0.5);
  doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke('#e2e8f0');
  doc.moveDown(0.5);

  selectedStages.forEach((stage) => {
    const globalIdx = ALL_STAGES.indexOf(stage);
    const entry = ord.timeline?.find(t => t.status === stage);
    const currentIdx = ALL_STAGES.indexOf(ord.status);
    const done = globalIdx < currentIdx;
    const current = globalIdx === currentIdx;

    const stageStatus = done ? 'COMPLETED' : current ? 'CURRENT' : 'PENDING';
    const stageColor = done ? '#16a34a' : current ? '#2563eb' : '#94a3b8';

    doc.fontSize(11).font('Helvetica-Bold').fillColor(stageColor).text(`${globalIdx + 1}. ${stage}  [${stageStatus}]`);

    if (entry) {
      doc.fontSize(9).font('Helvetica').fillColor('#475569');
      const byName = entry.updatedBy?.name || 'System';
      const dateStr = entry.date ? new Date(entry.date).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
      doc.text(`   Recorded by: ${byName}  |  Date: ${dateStr}`);
      if (entry.session) {
        const sessionDate = entry.session.date
          ? new Date(entry.session.date).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
          : '';
        doc.text(`   Session: ${entry.session.title}${sessionDate ? ` · ${sessionDate}` : ''}`, { width: 480 });
      }
      if (entry.notes) {
        doc.fillColor('#334155').text(`   Stage remarks: "${entry.notes}"`, { width: 480 });
      }
    } else {
      doc.fontSize(9).font('Helvetica').fillColor('#94a3b8').text('   (Not yet reached)');
    }
    doc.moveDown(0.6);
    if (doc.y > doc.page.height - 100) doc.addPage();
  });

  if (includeCommitteeReport && ord.committeeReport && (ord.committeeReport.findings || ord.committeeReport.recommendation)) {
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke('#e2e8f0');
    doc.moveDown(0.5);
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#0f172a').text('Committee Hearing Report');
    doc.moveDown(0.5);

    if (ord.committeeReport.findings) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('Findings:');
      doc.fontSize(10).font('Helvetica').fillColor('#334155').text(ord.committeeReport.findings, { width: 500 });
      doc.moveDown(0.5);
    }
    if (ord.committeeReport.recommendation) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('Recommendation:');
      doc.fontSize(10).font('Helvetica').fillColor('#334155').text(ord.committeeReport.recommendation, { width: 500 });
      doc.moveDown(1);
    }
    if (ord.committeeReport.viceSecretaryName) {
      doc.moveDown(1);
      doc.fontSize(10).font('Helvetica').fillColor('#334155').text('Signed by Vice Secretary:', 40);
      doc.moveDown(0.3);
      doc.moveTo(40, doc.y).lineTo(240, doc.y).stroke('#334155');
      doc.moveDown(0.2);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text(ord.committeeReport.viceSecretaryName);
    }
  }

  doc.end();
  return { doc, filename: createPdfFilename('Legislative Timeline Report', ord.number, ord.title) };
}

/**
 * Generates an Official Minutes PDF for a session.
 */
async function generateMinutesPdf(sessionId) {
  const session = await Session.findById(sessionId)
    .populate('createdBy', 'name')
    .populate('itemsDiscussed', 'number title')
    .populate('attendance.present', 'firstName middleName lastName position photoUrl')
    .populate('attendance.onOfficialBusiness', 'firstName middleName lastName position photoUrl')
    .populate('attendance.absent', 'firstName middleName lastName position photoUrl');

  if (!session) throw new Error('Session not found');

  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 100, bottom: 60, left: 50, right: 50 } });
  doc.info.Title = `Official Minutes - ${session.title}`;
  drawHeader(doc, 'Official Minutes of the Session');

  const dateStr = new Date(session.date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text(session.title, { align: 'center' });
  doc.fontSize(11).font('Helvetica').fillColor('#334155').text(`Date: ${dateStr}`, { align: 'center' });
  doc.moveDown(1.5);

  const printSection = (title, content) => {
    if (!content || !stripHtml(content)) return;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b').text(title.toUpperCase());
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke('#cbd5e1');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#334155').text(stripHtml(content), { lineGap: 4 });
    doc.moveDown(1);
  };

  doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b').text('ATTENDANCE');
  doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke('#cbd5e1');
  doc.moveDown(0.3);

  const att = session.attendance || {};
  if (att.present?.length) {
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#16a34a').text('Present:');
    doc.font('Helvetica').fillColor('#334155').text(att.present.map(u => u.name).join(', '), { lineGap: 3 });
  }
  if (att.onOfficialBusiness?.length) {
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#d97706').text('On Official Business:');
    doc.font('Helvetica').fillColor('#334155').text(att.onOfficialBusiness.map(u => u.name).join(', '), { lineGap: 3 });
  }
  if (att.absent?.length) {
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#dc2626').text('Absent:');
    doc.font('Helvetica').fillColor('#334155').text(att.absent.map(u => u.name).join(', '), { lineGap: 3 });
  }
  doc.moveDown(1);

  printSection('I. Call to Order', session.callToOrder);
  printSection('II. Invocation, National Anthem and Hymn', session.invocation);
  printSection('III. Roll Call', session.rollCall);
  printSection('IV. Reading & Adoption of Previous Minutes', session.readingOfPreviousMinutes);
  printSection("V. Citizen's Hour", session.citizensHour || session.privilegeHour);
  printSection('VI. Question Hour', session.questionHour);
  printSection('VII. Committee Report', session.committeeReport);

  if (session.firstReading || session.unfinishedBusiness || session.referralForAction || session.referralForReference || session.referenceOfBusiness) {
    printSection('VIII. Reference of Business', '');
    if (session.firstReading) printSection('   A. First Reading', session.firstReading);
    if (session.unfinishedBusiness) printSection('   B. Unfinished Business', session.unfinishedBusiness);
    if (session.referralForAction) printSection('   C. Referral of Measures and Communications\n   For Appropriate Action', session.referralForAction);
    if (session.referralForReference) printSection('   For Reference and Information / Communications', session.referralForReference);
    if (!session.firstReading && !session.unfinishedBusiness && session.referenceOfBusiness) {
      printSection('   Details', session.referenceOfBusiness);
    }
  }

  printSection('IX. Other Matters', session.otherMatters);
  printSection('X. Thanksgiving Prayer', session.thanksgivingPrayer);
  printSection('XI. Adjournment', session.adjournment);

  if (session.itemsDiscussed?.length > 0) {
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b').text('DISCUSSED ORDINANCES / DOCUMENTS');
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke('#cbd5e1');
    doc.moveDown(0.3);
    session.itemsDiscussed.forEach((item, i) => {
      doc.fontSize(10).font('Helvetica').fillColor('#334155')
        .text(`${i + 1}. Ordinance No. ${item.number} — ${item.title}`, { lineGap: 3 });
    });
    doc.moveDown(1);
  }

  doc.moveDown(2);
  doc.fontSize(10).font('Helvetica').fillColor('#64748b')
    .text(`Recorded by: ${session.createdBy?.name || 'Unknown'}`, { align: 'right' });
  doc.moveTo(doc.page.width - 250, doc.y).lineTo(doc.page.width - 50, doc.y).stroke('#94a3b8');
  doc.fontSize(9).fillColor('#94a3b8').text('Secretary / Recording Officer', { align: 'right' });

  doc.end();
  return { doc, filename: sessionMinutesFilename(session) };
}

/**
 * Generates a full document PDF for public download.
 */
async function generateDocumentPdf(ordinanceId) {
  const ord = await Ordinance.findById(ordinanceId).populate('proponentId', 'firstName middleName lastName position photoUrl');
  if (!ord) throw new Error('Document not found');

  const doc = new PDFDocument({ size: 'LEGAL', margins: { top: 72, bottom: 72, left: 72, right: 72 } });
  doc.info.Title = `${ord.type || 'Ordinance'} ${ord.number} - ${ord.title}`;

  doc.font('Helvetica-Bold').fontSize(14).text('SANGGUNIANG BAYAN NG BONGABONG', { align: 'center' });
  doc.font('Helvetica').fontSize(10).text('Province of Oriental Mindoro', { align: 'center' });
  doc.moveDown(2);

  doc.font('Helvetica-Bold').fontSize(12).text(`${ord.type.toUpperCase()} NO. ${ord.number}`, { align: 'center' });
  doc.moveDown(1);
  doc.font('Helvetica-Bold').fontSize(12).text(ord.title.toUpperCase(), { align: 'center' });
  doc.moveDown(2);

  doc.font('Helvetica').fontSize(11).text(`Author: ${ord.proponentId?.name || '____________________'}`);
  doc.text(`Committee: ${ord.committee}`);
  doc.moveDown(2);

  doc.font('Helvetica-Bold').text('EXPLANATORY NOTE');
  doc.moveDown(0.5);
  doc.font('Helvetica').text(stripHtml(ord.explanatoryNote), { align: 'justify' });
  doc.moveDown(2);

  if (ord.enactingClause) {
    doc.font('Helvetica-Bold').text(ord.enactingClause.toUpperCase(), { align: 'center' });
    doc.moveDown(1);
  }

  doc.font('Helvetica').text(stripHtml(ord.provisions), { align: 'justify' });
  doc.moveDown(1);

  if (ord.penaltyClause && stripHtml(ord.penaltyClause).trim() !== '') {
    doc.font('Helvetica-Bold').text('PENALTY CLAUSE');
    doc.moveDown(0.5);
    doc.font('Helvetica').text(stripHtml(ord.penaltyClause), { align: 'justify' });
    doc.moveDown(1);
  }

  doc.moveDown(3);
  doc.font('Helvetica-Bold').text('APPROVED:', { align: 'left' });
  doc.moveDown(0.5);
  doc.font('Helvetica').text(
    ord.status === 'Approved'
      ? new Date(ord.updatedAt).toLocaleDateString('en-PH', { dateStyle: 'long' })
      : 'PENDING',
    { align: 'left' }
  );

  doc.end();
  return { doc, filename: legislativeDocumentFilename(ord) };
}

module.exports = {
  generateCommitteeReportPdf,
  generateAnnualReportPdf,
  generateParticipationReportPdf,
  generateTimelineReportPdf,
  generateMinutesPdf,
  generateDocumentPdf,
};
