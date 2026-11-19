import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  createOrdinanceSchema,
  updateOrdinanceStatusSchema,
  createTermSchema,
  createAnnouncementSchema,
  createSbMemberSchema,
  createUserSchema,
} from '../src/index';

describe('loginSchema', () => {
  it('accepts a valid email/password pair', () => {
    const parsed = loginSchema.parse({ email: 'admin@ibosys.gov.ph', password: 'secret123' });
    expect(parsed.email).toBe('admin@ibosys.gov.ph');
    expect(parsed.password).toBe('secret123');
  });

  it('rejects a malformed email', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'secret123' }).success).toBe(false);
  });

  it('rejects an empty password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false);
  });
});

describe('createOrdinanceSchema', () => {
  const valid = {
    title: 'Ordinance on Waste Segregation',
    type: 'Ordinance' as const,
    number: '2025-001',
    proponentId: 'u1',
    committee: 'Committee on Health',
    explanatoryNote: 'note',
    provisions: 'provisions',
  };

  it('accepts a minimal valid ordinance', () => {
    expect(createOrdinanceSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an unknown type', () => {
    expect(createOrdinanceSchema.safeParse({ ...valid, type: 'Bill' }).success).toBe(false);
  });

  it('requires title and provisions', () => {
    const { title, provisions, ...rest } = valid;
    void title;
    void provisions;
    expect(createOrdinanceSchema.safeParse(rest).success).toBe(false);
  });

  it('accepts optional section list', () => {
    const parsed = createOrdinanceSchema.parse({
      ...valid,
      sections: [{ title: 'Section 1', content: 'body' }],
    });
    expect(parsed.sections).toHaveLength(1);
  });
});

describe('updateOrdinanceStatusSchema', () => {
  it('accepts every documented status', () => {
    const statuses = [
      'First Reading',
      'Committee Assignment',
      'Committee Hearing',
      'Public Consultation',
      'Second Reading',
      'Third Reading',
      "For Mayor's Signature",
      'For SP Review',
      'Approved',
    ];
    for (const status of statuses) {
      expect(updateOrdinanceStatusSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it("rejects an invented status such as 'Vetoed'", () => {
    expect(updateOrdinanceStatusSchema.safeParse({ status: 'Vetoed' }).success).toBe(false);
  });
});

describe('createTermSchema', () => {
  it('accepts an in-range year pair', () => {
    expect(createTermSchema.safeParse({ label: '2025-2029', startYear: 2025, endYear: 2029 }).success).toBe(true);
  });

  it('rejects out-of-range years', () => {
    expect(createTermSchema.safeParse({ label: 'x', startYear: 1999, endYear: 2029 }).success).toBe(false);
    expect(createTermSchema.safeParse({ label: 'x', startYear: 2025, endYear: 2101 }).success).toBe(false);
  });

  it('rejects non-integer years', () => {
    expect(createTermSchema.safeParse({ label: 'x', startYear: 2025.5, endYear: 2029 }).success).toBe(false);
  });
});

describe('createUserSchema', () => {
  const valid = {
    name: 'Juan Dela Cruz',
    email: 'juan@ibosys.gov.ph',
    password: 'longenough',
    role: 'Secretary' as const,
    contactNumber: '09171234567',
  };

  it('accepts a valid user', () => {
    expect(createUserSchema.safeParse(valid).success).toBe(true);
  });

  it('enforces the 8 character minimum password', () => {
    expect(createUserSchema.safeParse({ ...valid, password: 'short' }).success).toBe(false);
  });

  it('rejects an unknown role', () => {
    expect(createUserSchema.safeParse({ ...valid, role: 'Mayor' }).success).toBe(false);
  });
});

describe('createAnnouncementSchema', () => {
  it('requires both title and content', () => {
    expect(createAnnouncementSchema.safeParse({ title: 'a', content: 'b' }).success).toBe(true);
    expect(createAnnouncementSchema.safeParse({ title: 'a' }).success).toBe(false);
  });
});

describe('createSbMemberSchema', () => {
  it('accepts a member with a valid email', () => {
    expect(
      createSbMemberSchema.safeParse({
        firstName: 'Maria',
        lastName: 'Santos',
        position: 'Councilor',
        contactEmail: 'maria@ibosys.gov.ph',
      }).success,
    ).toBe(true);
  });

  it('rejects a malformed optional email', () => {
    expect(
      createSbMemberSchema.safeParse({
        firstName: 'Maria',
        lastName: 'Santos',
        position: 'Councilor',
        contactEmail: 'nope',
      }).success,
    ).toBe(false);
  });

  it('allows contactEmail to be omitted', () => {
    expect(
      createSbMemberSchema.safeParse({ firstName: 'Maria', lastName: 'Santos', position: 'Councilor' }).success,
    ).toBe(true);
  });
});
