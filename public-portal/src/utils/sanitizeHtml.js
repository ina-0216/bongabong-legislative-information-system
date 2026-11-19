import DOMPurify from 'dompurify';

/**
 * Sanitises CMS-authored article bodies before they reach the DOM.
 *
 * The news `content` field is rich text entered by staff, and it was passed
 * to dangerouslySetInnerHTML untouched. Staff accounts can be compromised, so
 * the output is filtered here as well: allow-list only, no script, no event
 * handlers, no javascript: or data: URLs.
 */
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'sub', 'sup',
  'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'a', 'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'hr', 'span', 'div',
];

const ALLOWED_ATTR = ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height', 'colspan', 'rowspan'];

export function sanitizeArticleHtml(html) {
  if (typeof html !== 'string' || !html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick'],
  });
}

/**
 * Strips every tag and attribute from a plain-text field.
 *
 * Guest consultation fields (full name, barangay, contact number, comment)
 * are never rendered as HTML, but they are echoed back in the public comment
 * list and in the Secretary's verification screen. Sanitising on the way in
 * means a stored payload cannot carry markup even if a future view renders it
 * unsafely. The server sanitises these fields too; this is the client half of
 * the same contract.
 */
export function sanitizePlainText(value) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'string' ? value : String(value);
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  }).trim();
}

/**
 * Sanitises every text field of a guest consultation payload.
 * The `idImage` file is left untouched — it is uploaded as a binary.
 */
export function sanitizeGuestPayload(payload = {}) {
  const sanitized = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (key === 'idImage' || value instanceof File || value instanceof Blob) {
      sanitized[key] = value;
      return;
    }
    if (typeof value === 'string') {
      sanitized[key] = sanitizePlainText(value);
      return;
    }
    sanitized[key] = value;
  });
  return sanitized;
}

export default sanitizeArticleHtml;