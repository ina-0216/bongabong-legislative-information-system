import { describe, expect, it } from 'vitest';

import {
  documentQueryParams,
  documentStatusesForType,
  guestFeedbackFields,
  groupLatest,
  hasNextPage,
  initials,
  isPublicDocumentType,
  memberName,
  statusTone,
  validateFeedback,
} from './selectors';
import type { PublicDocument } from './api';

const doc = (type: string, id: string): PublicDocument =>
  ({ _id: id, type, number: `2026-${id}`, title: `Title ${id}`, status: 'Approved' }) as PublicDocument;

describe('groupLatest', () => {
  it('splits the flat /public/latest array into the two home sections', () => {
    const { ordinances, resolutions } = groupLatest([
      doc('Ordinance', '01'),
      doc('Resolution', '02'),
      doc('Ordinance', '03'),
    ]);

    expect(ordinances.map((d) => d._id)).toEqual(['01', '03']);
    expect(resolutions.map((d) => d._id)).toEqual(['02']);
  });

  it('caps each section at the requested limit', () => {
    const latest = [
      doc('Ordinance', '01'),
      doc('Ordinance', '02'),
      doc('Ordinance', '03'),
      doc('Resolution', '04'),
      doc('Resolution', '05'),
    ];

    // 3 ordinances exist and 2 resolutions do, so the default cap of 3 only
    // truncates the ordinances.
    expect(groupLatest(latest).ordinances).toHaveLength(3);
    expect(groupLatest(latest).resolutions).toHaveLength(2);
    expect(groupLatest(latest, 1).ordinances).toHaveLength(1);
    expect(groupLatest(latest, 1).resolutions).toHaveLength(1);
  });

  it('ignores records whose type is neither ordinance nor resolution', () => {
    const { ordinances, resolutions } = groupLatest([doc('Executive Order', '09')]);
    expect(ordinances).toHaveLength(0);
    expect(resolutions).toHaveLength(0);
  });

  it('tolerates an empty or missing list', () => {
    expect(groupLatest([])).toEqual({ ordinances: [], resolutions: [] });
    expect(groupLatest()).toEqual({ ordinances: [], resolutions: [] });
  });
});

describe('isPublicDocumentType', () => {
  it('accepts only the two public legislative types', () => {
    expect(isPublicDocumentType('Ordinance')).toBe(true);
    expect(isPublicDocumentType('Resolution')).toBe(true);
    expect(isPublicDocumentType('Executive Order')).toBe(false);
    expect(isPublicDocumentType(undefined)).toBe(false);
  });
});

describe('documentQueryParams', () => {
  it('omits blank search and the "All" filter instead of sending them', () => {
    expect(documentQueryParams('', 'All', 1, 20)).toEqual({ page: 1, limit: 20 });
    expect(documentQueryParams('   ', 'All', 2, 20)).toEqual({ page: 2, limit: 20 });
  });

  it('includes a trimmed search term', () => {
    expect(documentQueryParams('  waste  ', 'All', 1, 20)).toEqual({
      page: 1,
      limit: 20,
      search: 'waste',
    });
  });

  it('includes the type only when it is not "All"', () => {
    expect(documentQueryParams('', 'Ordinance', 1, 20)).toEqual({
      page: 1,
      limit: 20,
      type: 'Ordinance',
    });
    expect(documentQueryParams('waste', 'Resolution', 3, 10)).toEqual({
      page: 3,
      limit: 10,
      search: 'waste',
      type: 'Resolution',
    });
  });

  it('includes the selected status only when it is not "All"', () => {
    expect(documentQueryParams('', 'All', 1, 20, 'Public Consultation')).toEqual({
      page: 1,
      limit: 20,
      status: 'Public Consultation',
    });
    expect(documentQueryParams('', 'All', 1, 20, 'Approved')).toEqual({
      page: 1,
      limit: 20,
      status: 'Approved',
    });
    expect(documentQueryParams('', 'All', 1, 20, 'All')).toEqual({ page: 1, limit: 20 });
  });

  it('includes selected term, year, and committee filters', () => {
    expect(documentQueryParams('', 'Ordinance', 2, 20, 'Committee Hearing', {
      termId: 'term-1', year: '2026', committee: 'Committee on Health',
    })).toEqual({
      page: 2,
      limit: 20,
      type: 'Ordinance',
      status: 'Committee Hearing',
      termId: 'term-1',
      year: '2026',
      committee: 'Committee on Health',
    });
    expect(documentQueryParams('', 'All', 1, 20, 'All', { termId: '', year: '', committee: '' }))
      .toEqual({ page: 1, limit: 20 });
  });

  it('shows only status stages that apply to the selected document type', () => {
    expect(documentStatusesForType('Ordinance')).toContain('Committee Hearing');
    expect(documentStatusesForType('Ordinance')).toContain('Public Consultation');
    expect(documentStatusesForType('Resolution')).not.toContain('Committee Hearing');
    expect(documentStatusesForType('Resolution')).not.toContain('Public Consultation');
    expect(documentStatusesForType('Resolution')).toContain('Approved');
  });
});

describe('hasNextPage', () => {
  it('reports another page only when the current page is behind the last one', () => {
    expect(hasNextPage(1, 3)).toBe(true);
    expect(hasNextPage(3, 3)).toBe(false);
    expect(hasNextPage(1, 1)).toBe(false);
  });

  it('does not loop forever when the server reports zero pages', () => {
    expect(hasNextPage(1, 0)).toBe(false);
    expect(hasNextPage(1, Number.NaN)).toBe(false);
  });
});

describe('statusTone', () => {
  it('is case insensitive and maps each status family to a distinct tone', () => {
    expect(statusTone('APPROVED')).toEqual({ bg: '#d1fae5', fg: '#065f46' });
    expect(statusTone('Under Consultation')).toEqual({ bg: '#fef3c7', fg: '#92400e' });
    expect(statusTone('Pending')).toEqual({ bg: '#fef3c7', fg: '#92400e' });
    expect(statusTone('Rejected')).toEqual({ bg: '#fee2e2', fg: '#991b1b' });
    expect(statusTone('First Reading')).toEqual({ bg: '#dbeafe', fg: '#1e40af' });
  });

  it('falls back to a neutral tone for unknown or missing status', () => {
    expect(statusTone('Archived')).toEqual({ bg: '#f3f4f6', fg: '#4b5563' });
    expect(statusTone(undefined)).toEqual({ bg: '#f3f4f6', fg: '#4b5563' });
    expect(statusTone('')).toEqual({ bg: '#f3f4f6', fg: '#4b5563' });
  });
});

describe('memberName', () => {
  it('prefers the denormalised name when present', () => {
    expect(memberName({ name: 'Juan Dela Cruz', firstName: 'Other' })).toBe('Juan Dela Cruz');
  });

  it('falls back to the split name fields, skipping gaps', () => {
    expect(memberName({ firstName: 'Juan', middleName: 'R', lastName: 'Dela Cruz' })).toBe(
      'Juan R Dela Cruz',
    );
    expect(memberName({ firstName: 'Juan', lastName: 'Cruz' })).toBe('Juan Cruz');
  });

  it('uses a placeholder when nothing is available', () => {
    expect(memberName({})).toBe('SB Member');
  });
});

describe('initials', () => {
  it('uses the last two words of the name', () => {
    expect(initials('Juan Dela Cruz')).toBe('DC');
    expect(initials('Maria Santos')).toBe('MS');
  });

  it('returns an empty string for a blank name', () => {
    expect(initials('   ')).toBe('');
  });
});

describe('validateFeedback', () => {
  const valid = {
    ordinanceId: '66f1c2a4b5c6d7e8f9012345',
    documentType: 'Ordinance',
    ordinanceStatus: 'Public Consultation',
    verificationMethod: 'email' as const,
    otpSent: false,
    hasPrivacyConsent: true,
    draft: {
      full_name: 'Juan Dela Cruz',
      barangay: 'Poblacion',
      contact_number: '09171234567',
      email: 'resident@example.com',
      otp: '',
      comment: 'Support this ordinance.',
    },
    emailVerificationToken: 'v'.repeat(43),
    hasIdImage: true,
  };

  it('accepts a complete submission', () => {
    expect(validateFeedback(valid)).toBeNull();
  });

  it('rejects a missing ordinance id', () => {
    expect(validateFeedback({ ...valid, ordinanceId: '  ' })).toMatch(/ordinance ID/i);
  });

  it('rejects a malformed ordinance id before making a request', () => {
    expect(validateFeedback({ ...valid, ordinanceId: 'not-an-id' })).toMatch(/24-character/i);
  });

  it('rejects a missing valid ID image', () => {
    expect(validateFeedback({ ...valid, hasIdImage: false })).toMatch(/valid ID image/i);
  });

  it('requires an ordinance to be checked before submission', () => {
    expect(validateFeedback({ ...valid, documentType: null })).toMatch(/check an ordinance/i);
    expect(validateFeedback({ ...valid, documentType: 'Resolution' })).toMatch(/check an ordinance/i);
  });

  it('requires a valid Philippine mobile number and email address', () => {
    expect(validateFeedback({
      ...valid,
      draft: { ...valid.draft, contact_number: '0912345' },
    })).toMatch(/11-digit mobile number/i);
    expect(validateFeedback({
      ...valid,
      draft: { ...valid.draft, email: 'not-an-email' },
    })).toMatch(/valid email address/i);
    expect(validateFeedback({
      ...valid,
      emailVerificationToken: '',
    })).toMatch(/verify your email/i);
  });

  it('accepts an SMS-only submission when a requested six-digit OTP is provided', () => {
    expect(validateFeedback({
      ...valid,
      verificationMethod: 'sms',
      otpSent: true,
      emailVerificationToken: '',
      draft: { ...valid.draft, email: '', otp: '482913' },
    })).toBeNull();
    expect(validateFeedback({
      ...valid,
      verificationMethod: 'sms',
      otpSent: false,
      emailVerificationToken: '',
      draft: { ...valid.draft, email: '', otp: '482913' },
    })).toMatch(/OTP/i);
    expect(validateFeedback({
      ...valid,
      verificationMethod: 'sms',
      otpSent: true,
      emailVerificationToken: '',
      draft: { ...valid.draft, email: '', otp: '123' },
    })).toMatch(/OTP/i);
  });

  it('applies the portal name, email, and comment length limits', () => {
    expect(validateFeedback({
      ...valid,
      draft: { ...valid.draft, full_name: 'n'.repeat(101) },
    })).toMatch(/100 characters or fewer/i);
    expect(validateFeedback({
      ...valid,
      draft: { ...valid.draft, email: `a${'x'.repeat(250)}@example.com` },
    })).toMatch(/254 characters or fewer/i);
    expect(validateFeedback({
      ...valid,
      draft: { ...valid.draft, comment: 'x'.repeat(1001) },
    })).toMatch(/1000 characters or fewer/i);
  });

  it('allows a vote without a comment during Public Consultation', () => {
    expect(validateFeedback({
      ...valid,
      draft: { ...valid.draft, comment: '' },
    })).toBeNull();
  });

  it('requires a 5-character comment outside Public Consultation', () => {
    expect(validateFeedback({
      ...valid,
      ordinanceStatus: 'Second Reading',
      draft: { ...valid.draft, comment: 'ok' },
    })).toMatch(/at least 5 characters/i);
  });

  it('requires data privacy consent', () => {
    expect(validateFeedback({ ...valid, hasPrivacyConsent: false })).toMatch(/Data Privacy/i);
  });

  it('builds request fields with the required consent and stage-specific vote', () => {
    expect(guestFeedbackFields(valid.draft, 'Agree', 'Public Consultation', true, 'email', valid.emailVerificationToken)).toMatchObject({
      vote: 'Agree',
      data_privacy_consent: 'true',
      email: 'resident@example.com',
      emailVerificationToken: valid.emailVerificationToken,
    });
    expect(guestFeedbackFields(valid.draft, 'Agree', 'Second Reading', true, 'email', valid.emailVerificationToken)).toMatchObject({
      vote: 'None',
      data_privacy_consent: 'true',
    });
    expect(guestFeedbackFields(valid.draft, 'Agree', 'Public Consultation', true, 'email', valid.emailVerificationToken)).not.toHaveProperty('otp');
    expect(guestFeedbackFields(
      { ...valid.draft, otp: '123456' },
      'Agree',
      'Public Consultation',
      true,
      'sms',
      valid.emailVerificationToken,
    )).toMatchObject({ otp: '123456' });
    const smsFields = guestFeedbackFields(
      { ...valid.draft, email: '', otp: '482913' },
      'Agree',
      'Public Consultation',
      true,
      'sms',
      '',
    );
    expect(smsFields).toMatchObject({ otp: '482913' });
    expect(smsFields).not.toHaveProperty('email');
    expect(smsFields).not.toHaveProperty('emailVerificationToken');
  });

  it.each([
    ['full_name', /Full name/i],
    ['barangay', /Barangay/i],
    ['contact_number', /Contact number/i],
    ['email', /valid email address/i],
  ] as const)('rejects a blank %s', (field, message) => {
    const draft = { ...valid.draft, [field]: '   ' };
    expect(validateFeedback({ ...valid, draft })).toMatch(message);
  });

  it('rejects a blank comment outside Public Consultation', () => {
    const draft = { ...valid.draft, comment: '   ' };
    expect(validateFeedback({ ...valid, ordinanceStatus: 'Second Reading', draft })).toMatch(/Comment/i);
  });

  it('rejects a barangay that is not one of the public portal choices', () => {
    expect(
      validateFeedback({
        ...valid,
        draft: { ...valid.draft, barangay: 'Not a Bongabong barangay' },
      }),
    ).toMatch(/select a barangay/i);
  });

  it('reports the ordinance id before any other missing field', () => {
    expect(
      validateFeedback({
        ordinanceId: '',
        verificationMethod: 'email',
        otpSent: false,
          documentType: 'Ordinance',
          ordinanceStatus: 'Public Consultation',
          hasPrivacyConsent: true,
        draft: {
          full_name: '',
          barangay: '',
          contact_number: '',
          email: '',
          otp: '',
          comment: '',
        },
        emailVerificationToken: '',
        hasIdImage: false,
      }),
    ).toMatch(/ordinance ID/i);
  });
});
