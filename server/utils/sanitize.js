const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const sanitizeHtml = (html) => {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'pre', 'code',
      'a', 'span', 'div',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  });
};

const sanitizePlainText = (text) => {
  if (!text) return '';
  const result = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
  return result.trim();
};

const sanitizeOrdinanceFields = (fields) => {
  const sanitized = { ...fields };
  const htmlFields = [
    'explanatoryNote',
    'definitionsOfTerms',
    'enactingClause',
    'provisions',
    'penaltyClause',
    'plainLanguageSummary',
    'plainLanguageSummary_tl',
  ];
  
  htmlFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = sanitizeHtml(sanitized[field]);
    }
  });

  // Sanitize sections
  if (sanitized.sections && Array.isArray(sanitized.sections)) {
    sanitized.sections = sanitized.sections.map(sec => ({
      title: sanitizePlainText(sec.title || ''),
      content: sanitizeHtml(sec.content || ''),
    }));
  }

  // Sanitize committee report
  if (sanitized.committeeReport) {
    sanitized.committeeReport = {
      findings: sanitizeHtml(sanitized.committeeReport.findings || ''),
      recommendation: sanitizeHtml(sanitized.committeeReport.recommendation || ''),
      viceSecretaryName: sanitizePlainText(sanitized.committeeReport.viceSecretaryName || ''),
    };
  }

  return sanitized;
};

const sanitizeSessionFields = (fields) => {
  const sanitized = { ...fields };
  const htmlFields = [
    'callToOrder',
    'invocation',
    'rollCall',
    'readingOfPreviousMinutes',
    'orderOfBusiness',
    'privilegeHour',
    'citizensHour',
    'questionHour',
    'committeeReport',
    'firstReading',
    'unfinishedBusiness',
    'referralForAction',
    'referralForReference',
    'referenceOfBusiness',
    'otherMatters',
    'thanksgivingPrayer',
    'adjournment',
  ];
  
  htmlFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = sanitizeHtml(sanitized[field]);
    }
  });

  const textFields = ['sessionNumber', 'sessionType', 'legislativeBody', 'venue', 'municipality'];
  textFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = sanitizePlainText(sanitized[field]);
    }
  });

  return sanitized;
};

const sanitizeAnnouncementFields = (fields) => {
  const sanitized = { ...fields };
  if (sanitized.content) {
    sanitized.content = sanitizeHtml(sanitized.content);
  }
  if (sanitized.excerpt) {
    sanitized.excerpt = sanitizePlainText(sanitized.excerpt);
  }
  if (sanitized.title) {
    sanitized.title = sanitizePlainText(sanitized.title);
  }
  return sanitized;
};

module.exports = {
  sanitizeHtml,
  sanitizePlainText,
  sanitizeOrdinanceFields,
  sanitizeSessionFields,
  sanitizeAnnouncementFields,
};
