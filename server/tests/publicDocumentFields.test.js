import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Ordinance = require('../models/Ordinance.js');
const { PUBLIC_DOCUMENT_LIST_FIELDS } = require('../controllers/publicController.js');

describe('public document field contract', () => {
  it('projects the filing date and public fields used by the archives', () => {
    const fields = PUBLIC_DOCUMENT_LIST_FIELDS.split(/\s+/);

    expect(fields).toEqual(expect.arrayContaining([
      'number',
      'title',
      'type',
      'status',
      'sectorTag',
      'createdAt',
      'filedAt',
      'plainLanguageSummary',
      'plainLanguageSummary_tl',
      'proponentId',
      'coAuthors',
      'pdfUrl',
      'amendsOrdinanceId',
      'amendedByOrdinanceId',
    ]));
  });

  it('limits public document consumers to fields defined by the ordinance model', () => {
    const persistedFields = [
      'sectorTag',
      'createdAt',
      'filedAt',
      'effectivityDate',
      'plainLanguageSummary',
      'plainLanguageSummary_tl',
      'amendsOrdinanceId',
      'amendedByOrdinanceId',
    ];

    for (const field of persistedFields) {
      expect(Ordinance.schema.path(field), `${field} should be a persisted ordinance field`).toBeDefined();
    }

    for (const unsupportedField of ['datePassed', 'description', 'tags', 'relatedDocs']) {
      expect(Ordinance.schema.path(unsupportedField), `${unsupportedField} is not part of the public document contract`).toBeUndefined();
    }
  });
});
