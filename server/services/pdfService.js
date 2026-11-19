const fs = require('fs');
const path = require('path');
// Render's build and runtime containers do not share the default home cache.
// Keep Chrome beside deployed dependencies and point Puppeteer there before it loads.
if (process.env.NODE_ENV === 'production') {
  const cacheDir = path.resolve(__dirname, '../node_modules/.cache/puppeteer');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  process.env.PUPPETEER_CACHE_DIR ||= cacheDir;
}
const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const { sanitizeHtml } = require('../utils/sanitize');
const { mergeLegacySectionsIntoProvisions } = require('../utils/ordinanceBody');
const SystemSetting = require('../models/SystemSetting');

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

const PDF_HEADER_KEY = 'pdf-header';
const PDF_HEADER_CACHE_MS = 60 * 1000;
let cachedPdfHeaderAsset = null;
let cachedPdfHeaderAt = 0;
let pdfHeaderLoadPromise = null;

const getDefaultPdfHeaderBanner = () => {
  const pngPath = path.join(__dirname, '../public/assets/header-banner.png');
  const jpgPath = path.join(__dirname, '../public/assets/header-banner.jpg');
  if (fs.existsSync(pngPath)) {
    return `data:image/png;base64,${fs.readFileSync(pngPath, 'base64')}`;
  }
  if (fs.existsSync(jpgPath)) {
    return `data:image/jpeg;base64,${fs.readFileSync(jpgPath, 'base64')}`;
  }
  return '';
};

const getDefaultPdfHeaderAsset = () => {
  const dataUrl = getDefaultPdfHeaderBanner();
  return {
    dataUrl,
    mimeType: dataUrl.startsWith('data:image/png;') ? 'image/png' : 'image/jpeg',
    pdfBytes: null,
    source: dataUrl ? 'default' : 'none',
  };
};

const getPdfHeaderAsset = async () => {
  if (cachedPdfHeaderAsset !== null && Date.now() - cachedPdfHeaderAt < PDF_HEADER_CACHE_MS) {
    return cachedPdfHeaderAsset;
  }
  if (pdfHeaderLoadPromise) return pdfHeaderLoadPromise;

  pdfHeaderLoadPromise = (async () => {
    try {
      if (SystemSetting.db.readyState === 1) {
        const setting = await SystemSetting.findOne({ key: PDF_HEADER_KEY }).lean();
        if (setting?.pdfHeaderUrl && setting.pdfHeaderMimeType) {
          const response = await fetch(setting.pdfHeaderUrl, {
            signal: AbortSignal.timeout(10_000),
          });
          if (!response.ok) throw new Error(`Header download returned HTTP ${response.status}.`);

          const bytes = Buffer.from(await response.arrayBuffer());
          if (setting.pdfHeaderMimeType === 'application/pdf') {
            const headerPdf = await PDFDocument.load(bytes);
            if (headerPdf.getPageCount() !== 1) {
              throw new Error('The configured PDF header must contain exactly one page.');
            }
            cachedPdfHeaderAsset = {
              dataUrl: `data:application/pdf;base64,${bytes.toString('base64')}`,
              mimeType: 'application/pdf',
              pdfBytes: bytes,
              source: 'custom',
            };
          } else if (['image/png', 'image/jpeg'].includes(setting.pdfHeaderMimeType)) {
            cachedPdfHeaderAsset = {
              dataUrl: `data:${setting.pdfHeaderMimeType};base64,${bytes.toString('base64')}`,
              mimeType: setting.pdfHeaderMimeType,
              pdfBytes: null,
              source: 'custom',
            };
          }
        }
      }
    } catch (error) {
      console.warn('[PDF] Could not load the configured header; using the built-in header.', error.message);
    }

    if (!cachedPdfHeaderAsset) cachedPdfHeaderAsset = getDefaultPdfHeaderAsset();
    cachedPdfHeaderAt = Date.now();
    return cachedPdfHeaderAsset;
  })();

  try {
    return await pdfHeaderLoadPromise;
  } finally {
    pdfHeaderLoadPromise = null;
  }
};

const getPdfHeaderBanner = async () => {
  const asset = await getPdfHeaderAsset();
  return asset.mimeType.startsWith('image/') ? asset.dataUrl : '';
};

const getPdfHeaderMarkup = async () => {
  const asset = await getPdfHeaderAsset();
  if (asset.pdfBytes) return '<div class="header-template-spacer" aria-hidden="true"></div>';
  return asset.dataUrl ? `<img src="${asset.dataUrl}" class="header-banner" />` : '';
};

const getPdfHeaderPreview = async () => {
  const { dataUrl, mimeType, source } = await getPdfHeaderAsset();
  return { dataUrl, mimeType, source };
};

const getPdfHeaderTemplate = async () => (await getPdfHeaderAsset()).pdfBytes;

const clearPdfHeaderCache = () => {
  cachedPdfHeaderAsset = null;
  cachedPdfHeaderAt = 0;
};

const applyPdfHeaderTemplate = async (documentBuffer, headerBuffer) => {
  const document = await PDFDocument.load(documentBuffer);
  const template = await PDFDocument.load(headerBuffer);
  if (template.getPageCount() !== 1) {
    throw new Error('The PDF header template must contain exactly one page.');
  }

  const composite = await PDFDocument.create();
  const [background] = await composite.embedPdf(headerBuffer, [0]);
  const contentPages = await composite.embedPdf(documentBuffer, document.getPageIndices());

  contentPages.forEach((content) => {
    const { width, height } = content;
    const page = composite.addPage([width, height]);
    const backgroundScale = Math.min(width / background.width, height / background.height);
    const backgroundSize = background.scale(backgroundScale);
    page.drawPage(background, {
      x: (width - backgroundSize.width) / 2,
      y: (height - backgroundSize.height) / 2,
      width: backgroundSize.width,
      height: backgroundSize.height,
    });
    page.drawPage(content, { x: 0, y: 0, width, height });
  });

  return Buffer.from(await composite.save());
};

const renderPdfWithHeader = async (html) => {
  const documentBuffer = await renderPdfWithRetry(html);
  const headerBuffer = await getPdfHeaderTemplate();
  if (!headerBuffer) return documentBuffer;

  try {
    return await applyPdfHeaderTemplate(documentBuffer, headerBuffer);
  } catch (error) {
    console.warn('[PDF] Could not apply the configured PDF header; returning the generated document.', error.message);
    return documentBuffer;
  }
};

// --- PERF-03 / PDF-01: Puppeteer Browser Pool & Reliability ---
let browserInstance = null;
let browserLaunchPromise = null;
let browserIdleTimeout = null;
let activePages = 0;
// Render instances have limited memory. Chromium PDF rendering is memory-heavy,
// so keep a small queue instead of allowing concurrent requests to OOM the service.
const MAX_CONCURRENT_PAGES = 2;

let isShuttingDown = false;

const shutdownBrowser = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  if (browserIdleTimeout) clearTimeout(browserIdleTimeout);
  if (browserInstance) {
    console.log('[PDF] Gracefully shutting down Puppeteer browser');
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }
};

// Graceful shutdown for process signals and test teardown
if (typeof process !== 'undefined') {
  process.on('SIGTERM', shutdownBrowser);
  process.on('SIGINT', shutdownBrowser);
  process.on('beforeExit', shutdownBrowser);
}

const getBrowser = async () => {
  if (!browserInstance) {
    if (!browserLaunchPromise) {
      browserLaunchPromise = puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      }).then((browser) => {
        browserInstance = browser;
        browser.on('disconnected', () => {
          if (browserInstance === browser) browserInstance = null;
        });
        console.log('[PDF] Puppeteer browser instance launched');
        return browser;
      }).finally(() => {
        browserLaunchPromise = null;
      });
    }
    await browserLaunchPromise;
  }

  // Auto-close browser after 5 minutes of inactivity to free memory
  if (browserIdleTimeout) clearTimeout(browserIdleTimeout);
  browserIdleTimeout = setTimeout(async () => {
    const idleBrowser = browserInstance;
    if (idleBrowser && activePages === 0) {
      console.log('[PDF] Closing idle Puppeteer browser to free memory');
      browserInstance = null;
      await idleBrowser.close().catch(() => {});
    }
  }, 5 * 60 * 1000);

  return browserInstance;
};

const renderPdfWithRetry = async (html, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    let page = null;
    let slotAcquired = false;
    try {
      while (activePages >= MAX_CONCURRENT_PAGES) {
        await new Promise(r => setTimeout(r, 250));
      }
      activePages++;
      slotAcquired = true;

      const browser = await getBrowser();
      page = await browser.newPage();

      page.setDefaultNavigationTimeout(60000);
      page.setDefaultTimeout(60000);

      // The generated documents use embedded/local assets. Waiting for network
      // idle is unnecessary and can hang on Render when Chromium keeps a socket
      // open; DOM readiness is enough before printing this self-contained HTML.
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });
      // eslint-disable-next-line no-undef -- document exists in the Puppeteer page context.
      await page.evaluate(() => document.fonts.ready.then(() => true));

      const pdfBuffer = await page.pdf({
        format: 'Letter',
        printBackground: true,
        margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' },
        timeout: 60000
      });

      return Buffer.from(pdfBuffer);

    } catch (error) {
      console.error(`[PDF] Render attempt ${attempt}/${retries} failed:`, error.stack || error.message);

      if (attempt === retries) {
        const failure = new Error('PDF generation is temporarily unavailable. Please try again shortly.');
        failure.statusCode = 503;
        failure.cause = error;
        throw failure;
      }
      await new Promise(r => setTimeout(r, attempt * 1000));

      if (/browser.*disconnected|target closed|session closed/i.test(error.message)) {
        const crashedBrowser = browserInstance;
        browserInstance = null;
        if (crashedBrowser) await crashedBrowser.close().catch(() => {});
      }
    } finally {
      if (page) await page.close().catch(() => {});
      if (slotAcquired) activePages = Math.max(0, activePages - 1);
    }
  }
};

/**
 * Generates a PDF for an Ordinance.
 * @param {Object} ord - The populated Ordinance object.
 * @returns {Buffer} - The generated PDF buffer.
 */
async function generateOrdinancePdf(ord) {
  const headerMarkup = await getPdfHeaderMarkup();

  const formatSection = (title, content) => {
    if (!content || content.trim() === '' || content === '<p><br></p>') return '';
    return `
      <div style="margin-bottom: 15px;">
        <h3 style="text-transform: uppercase; font-size: 13px; margin-bottom: 5px;">${title}</h3>
        <div style="font-size: 12px; line-height: 1.5; text-align: justify;">${content}</div>
      </div>
    `;
  };

  const ordinanceBody = mergeLegacySectionsIntoProvisions(ord.provisions, ord.sections);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(`${ord.type || 'Ordinance'} ${ord.number} - ${ord.title || ''}`)}</title>
      <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 40px; color: #0f172a; }
        .header-banner { width: 100%; max-height: 120px; object-fit: contain; margin-bottom: 30px; }
        .header-template-spacer { height: 200px; margin-bottom: 30px; }
        .title { text-align: center; font-weight: bold; font-size: 14px; text-transform: uppercase; margin-bottom: 10px; }
        .sub-title { text-align: center; font-size: 12px; margin-bottom: 30px; font-style: italic; }
        .proponent { margin-bottom: 20px; font-size: 12px; font-weight: bold; }
        .enacting { margin: 20px 0; font-size: 13px; font-weight: bold; text-transform: uppercase; text-align: center; }
        .signatures { margin-top: 50px; display: flex; justify-content: space-between; page-break-inside: avoid; }
        .signature-block { width: 45%; text-align: center; }
        .signature-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; font-weight: bold; font-size: 12px; }
      </style>
    </head>
    <body>
      ${headerMarkup}
      ${(ord.isDraft || ord.status === 'Draft') ? '<div style="background-color: #fef3c7; color: #92400e; border: 2px dashed #f59e0b; text-align: center; padding: 8px; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px;">WORKING DRAFT — NOT AN OFFICIAL INSTRUMENT</div>' : ''}

      <div class="title">${ord.type.toUpperCase()} NO. ${ord.number}</div>
      <div class="title">${ord.title}</div>

      <div class="proponent">Authored by: Hon. ${ord.proponentId?.name || 'N/A'} - ${ord.proponentId?.position || 'SB Member'}</div>

      ${formatSection('Explanatory Note', ord.explanatoryNote)}

      ${formatSection('Definitions of Terms', ord.definitionsOfTerms)}

      ${ord.enactingClause ? `<div class="enacting">${ord.enactingClause}</div>` : '<div class="enacting">BE IT ORDAINED BY THE SANGGUNIANG BAYAN IN SESSION ASSEMBLED:</div>'}

      ${formatSection('General Provisions', ordinanceBody)}

      ${formatSection('Penalty Clause', ord.penaltyClause)}

      <div class="signatures">
        <div class="signature-block">
          <div class="signature-line">Secretary to the Sangguniang Bayan</div>
        </div>
        <div class="signature-block">
          <div class="signature-line">Municipal Vice-Mayor / Presiding Officer</div>
        </div>
      </div>
    </body>
    </html>
  `;

  return renderPdfWithHeader(html);
}

/**
 * Generates a PDF for a Session.
 * @param {Object} session - The populated Session object.
 * @returns {Buffer} - The generated PDF buffer.
 */
async function generateSessionPdf(session) {
  const headerMarkup = await getPdfHeaderMarkup();

  const formatList = (users) => {
    if (!users || users.length === 0) return '<p style="margin:2px 0; padding-left: 20px; font-style: italic; color: #64748b;">None</p>';
    return users.filter(Boolean).map(u => {
      const name = escapeHtml(u.name || [u.firstName, u.middleName, u.lastName].filter(Boolean).join(' '));
      const pos = u.position ? ` - ${escapeHtml(u.position)}` : '';
      return `<p style="margin:2px 0; padding-left: 20px;">Hon. ${name}${pos}</p>`;
    }).join('');
  };

  const formatSection = (title, content) => {
    if (!content || content.trim() === '' || content === '<p><br></p>') return '';
    return `
      <div style="margin-bottom: 20px;">
        <h3 style="text-transform: uppercase; margin-bottom: 5px; font-size: 13px;">${escapeHtml(title)}</h3>
        <div style="font-size: 12px; line-height: 1.5;">${sanitizeHtml(content)}</div>
      </div>
    `;
  };

  const formatSubSection = (subTitle, content) => {
    if (!content || content.trim() === '' || content === '<p><br></p>') return '';
    return `
      <div style="margin-left: 20px; margin-bottom: 12px;">
        <h4 style="text-transform: uppercase; margin-bottom: 4px; font-size: 12px; font-weight: bold; color: #1e293b;">${escapeHtml(subTitle)}</h4>
        <div style="font-size: 12px; line-height: 1.5;">${sanitizeHtml(content)}</div>
      </div>
    `;
  };

  const sessionNum = (session.sessionNumber || '').trim();
  const sessionType = (session.sessionType || 'Regular Session').trim();
  const council = (session.legislativeBody || '12th Sangguniang Bayan').trim();
  const municipality = (session.municipality || 'Bongabong, Oriental Mindoro').trim();
  const dateStr = new Date(session.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const venue = (session.venue || '').trim();
  const recordedByName = session.createdBy?.name
    || [session.createdBy?.firstName, session.createdBy?.middleName, session.createdBy?.lastName].filter(Boolean).join(' ')
    || 'Unknown';

  let headerTitle = '';
  if (sessionNum) {
    headerTitle = `${escapeHtml(sessionNum.toUpperCase())} ${escapeHtml(sessionType.toUpperCase())} OF THE ${escapeHtml(council.toUpperCase())} OF ${escapeHtml(municipality.toUpperCase())}`;
  } else {
    headerTitle = escapeHtml((session.title || '').toUpperCase());
  }
  let heldLine = `HELD ON ${dateStr.toUpperCase()}`;
  if (venue) {
    heldLine += `, AT THE ${escapeHtml(venue.toUpperCase())}`;
  }

  const effectivePrivilegeHour = session.privilegeHour || session.citizensHour || '';

  const hasRefOfBusiness = Boolean(
    (session.firstReading && session.firstReading.trim() && session.firstReading !== '<p><br></p>') ||
    (session.unfinishedBusiness && session.unfinishedBusiness.trim() && session.unfinishedBusiness !== '<p><br></p>') ||
    (session.referralForAction && session.referralForAction.trim() && session.referralForAction !== '<p><br></p>') ||
    (session.referenceOfBusiness && session.referenceOfBusiness.trim() && session.referenceOfBusiness !== '<p><br></p>')
  );

  let refOfBusinessHtml = '';
  if (hasRefOfBusiness) {
    refOfBusinessHtml = `
      <div style="margin-bottom: 20px;">
        <h3 style="text-transform: uppercase; margin-bottom: 8px; font-size: 13px;">VIII. REFERENCE OF BUSINESS</h3>
        ${session.referenceOfBusiness && session.referenceOfBusiness.trim() && session.referenceOfBusiness !== '<p><br></p>' ? `<div style="font-size: 12px; line-height: 1.5; margin-bottom: 10px;">${sanitizeHtml(session.referenceOfBusiness)}</div>` : ''}
        ${formatSubSection('A. First Reading', session.firstReading)}
        ${formatSubSection('B. Unfinished Business', session.unfinishedBusiness)}
        ${formatSubSection('C. Referral Business of Measures and Communication', session.referralForAction)}
      </div>
    `;
  }

  const linkedMeasures = (session.itemsDiscussed || []).filter(item => item && typeof item === 'object');
  const linkedMeasuresHtml = linkedMeasures.length ? `
    <div style="margin-bottom: 20px;">
      <h3 style="text-transform: uppercase; margin-bottom: 8px; font-size: 13px;">Measures Linked to This Session</h3>
      <ul style="font-size: 12px; line-height: 1.6;">
        ${linkedMeasures.map(item => `<li><strong>${escapeHtml(item.type || 'Measure')} ${escapeHtml(item.number || '')}</strong> — ${escapeHtml(item.title || '')}</li>`).join('')}
      </ul>
    </div>` : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
        <title>${escapeHtml(`Official Minutes - ${session.title || ''}`)}</title>
      <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 40px; color: #0f172a; }
        .header-banner { width: 100%; max-height: 120px; object-fit: contain; margin-bottom: 30px; }
        .header-template-spacer { height: 200px; margin-bottom: 30px; }
        .title { text-align: center; font-weight: bold; font-size: 14px; text-transform: uppercase; margin-bottom: 25px; line-height: 1.5; }
        .attendance { margin-bottom: 20px; }
        .attendance h3 { font-size: 13px; margin-bottom: 5px; margin-top: 15px; }
        .divider { text-align: center; margin: 20px 0; color: #94a3b8; font-family: monospace; font-size: 11px; letter-spacing: -1px; }
        .signatures { margin-top: 50px; display: flex; justify-content: space-between; page-break-inside: avoid; }
        .signature-block { width: 45%; text-align: center; }
        .signature-prefix { font-size: 11px; margin-bottom: 35px; text-transform: uppercase; font-weight: 500; }
        .signature-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; font-weight: bold; font-size: 12px; }
        .recorded-by { margin-top: 24px; text-align: right; font-size: 11px; color: #334155; }
        .draft-watermark { position: fixed; top: 42%; left: 12%; transform: rotate(-28deg); font-size: 72px; font-weight: bold; color: rgba(190, 24, 93, .14); z-index: -1; }
      </style>
    </head>
    <body>
      ${headerMarkup}
      ${session.status === 'Draft' ? '<div class="draft-watermark">DRAFT</div>' : ''}
      <div class="title">${headerTitle}<br/>${heldLine}</div>

      <div class="attendance">
        <h3>PRESENT:</h3>
        ${formatList(session.attendance?.present)}
        <h3>ON OFFICIAL BUSINESS:</h3>
        ${formatList(session.attendance?.onOfficialBusiness)}
        <h3>ABSENT:</h3>
        ${formatList(session.attendance?.absent)}
      </div>

      <div class="divider">x------------------------------------------------------------------------------------------------------------------ x</div>

      ${formatSection('I. Call to Order', session.callToOrder)}
      ${formatSection('II. Invocation, National Anthem and Bongabong Hymn', session.invocation)}
      ${formatSection('III. Roll Call', session.rollCall)}
      ${formatSection('IV. Reading and Adoption of Previous Minutes', session.readingOfPreviousMinutes)}
      ${formatSection('Adoption of the Order and Calendar of Business', session.orderOfBusiness)}
      ${formatSection('V. Privilege Hour', effectivePrivilegeHour)}
      ${formatSection('VI. Question Hour', session.questionHour)}
      ${formatSection('VII. Committee Report', session.committeeReport)}
      ${refOfBusinessHtml}
      ${linkedMeasuresHtml}
      ${formatSection('IX. For Reference and Information / Communications', session.referralForReference)}
      ${formatSection('X. Other Matters', session.otherMatters)}
      ${formatSection('XI. Thanksgiving Prayer', session.thanksgivingPrayer)}
      ${formatSection('XII. Adjournment', session.adjournment)}

      <div class="recorded-by">Recorded by: ${escapeHtml(recordedByName)}<br />Secretary / Recording Officer</div>

      <div class="signatures">
        <div class="signature-block">
          <div class="signature-prefix">Certified true:</div>
          <div class="signature-line">Secretary to the Sangguniang Bayan</div>
        </div>
        <div class="signature-block">
          <div class="signature-prefix">Attested by:</div>
          <div class="signature-line">Municipal Vice-Mayor / Presiding Officer</div>
        </div>
      </div>
    </body>
    </html>
  `;

  return renderPdfWithHeader(html);
}


/**
 * Generates a PDF for a Resolution.
 * Conforms strictly to Bongabong Sangguniang Bayan resolution format:
 * - Recitals (WHEREAS...)
 * - Enacting / Resolving clause (NOW, THEREFORE... BE IT RESOLVED...)
 * - Explicit motion and seconding attribution
 * - Final certification block
 * - Watermark if draft or unapproved
 * @param {Object} res - The populated Resolution object.
 * @returns {Buffer} - The generated PDF buffer.
 */
async function generateResolutionPdf(res) {
  const headerMarkup = await getPdfHeaderMarkup();

  const isDraft = res.isDraft || res.status === 'Draft';
  const motionPerson = res.motionBy?.name || (res.proponentId ? `Hon. ${res.proponentId.name || 'Proponent'}` : 'Hon. Member');
  const secondedNames = (res.secondedBy && res.secondedBy.length > 0)
    ? res.secondedBy.map(s => s.name || 'Hon. Member').join(', ')
    : 'Hon. Members of the Body';

  const defaultEnacting = `NOW, THEREFORE, on motion of ${motionPerson}, seconded by ${secondedNames}, BE IT RESOLVED, as it is hereby resolved by the Sangguniang Bayan of Bongabong in session assembled:`;
  const enactingText = res.enactingClause && res.enactingClause.trim() ? res.enactingClause : defaultEnacting;

  const formatSection = (title, content) => {
    if (!content || content.trim() === '' || content === '<p><br></p>') return '';
    return `
      <div style="margin-bottom: 15px;">
        <h3 style="text-transform: uppercase; font-size: 13px; margin-bottom: 5px;">${title}</h3>
        <div style="font-size: 12px; line-height: 1.6; text-align: justify;">${content}</div>
      </div>
    `;
  };

  const resolutionBody = mergeLegacySectionsIntoProvisions(res.provisions, res.sections);

  const coAuthorsLine = (res.coAuthors && res.coAuthors.length > 0)
    ? `<div style="font-size: 11px; margin-bottom: 15px; color: #475569;">Co-Authored by: ${res.coAuthors.map(c => 'Hon. ' + (c.name || 'SB Member')).join(', ')}</div>`
    : '';

  const distributionHtml = (res.distribution && res.distribution.length > 0)
    ? `
      <div style="margin-top: 20px; font-size: 11px;">
        <strong>RESOLVED FINALLY, that copies of this resolution be furnished to:</strong>
        <ul style="margin-top: 5px; padding-left: 20px; line-height: 1.5;">
          ${res.distribution.map(d => `<li>${d}</li>`).join('')}
        </ul>
      </div>
    `
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(`Resolution No. ${res.number} - ${res.title || ''}`)}</title>
      <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 40px; color: #0f172a; position: relative; }
        .header-banner { width: 100%; max-height: 120px; object-fit: contain; margin-bottom: 25px; }
        .header-template-spacer { height: 200px; margin-bottom: 25px; }
        .draft-banner {
          background-color: #fef3c7; color: #92400e; border: 2px dashed #f59e0b;
          text-align: center; padding: 8px; font-weight: bold; font-size: 12px;
          text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px;
        }
        .title { text-align: center; font-weight: bold; font-size: 14px; text-transform: uppercase; margin-bottom: 10px; }
        .proponent { margin-bottom: 6px; font-size: 12px; font-weight: bold; }
        .enacting { margin: 20px 0; font-size: 12px; font-weight: bold; line-height: 1.6; text-align: justify; }
        .provisions { font-size: 12px; line-height: 1.6; text-align: justify; margin-bottom: 15px; }
        .signatures { margin-top: 50px; display: flex; justify-content: space-between; page-break-inside: avoid; }
        .signature-block { width: 45%; text-align: center; }
        .signature-prefix { font-size: 11px; margin-bottom: 35px; text-transform: uppercase; font-weight: 500; }
        .signature-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; font-weight: bold; font-size: 12px; }
      </style>
    </head>
    <body>
      ${headerMarkup}
      ${isDraft ? '<div class="draft-banner">WORKING DRAFT — NOT AN OFFICIAL INSTRUMENT</div>' : ''}

      <div class="title">RESOLUTION NO. ${res.number}</div>
      <div class="title" style="margin-bottom: 25px;">${res.title}</div>

      <div class="proponent">Authored by: Hon. ${res.proponentId?.name || 'N/A'} - ${res.proponentId?.position || 'SB Member'}</div>
      ${coAuthorsLine}

      ${formatSection('Recitals (Preamble)', res.explanatoryNote)}

      ${formatSection('Definitions of Terms', res.definitionsOfTerms)}

      <div class="enacting">${enactingText}</div>

      <div class="provisions">${resolutionBody}</div>
      ${distributionHtml}

      <div class="signatures">
        <div class="signature-block">
          <div class="signature-prefix">Certified Correct:</div>
          <div class="signature-line">Secretary to the Sangguniang Bayan</div>
        </div>
        <div class="signature-block">
          <div class="signature-prefix">Attested by:</div>
          <div class="signature-line">Municipal Vice-Mayor / Presiding Officer</div>
        </div>
      </div>
    </body>
    </html>
  `;

  return renderPdfWithHeader(html);
}

module.exports = {
  generateOrdinancePdf,
  generateResolutionPdf,
  generateSessionPdf,
  getPdfHeaderBanner,
  getPdfHeaderPreview,
  applyPdfHeaderTemplate,
  clearPdfHeaderCache,
};
