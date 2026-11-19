/**
 * Parses a full name string into firstName, middleName, lastName components.
 * Strips common honorifics ("Hon.", "Mayor", "Vice Mayor") from the prefix.
 *
 * Examples:
 *   "Hon. Maria Clara S. dela Cruz" → { firstName: "Maria", middleName: "Clara S. dela", lastName: "Cruz" }
 *   "Juan dela Cruz" → { firstName: "Juan", middleName: "", lastName: "dela Cruz" }
 *   "Solo" → { firstName: "Solo", middleName: "", lastName: "" }
 *
 * @param {string} raw - The full name to parse.
 * @returns {{firstName: string, middleName: string, lastName: string}}
 */
function parseName(raw) {
  if (!raw || typeof raw !== 'string') {
    return { firstName: '', middleName: '', lastName: '' };
  }

  let name = raw.replace(/^(vice\s*mayor|hon\.?|mayor)\s*/i, '').trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', middleName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], middleName: '', lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], middleName: '', lastName: parts[1] };
  return { firstName: parts[0], middleName: parts.slice(1, -1).join(' '), lastName: parts[parts.length - 1] };
}

module.exports = { parseName };
