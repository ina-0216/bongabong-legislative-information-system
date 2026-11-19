/**
 * Legislative Document Extraction Service
 *
 * Turns the raw text of an uploaded ordinance/resolution document into
 * structured field candidates that the authoring form can pre-populate.
 *
 * The extractor is deliberately rule-based rather than model-based: the
 * legislative corpus follows a fixed layout ("AN ORDINANCE NO. 2026-001
 * ...", "WHEREAS, ...", "Section 1. ..."), so pattern matching gives
 * deterministic, auditable results with no external API dependency, no
 * per-call cost, and no risk of a model inventing a number or a title that
 * does not exist in the source document.
 *
 * Every candidate carries a confidence score so the UI can show the user
 * which values are solid and which need a second look before saving.
 */

const { sanitizePlainText } = require('../utils/sanitize');

/** Minimum characters of text for an extraction to be worth reviewing. */
const MIN_USABLE_TEXT_LENGTH = 50;

/** Confidence assigned to a candidate found by an unambiguous pattern. */
const CONFIDENCE = {
  EXACT_NUMBER: 0.9,
  TITLE: 0.75,
  PROPOSING: 0.7,
  WHEREAS: 0.75,
  EXPLANATORY_NOTE: 0.7,
  SECTION: 0.55,
  PROPONENT: 0.6,
  ENACTING: 0.6,
  PENALTY: 0.55,
  SECTOR: 0.5,
};

/**
 * Splits extracted text into trimmed, non-empty lines.
 * @param {string} text
 * @returns {string[]}
 */
const toLines = (text) =>
  String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

/**
 * Collapses a PDF's hard-wrapped lines into a single flowing paragraph.
 *
 * PDF extraction yields one visual line per line, so a sentence can be split
 * across several entries. Joining with a space restores the sentence before
 * any pattern is matched against it.
 *
 * @param {string[]} lines
 * @returns {string}
 */
const unwrapLines = (lines) => lines.join(' ').replace(/\s+/g, ' ').trim();

/**
 * Normalises a document type token to the values the form stores.
 * @param {string} value
 * @returns {'Ordinance'|'Resolution'|null}
 */
const normaliseDocumentType = (value) => {
  const upper = String(value || '').toUpperCase();
  if (upper.includes('RESOLUTION')) return 'Resolution';
  if (upper.includes('ORDINANCE')) return 'Ordinance';
  return null;
};

/**
 * Extracts the ordinance/resolution number.
 *
 * Handles both the YYYY-NNN format used by ordinances and the
 * RES-YYYY-NNN format used by resolutions.
 *
 * @param {string} text
 * @returns {{value: string, confidence: number}|null}
 */
const findNumber = (text) => {
  const resolutionMatch = text.match(/\bRES[-\s]?(\d{4})[-\s]?(\d{3,})\b/i);
  if (resolutionMatch) {
    return {
      value: `RES-${resolutionMatch[1]}-${resolutionMatch[2]}`,
      confidence: CONFIDENCE.EXACT_NUMBER,
    };
  }

  const ordinanceMatch = text.match(/\b(\d{4})-(\d{3,})\b/);
  if (ordinanceMatch) {
    return {
      value: `${ordinanceMatch[1]}-${ordinanceMatch[2]}`,
      confidence: CONFIDENCE.EXACT_NUMBER,
    };
  }

  return null;
};

/**
 * Extracts the official title.
 *
 * The title in a Philippine local-government measure is the sentence
 * immediately following the "AN ORDINANCE/RESOLUTION NO. ..." heading, and
 * it conventionally opens with "Proposing to ..." or names the subject
 * matter directly.
 *
 * @param {string} text
 * @param {string[]} lines
 * @returns {{value: string, confidence: number}|null}
 */
const findTitle = (text, lines) => {
  // Preferred: a line that explicitly states what the measure proposes.
  for (const line of lines) {
    if (
      line.length > 20 &&
      line.length < 400 &&
      /\bPROPOSING\s+TO\b/i.test(line) &&
      !/^AN\s+(ORDINANCE|RESOLUTION)\b/i.test(line)
    ) {
      return {
        value: sanitizePlainText(line),
        confidence: CONFIDENCE.TITLE,
      };
    }
  }

  // Fallback: the first substantial line after the "AN ORDINANCE NO. ..."
  // heading line, which is where the subject matter normally sits.
  const headingIndex = lines.findIndex((line) => /^AN\s+(ORDINANCE|RESOLUTION)\b/i.test(line));
  if (headingIndex !== -1) {
    for (let index = headingIndex + 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (line.length > 20 && line.length < 400) {
        return {
          value: sanitizePlainText(line),
          confidence: CONFIDENCE.PROPOSING,
        };
      }
    }
  }

  return null;
};

/**
 * Extracts the document type from the "AN ORDINANCE"/"AN RESOLUTION" heading.
 *
 * Only the heading line is inspected. Scanning the whole document would let
 * the body override the type — an ordinance whose text says "resolutions
 * filed with the Sangguniang Bayan" would be misread as a resolution.
 *
 * @param {string} text - The full document text
 * @param {string[]} lines - The document's lines
 * @returns {{value: 'Ordinance'|'Resolution', confidence: number}|null}
 */
const findDocumentType = (text, lines) => {
  // The heading is the first line that names the instrument.
  const heading = lines.find((line) => /^AN?\s+(ORDINANCE|RESOLUTION)\b/i.test(line));
  const type = normaliseDocumentType(heading || text);
  if (!type) return null;
  return { value: type, confidence: CONFIDENCE.PROPOSING };
};

/**
 * Extracts the series year implied by the ordinance number.
 * @param {{value: string}|null} numberCandidate
 * @returns {{value: number, confidence: number}|null}
 */
const findSeriesYear = (numberCandidate) => {
  if (!numberCandidate) return null;
  const match = numberCandidate.value.match(/(\d{4})/);
  if (!match) return null;
  return {
    value: Number(match[1]),
    confidence: numberCandidate.confidence,
  };
};

/**
 * Extracts the explanatory note / preamble.
 *
 * For resolutions this is the WHEREAS recital block; for ordinances it is
 * the explanatory note paragraph that precedes the enacting clause.
 *
 * @param {string} text
 * @returns {{value: string, confidence: number}|null}
 */
const findExplanatoryNote = (text) => {
  // Resolutions open with a WHEREAS recital block.
  const whereasIndex = text.search(/\bWHEREAS\b/i);
  if (whereasIndex !== -1) {
    const tail = text.slice(whereasIndex);
    // Stop at the resolving clause so the note does not swallow the body.
    const resolvingIndex = tail.search(/\b(NOW,?\s*THEREFORE|BE\s+IT\s+RESOLVED)\b/i);
    const note = resolvingIndex !== -1 ? tail.slice(0, resolvingIndex) : tail.slice(0, 2000);
    if (note.trim().length > 20) {
      return {
        value: sanitizePlainText(note.trim()),
        confidence: CONFIDENCE.WHEREAS,
      };
    }
  }

  // Ordinances label the preamble explicitly.
  const labelled = text.match(/EXPLANATORY\s+NOTE\s*[:\-–]?\s*([\s\S]{40,4000})/i);
  if (labelled) {
    return {
      value: sanitizePlainText(labelled[1].trim()),
      confidence: CONFIDENCE.EXPLANATORY_NOTE,
    };
  }

  // Otherwise take the text between the heading and the enacting clause.
  const enactingIndex = text.search(/\bBE\s+IT\s+ORDAINED\b/i);
  if (enactingIndex !== -1) {
    const head = text.slice(0, enactingIndex);
    const afterHeading = head.split(/\bAN\s+(ORDINANCE|RESOLUTION)\b[^\n]*\n/i)[1] || '';
    const body = afterHeading.trim();
    if (body.length > 40) {
      return {
        value: sanitizePlainText(body),
        confidence: CONFIDENCE.EXPLANATORY_NOTE,
      };
    }
  }

  return null;
};

/**
 * Extracts the general provisions / resolved clauses body.
 *
 * The body runs from the enacting clause to the penalty clause (or the
 * signature block), which is exactly the range the form's `provisions`
 * field holds.
 *
 * @param {string} text
 * @returns {{value: string, confidence: number}|null}
 */
const findProvisions = (text) => {
  const enactingMatch = text.match(
    /\b(BE\s+IT\s+ORDAINED|NOW,?\s*THEREFORE\b[\s\S]{0,400}?BE\s+IT\s+RESOLVED)[\s\S]*?(?=\bPENALTY\b|\bSection\s+\d+\s+(?:shall|is|are)\s+punishable)/i
  );

  if (enactingMatch) {
    const body = text.slice(enactingMatch.index, enactingMatch.index + enactingMatch[0].length);
    if (body.trim().length > 40) {
      return {
        value: sanitizePlainText(body.trim()),
        confidence: CONFIDENCE.SECTION,
      };
    }
  }

  // Fallback: collect the numbered sections themselves.
  const sectionPattern = /(?:^|\n)\s*SECTION\s+\d+[.:]?\s*([\s\S]{1,1200}?)(?=\n\s*SECTION\s+\d+|$)/gi;
  const sections = [];
  let match = sectionPattern.exec(text);
  while (match && sections.length < 40) {
    sections.push(`Section ${match[0].trim().replace(/^\s*SECTION\s+(\d+)[.:]?/i, '$1. ')}`);
    match = sectionPattern.exec(text);
  }
  if (sections.length > 0) {
    return {
      value: sanitizePlainText(sections.join('\n\n')),
      confidence: CONFIDENCE.SECTION,
    };
  }

  return null;
};

/**
 * Extracts the enacting clause.
 * @param {string} text
 * @returns {{value: string, confidence: number}|null}
 */
const findEnactingClause = (text) => {
  const match = text.match(
    /\b(BE\s+IT\s+ORDAINED\s+BY[\s\S]{0,300}?assembly\s*:|NOW,?\s*THEREFORE[\s\S]{0,500}?resolved\s*:)/i
  );
  if (match) {
    return {
      value: sanitizePlainText(match[0].trim()),
      confidence: CONFIDENCE.ENACTING,
    };
  }
  return null;
};

/**
 * Extracts the penalty clause.
 * @param {string} text
 * @returns {{value: string, confidence: number}|null}
 */
const findPenaltyClause = (text) => {
  const match = text.match(
    /\bPENALTY\s+(?:CLAUSE)?\s*[:\-–]?\s*([\s\S]{30,2000}?)(?=\n\s*(?:SECTION\s+\d+|ARTICLE\s+\d+)|$)/i
  );
  if (match) {
    const value = sanitizePlainText(match[1].trim());
    if (value.length > 20) {
      return { value, confidence: CONFIDENCE.PENALTY };
    }
  }
  return null;
};

/**
 * Extracts a proponent name from the author attribution line.
 *
 * Returns the matched name only — resolving it to an SBMember record is the
 * controller's job, because only the server knows the current council.
 *
 * @param {string} text
 * @returns {{value: string, confidence: number}|null}
 */
const findProponent = (text) => {
  const patterns = [
    /(?:Authored|Sponsored|Proposed|Introduced)\s+by\s+(?:Hon\.?\s*)?([A-Z][A-Za-z.\-' ]{3,60}?)(?=\s*[,\n.]|\s+(?:City|Municipal)\s+Government|\s+of\s+Bongabong)/,
    /Hon\.\s+([A-Z][A-Za-z.\-' ]{3,60}?)(?=\s*[,\n.]|\s+City\s+Municipal)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const name = match[1].trim().replace(/\s+/g, ' ');
      if (name.length >= 4) {
        return { value: name, confidence: CONFIDENCE.PROPONENT };
      }
    }
  }

  return null;
};

/**
 * Guesses the sector tag from keyword matches.
 *
 * The form's sector list is a fixed set; this maps document keywords onto
 * the closest sector and reports a low confidence so the user confirms it.
 *
 * @param {string} text
 * @param {string[]} sectorOptions
 * @returns {{value: string, confidence: number}|null}
 */
const findSectorTag = (text, sectorOptions) => {
  const lower = text.toLowerCase();

  const keywordMap = [
    { sector: 'Health', words: ['health', 'sanitary', 'hospital', 'clinic', 'medical', 'healthcare'] },
    { sector: 'Education', words: ['education', 'school', 'teacher', 'student', 'learning'] },
    { sector: 'Environment', words: ['environment', 'waste', 'littering', 'tree', 'forest', 'sanitation', 'garbage'] },
    { sector: 'Infrastructure', words: ['road', 'bridge', 'construction', 'infrastructure', 'street', 'flood', 'drainage'] },
    { sector: 'Peace and Order', words: ['peace', 'order', 'crime', 'police', 'security', 'traffic', 'violation'] },
    { sector: 'Agriculture', words: ['agricultur', 'farm', 'farmer', 'crop', 'fisheries', 'livestock', 'rice'] },
    { sector: 'Business', words: ['business', 'commercial', 'market', 'vendor', 'establishment', 'enterprise'] },
    { sector: 'Tourism', words: ['tourism', 'tourist', 'ecotourism', 'attraction'] },
    { sector: 'Housing', words: ['housing', 'shelter', 'resettlement', 'settlement', 'homeless'] },
    { sector: 'Revenue', words: ['revenue', 'tax', 'business permit', 'license fee', 'collection'] },
  ];

  let best = null;
  for (const { sector, words } of keywordMap) {
    if (!sectorOptions.includes(sector)) continue;
    const hits = words.filter((word) => lower.includes(word)).length;
    if (hits > 0 && (!best || hits > best.hits)) {
      best = { sector, hits };
    }
  }

  if (!best) return null;
  return {
    value: best.sector,
    confidence: Math.min(0.5, 0.25 + best.hits * 0.1),
  };
};

/**
 * Builds the full set of field candidates for an extracted document.
 *
 * @param {string} text - Raw text extracted from the document
 * @param {string[]} [sectorOptions] - The sector list the form offers
 * @returns {object} Map of form field name to `{ value, confidence }` or null
 */
const extractFieldCandidates = (text, sectorOptions = []) => {
  const lines = toLines(text);
  const flat = unwrapLines(lines);

  const number = findNumber(flat);
  const documentType = findDocumentType(flat, lines);

  return {
    type: documentType,
    number,
    seriesYear: findSeriesYear(number),
    title: findTitle(flat, lines),
    proponent: findProponent(flat),
    explanatoryNote: findExplanatoryNote(text),
    enactingClause: findEnactingClause(flat),
    provisions: findProvisions(text),
    penaltyClause: findPenaltyClause(text),
    sectorTag: sectorOptions.length ? findSectorTag(flat, sectorOptions) : null,
  };
};

/**
 * Produces the final extraction payload for the API.
 *
 * @param {string} text - Raw extracted text
 * @param {string} sourceType - 'pdf' | 'docx'
 * @param {object} [options]
 * @param {string[]} [options.sectorOptions] - Sector list for tag guessing
 * @param {number} [options.pageCount]
 * @returns {object} Extraction payload ready to send to the client
 */
const buildExtractionPayload = (text, sourceType, options = {}) => {
  const { sectorOptions = [], pageCount = null } = options;

  const rawText = String(text || '');
  const candidates = extractFieldCandidates(rawText, sectorOptions);

  const filled = Object.values(candidates).filter(Boolean);
  const confidence = filled.length
    ? filled.reduce((total, candidate) => total + candidate.confidence, 0) / filled.length
    : 0;

  return {
    sourceType,
    text: rawText,
    textPreview: rawText.slice(0, 600),
    characterCount: rawText.length,
    pageCount,
    candidates,
    overallConfidence: Number(confidence.toFixed(2)),
    // The full text is returned for the review panel, but the client only
    // needs a slice to render; the remainder stays server-side by default.
    isUsable: rawText.trim().length >= MIN_USABLE_TEXT_LENGTH,
  };
};

module.exports = {
  MIN_USABLE_TEXT_LENGTH,
  CONFIDENCE,
  toLines,
  unwrapLines,
  normaliseDocumentType,
  findNumber,
  findTitle,
  findDocumentType,
  findSeriesYear,
  findExplanatoryNote,
  findProvisions,
  findEnactingClause,
  findPenaltyClause,
  findProponent,
  findSectorTag,
  extractFieldCandidates,
  buildExtractionPayload,
};
