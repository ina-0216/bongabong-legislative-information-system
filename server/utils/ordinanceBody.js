const { sanitizeHtml, sanitizePlainText } = require('./sanitize');

const plainTextFromHtml = (html = '') => String(html)
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const mergeLegacySectionsIntoProvisions = (provisions = '', sections = []) => {
  let body = sanitizeHtml(provisions);
  let bodyText = plainTextFromHtml(body);

  for (const section of sections || []) {
    const content = sanitizeHtml(section?.content || '');
    const sectionText = plainTextFromHtml(content);
    const title = sanitizePlainText(section?.title || '').trim();
    if (!sectionText && !title) continue;

    const titleText = plainTextFromHtml(title);
    const contentAlreadyPresent = sectionText.length > 24 && bodyText.includes(sectionText);
    const titleAlreadyPresent = titleText && bodyText.includes(titleText);
    if (contentAlreadyPresent && (!title || titleAlreadyPresent)) continue;

    const titleIsInContent = titleText && sectionText.startsWith(titleText);
    const heading = title && !titleAlreadyPresent && !titleIsInContent
      ? `<p><strong>${title.replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[character]))}</strong></p>`
      : '';
    const appendedContent = contentAlreadyPresent ? '' : content;
    if (!heading && !appendedContent) continue;

    body = `${body}${body ? '<p><br></p>' : ''}${heading}${appendedContent}`;
    bodyText = plainTextFromHtml(body);
  }

  return sanitizeHtml(body);
};

module.exports = { mergeLegacySectionsIntoProvisions };
