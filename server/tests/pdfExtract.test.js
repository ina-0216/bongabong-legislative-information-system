/**
 * Tests for PDF/DOCX text extraction and legislative field mapping.
 *
 * Verifies that:
 * - Unsupported file types return an appropriate error
 * - Field candidates are extracted from the fixed legislative layout
 * - Confidence is reported per candidate, and empty text yields no candidates
 */

import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { Document, Packer, Paragraph } from 'docx';
import PDFDocument from 'pdfkit';
import { extractText, extractDocxText } from '../utils/pdfTextExtractor';
import {
  buildExtractionPayload,
  extractFieldCandidates,
  findNumber,
  findProponent,
  findSectorTag,
  normaliseDocumentType,
} from '../services/documentExtractionService';

const SAMPLE_ORDINANCE = [
  'AN ORDINANCE NO. 2026-001',
  'Proposing to Establish a Public Consultation Mechanism',
  'for the Sanggunian Bayan of Bongabong, Oriental Mindoro',
  '',
  'EXPLANATORY NOTE',
  'The Sangguniang Bayan recognizes the need to strengthen public participation',
  'in local governance and to provide a clear mechanism for residents to',
  'submit their views on proposed municipal ordinances.',
  '',
  'BE IT ORDAINED BY THE SANGGUNIANG BAYAN IN SESSION ASSEMBLED:',
  '',
  'Section 1. Scope. This ordinance applies to all proposed ordinances and',
  'resolutions filed with the Sangguniang Bayan of Bongabong.',
  '',
  'Section 2. Public Consultation Period. The public consultation period shall',
  'last fifteen (15) calendar days from the date of publication.',
  '',
  'PENALTY CLAUSE: Any person who obstructs the conduct of the public',
  'consultation shall be fined an amount not less than one thousand pesos',
  'and not more than five thousand pesos.',
].join('\n');

const SAMPLE_RESOLUTION = [
  'RESOLUTION NO. RES-2026-014',
  'A RESOLUTION EXPRESSING GRATITUDE TO THE HONORABLE MEMBERS OF THE',
  'SANGGUNIANG BAYAN OF BONGABONG FOR THE COMPLETION OF THE PUBLIC',
  'INFRASTRUCTURE PROJECT IN BARANGAY POBLACION',
  '',
  'WHEREAS, the Sangguniang Bayan recognizes the importance of timely and',
  'adequate infrastructure in serving the constituents of Bongabong;',
  '',
  'WHEREAS, the completed project brought significant benefit to the residents',
  'of Barangay Poblacion and the surrounding barangays;',
  '',
  'NOW, THEREFORE, on motion of Hon. Juan Dela Cruz, seconded by the body,',
  'BE IT RESOLVED, as it is hereby resolved by the Sangguniang Bayan of Bongabong',
  'in session assembled:',
  '',
  'Section 1. This resolution duly expresses the gratitude of the Sangguniang',
  'Bayan to all parties who contributed to the completion of the project.',
].join('\n');

const createPdfBuffer = (text) => new Promise((resolve, reject) => {
  const document = new PDFDocument();
  const chunks = [];

  document.on('data', (chunk) => chunks.push(chunk));
  document.on('end', () => resolve(Buffer.concat(chunks)));
  document.on('error', reject);
  document.text(text);
  document.end();
});

describe('pdfTextExtractor', () => {
  describe('extractText', () => {
    it('extracts text and page count from a PDF buffer', async () => {
      const expectedText = 'AN ORDINANCE NO. 2026-001 establishing a public consultation process.';
      const buffer = await createPdfBuffer(expectedText);

      await expect(extractText(buffer, 'application/pdf')).resolves.toMatchObject({
        text: expect.stringContaining('AN ORDINANCE NO. 2026-001'),
        sourceType: 'pdf',
        numPages: 1,
        info: expect.any(Object),
      });
    });

    it('extracts text from a temporary PDF file path', async () => {
      const directory = await mkdtemp(resolve(tmpdir(), 'ibosys-pdf-extraction-'));
      const filePath = resolve(directory, 'ordinance.pdf');
      try {
        await writeFile(filePath, await createPdfBuffer('AN ORDINANCE NO. 2026-002 read from a temporary file.'));
        await expect(extractText(filePath, 'application/pdf')).resolves.toMatchObject({
          text: expect.stringContaining('AN ORDINANCE NO. 2026-002'),
          numPages: 1,
        });
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    });

    it('rejects unsupported file types', async () => {
      const buffer = Buffer.from('test content');
      await expect(extractText(buffer, 'image/png')).rejects.toThrow(
        /Unsupported file type/
      );
    });

    it('rejects a missing mimetype', async () => {
      const buffer = Buffer.from('test content');
      await expect(extractText(buffer, null)).rejects.toThrow(
        /Unsupported file type/
      );
    });
  });

  describe('extractDocxText', () => {
    it('extracts text from a valid DOCX document', async () => {
      const document = new Document({
        sections: [{ children: [new Paragraph('Argparse compatibility check')] }],
      });
      const buffer = await Packer.toBuffer(document);

      await expect(extractDocxText(buffer)).resolves.toMatchObject({
        text: expect.stringMatching(/^Argparse compatibility check/),
      });
    });

    it('rejects a buffer that is not a valid DOCX', async () => {
      await expect(extractDocxText(Buffer.alloc(0))).rejects.toThrow();
    });
  });

  it('keeps the Mammoth CLI compatible with argparse 3', () => {
    const testDirectory = dirname(fileURLToPath(import.meta.url));
    const mammothCli = resolve(testDirectory, '../node_modules/mammoth/bin/mammoth');
    const help = execFileSync(process.execPath, [mammothCli, '--help'], {
      encoding: 'utf8',
    });

    expect(help).toContain('--output-format');
    expect(help).toContain('--output-dir');
  });
});

describe('documentExtractionService', () => {
  describe('normaliseDocumentType', () => {
    it('recognises an ordinance heading', () => {
      expect(normaliseDocumentType('AN ORDINANCE NO. 2026-001')).toBe('Ordinance');
    });

    it('recognises a resolution heading', () => {
      expect(normaliseDocumentType('A RESOLUTION NO. 1')).toBe('Resolution');
    });

    it('returns null for an unrelated heading', () => {
      expect(normaliseDocumentType('A MEMORANDUM')).toBeNull();
    });
  });

  describe('findNumber', () => {
    it('extracts the YYYY-NNN ordinance number', () => {
      expect(findNumber('AN ORDINANCE NO. 2026-001').value).toBe('2026-001');
    });

    it('extracts the RES-YYYY-NNN resolution number', () => {
      expect(findNumber('RESOLUTION NO. RES-2026-014').value).toBe('RES-2026-014');
    });

    it('returns null when the document carries no number', () => {
      expect(findNumber('A RESOLUTION EXPRESSING GRATITUDE')).toBeNull();
    });
  });

  describe('findProponent', () => {
    it('extracts the author attribution', () => {
      const candidate = findProponent(
        'Authored by: Hon. Maria Santos\nCity Municipal Government of Bongabong'
      );
      expect(candidate).not.toBeNull();
      expect(candidate.value).toMatch(/Maria Santos/);
    });

    it('returns null when no attribution is present', () => {
      expect(findProponent('Section 1. Scope. This ordinance applies.')).toBeNull();
    });
  });

  describe('findSectorTag', () => {
    it('maps an environment keyword onto the matching sector', () => {
      const candidate = findSectorTag(
        'This ordinance regulates waste disposal and littering in the barangay.',
        ['General', 'Environment', 'Health']
      );
      expect(candidate.value).toBe('Environment');
    });

    it('returns null when the sector list does not contain a match', () => {
      expect(
        findSectorTag('This ordinance regulates waste disposal.', ['General'])
      ).toBeNull();
    });
  });

  describe('extractFieldCandidates', () => {
    it('extracts the ordinance number, type and title', () => {
      const candidates = extractFieldCandidates(SAMPLE_ORDINANCE);
      expect(candidates.number.value).toBe('2026-001');
      expect(candidates.type.value).toBe('Ordinance');
      expect(candidates.title.value).toMatch(/PUBLIC CONSULTATION/i);
      expect(candidates.seriesYear.value).toBe(2026);
    });

    it('extracts the explanatory note and provisions from an ordinance', () => {
      const candidates = extractFieldCandidates(SAMPLE_ORDINANCE);
      expect(candidates.explanatoryNote.value).toMatch(/public participation/);
      expect(candidates.provisions.value).toMatch(/BE IT ORDAINED/);
      expect(candidates.penaltyClause.value).toMatch(/five thousand pesos/);
    });

    it('extracts the resolution number and WHEREAS recitals', () => {
      const candidates = extractFieldCandidates(SAMPLE_RESOLUTION);
      expect(candidates.number.value).toBe('RES-2026-014');
      expect(candidates.type.value).toBe('Resolution');
      expect(candidates.explanatoryNote.value).toMatch(/WHEREAS/);
      expect(candidates.explanatoryNote.value).not.toMatch(/NOW, THEREFORE/);
    });

    it('reports no candidates for text with no legislative structure', () => {
      const candidates = extractFieldCandidates(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
      );
      expect(candidates.number).toBeNull();
      expect(candidates.title).toBeNull();
      expect(candidates.explanatoryNote).toBeNull();
    });
  });

  describe('buildExtractionPayload', () => {
    it('reports the source type, size and an overall confidence', () => {
      const payload = buildExtractionPayload(SAMPLE_ORDINANCE, 'pdf', {
        pageCount: 3,
      });
      expect(payload.sourceType).toBe('pdf');
      expect(payload.pageCount).toBe(3);
      expect(payload.characterCount).toBe(SAMPLE_ORDINANCE.length);
      expect(payload.isUsable).toBe(true);
    });

    it('marks a short document as not usable', () => {
      const payload = buildExtractionPayload('too short', 'pdf');
      expect(payload.isUsable).toBe(false);
      expect(payload.overallConfidence).toBe(0);
    });
  });
});
