import { describe, it, expect } from 'vitest';

import { createOrdinanceSchema, updateOrdinanceStatusSchema, updateOrdinanceSchema, assignCommitteeSchema, amendOrdinanceSchema, committeeReportSchema } from '../validations/ordinanceValidation.js';
import { getUsersSchema, createUserSchema, updateStatusSchema, changePasswordSchema, updateProfileSchema } from '../validations/userValidation.js';
import { createTermSchema, updateTermSchema, termIdParamsSchema } from '../validations/termValidation.js';
import { createSessionSchema, updateSessionSchema, sessionIdParamsSchema } from '../validations/sessionValidation.js';
import { createSbMemberSchema, updateSbMemberSchema, sbMemberIdParamsSchema } from '../validations/sbMemberValidation.js';
import { updateCommitteeSchema } from '../validations/committeeValidation.js';
import { createAnnouncementSchema, updateAnnouncementSchema, announcementIdParamsSchema } from '../validations/announcementValidation.js';
import { verifyFeedbackSchema, getFeedbackSchema } from '../validations/consultationValidation.js';

import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../validations/authValidation.js';
import {
  getDocumentsSchema,
  guestConsultSchema,
  sendOtpSchema,
  sendEmailVerificationSchema,
  verifyEmailCodeSchema,
  termFilterSchema,
  publicFeedbackIdSchema,
} from '../validations/publicValidation.js';

const validId = '507f1f77bcf86cd799439011';

describe('Zod Validation Schemas', () => {
  describe('ordinanceValidation', () => {
    it('createOrdinanceSchema accepts valid data', async () => {
      const data = {
        body: {
          type: 'Ordinance', number: '2026-001', title: 'Test Ordinance',
          title_tl: 'Ordinansa', proponentId: validId,
          sectorTag: 'Environment', explanatoryNote: 'Note', definitionsOfTerms: '<p>Municipal waters means local waters.</p>', enactingClause: 'Clause',
          provisions: 'Prov', penaltyClause: 'Penalty', effectivityDate: '2026-06-01',
          plainLanguageSummary: 'Summary', plainLanguageSummary_tl: 'Buod', termId: validId,
        },
      };
      await expect(createOrdinanceSchema.parseAsync(data)).resolves.toEqual(data);
    });

    it('createOrdinanceSchema rejects committee selection outside Committee Assignment', async () => {
      await expect(createOrdinanceSchema.parseAsync({
        body: {
          type: 'Ordinance', number: '2026-001', title: 'Test Ordinance', proponentId: validId,
          isDraft: true, committee: 'Environment',
        },
      })).rejects.toThrow(/committee/i);
    });

    it('createOrdinanceSchema requires explanatory note and provisions when filing', async () => {
      await expect(createOrdinanceSchema.parseAsync({
        body: { type: 'Resolution', number: 'RES-2026-001', title: 'Test', proponentId: validId, isDraft: false },
      })).rejects.toThrow(/required to file/i);
    });

    it('createOrdinanceSchema rejects missing required fields', async () => {
      await expect(createOrdinanceSchema.parseAsync({ body: {} })).rejects.toThrow();
    });

    it('createOrdinanceSchema rejects invalid proponentId', async () => {
      await expect(createOrdinanceSchema.parseAsync({
        body: { number: '2026-001', title: 'Test', proponentId: 'invalid' }
      })).rejects.toThrow();
    });

    it('updateOrdinanceStatusSchema accepts valid data', async () => {
      const data = { params: { id: validId }, body: { status: 'Committee Hearing' } };
      await expect(updateOrdinanceStatusSchema.parseAsync(data)).resolves.toEqual(data);
    });

    it('updateOrdinanceStatusSchema rejects invalid id', async () => {
      await expect(updateOrdinanceStatusSchema.parseAsync({
        params: { id: 'invalid' }, body: { status: 'Approved' }
      })).rejects.toThrow();
    });

    it('updateOrdinanceSchema accepts partial data', async () => {
      const data = { params: { id: validId }, body: { title: 'Updated', definitionsOfTerms: '<p>Defined term.</p>' } };
      await expect(updateOrdinanceSchema.parseAsync(data)).resolves.toEqual(data);
    });

    it('amendOrdinanceSchema rejects invalid newOrdinanceId', async () => {
      await expect(amendOrdinanceSchema.parseAsync({
        params: { id: validId }, body: { newOrdinanceId: 'bad' }
      })).rejects.toThrow();
    });

    it('assignCommitteeSchema accepts valid committee assignment', async () => {
      const data = {
        params: { id: validId },
        body: { committee: 'Committee on Appropriation, Infrastructure and Power and Energy', notes: 'Referred for hearing' }
      };
      await expect(assignCommitteeSchema.parseAsync(data)).resolves.toEqual(data);
    });

    it('assignCommitteeSchema rejects empty committee name', async () => {
      await expect(assignCommitteeSchema.parseAsync({
        params: { id: validId },
        body: { committee: '' }
      })).rejects.toThrow();
    });

    it('createOrdinanceSchema accepts resolution with draft and deliberation metadata', async () => {
      const data = {
        body: {
          type: 'Resolution',
          number: 'RES-2026-001',
          title: 'Resolution of Commendation',
          proponentId: validId,
          isDraft: true,
          seriesYear: 2026,
          motionBy: validId,
          secondedBy: [validId],
          explanatoryNote: 'WHEREAS, the exemplary service...',
          provisions: 'RESOLVED, to commend...',
        }
      };
      const parsed = await createOrdinanceSchema.parseAsync(data);
      expect(parsed.body.type).toBe('Resolution');
      expect(parsed.body.isDraft).toBe(true);
      expect(parsed.body.seriesYear).toBe(2026);
    });

    it('committeeReportSchema accepts valid data', async () => {
      const data = { params: { id: validId }, body: { findings: 'Findings', recommendation: 'Rec' } };
      await expect(committeeReportSchema.parseAsync(data)).resolves.toEqual(data);
    });
  });

  describe('userValidation', () => {
    it('createUserSchema accepts valid data', async () => {
      const data = {
        body: {
          firstName: 'Juan', lastName: 'Dela Cruz', email: 'juan.delacruz@bongabong.gov.ph',
          role: 'Secretary', contactNumber: '09123456789',
        },
      };
      await expect(createUserSchema.parseAsync(data)).resolves.toEqual(data);
    });

    it('accepts valid email domains and normalizes casing and whitespace', async () => {
      const parsed = await createUserSchema.parseAsync({
        body: { firstName: 'Juan', lastName: 'Dela Cruz', email: '  Juan.Dela.Cruz@Example.com  ', role: 'SB Member', position: 'SB Member' }
      });
      expect(parsed.body.email).toBe('juan.dela.cruz@example.com');
    });

    it('requires a position for Vice Mayor accounts', async () => {
      await expect(createUserSchema.parseAsync({
        body: { firstName: 'Juan', lastName: 'Dela Cruz', email: 'juan.delacruz@bongabong.gov.ph', role: 'Vice Mayor' }
      })).rejects.toThrow('Position is required for Vice Mayor and SB Member roles');
    });

    it('createUserSchema rejects invalid email format', async () => {
      await expect(createUserSchema.parseAsync({
        body: { firstName: 'John', lastName: 'Doe', email: 'bad', role: 'Secretary' }
      })).rejects.toThrow();
    });

    it('updateStatusSchema accepts valid status', async () => {
      const data = { params: { id: validId }, body: { status: 'Active' } };
      await expect(updateStatusSchema.parseAsync(data)).resolves.toEqual(data);
    });

    it('updateStatusSchema rejects invalid id', async () => {
      await expect(updateStatusSchema.parseAsync({
        params: { id: 'bad' }, body: { status: 'Active' }
      })).rejects.toThrow();
    });

    it('resetPasswordSchema accepts valid data', async () => {
      const data = { params: { token: 'valid-token' }, body: { password: 'New@1234' } };
      await expect(resetPasswordSchema.parseAsync(data)).resolves.toEqual(data);
    });

    it('resetPasswordSchema rejects invalid id', async () => {
      await expect(resetPasswordSchema.parseAsync({
        params: { id: 'bad' }, body: { password: 'New@1234' }
      })).rejects.toThrow();
    });

    it('changePasswordSchema accepts valid data', async () => {
      const data = { params: { id: validId }, body: { currentPassword: 'old', newPassword: 'New@1234' } };
      await expect(changePasswordSchema.parseAsync(data)).resolves.toEqual(data);
    });

    it('changePasswordSchema rejects invalid id', async () => {
      await expect(changePasswordSchema.parseAsync({
        params: { id: 'bad' }, body: { currentPassword: 'old', newPassword: 'New@1234' }
      })).rejects.toThrow();
    });
  });

  describe('termValidation', () => {
    it('createTermSchema accepts valid data', async () => {
      const data = {
        body: { label: '2025-2028', startYear: 2025, endYear: 2028 },
      };
      await expect(createTermSchema.parseAsync(data)).resolves.toEqual(data);
    });

    it('createTermSchema rejects terms that do not span exactly three years', async () => {
      const data = { body: { label: '2025-2028', startYear: 2028, endYear: 2025 } };
      await expect(createTermSchema.parseAsync(data)).rejects.toThrow();
    });

    it('updateTermSchema accepts partial data', async () => {
      const data = { params: { id: validId }, body: { presidingOfficer: 'Hon. Juan Dela Cruz' } };
      await expect(updateTermSchema.parseAsync(data)).resolves.toEqual(data);
    });
  });

  describe('sessionValidation', () => {
    it('createSessionSchema accepts valid data with required fields', async () => {
      const data = {
        body: { title: 'Regular Session', date: '2026-01-15', callToOrder: 'Called' },
      };
      await expect(createSessionSchema.parseAsync(data)).resolves.toEqual(data);
    });

    it('updateSessionSchema accepts partial data', async () => {
      const data = { params: { id: validId }, body: { status: 'Final' } };
      await expect(updateSessionSchema.parseAsync(data)).resolves.toEqual(data);
    });

    it('updateSessionSchema rejects invalid id', async () => {
      await expect(updateSessionSchema.parseAsync({
        params: { id: 'bad' }, body: { status: 'Final' }
      })).rejects.toThrow();
    });
  });

  describe('sbMemberValidation', () => {
    it('createSbMemberSchema accepts valid data', async () => {
      const data = {
        body: {
          firstName: 'John', lastName: 'Doe', position: 'SB Member', termId: validId,
        },
      };
      await expect(createSbMemberSchema.parseAsync(data)).resolves.toEqual(data);
    });

    it('updateSbMemberSchema accepts partial data', async () => {
      const data = { params: { id: validId }, body: { isActive: 'true' } };
      await expect(updateSbMemberSchema.parseAsync(data)).resolves.toEqual(data);
    });

    it('updateSbMemberSchema rejects invalid id', async () => {
      await expect(updateSbMemberSchema.parseAsync({
        params: { id: 'bad' }, body: { isActive: 'true' }
      })).rejects.toThrow();
    });
  });

  describe('committeeValidation', () => {
    it('updateCommitteeSchema accepts valid data', async () => {
      const data = {
        params: { id: validId },
        body: { chairperson: 'Chair', members: [validId] },
      };
      await expect(updateCommitteeSchema.parseAsync(data)).resolves.toEqual(data);
    });

    it('updateCommitteeSchema rejects invalid id', async () => {
      await expect(updateCommitteeSchema.parseAsync({
        params: { id: 'bad' }, body: { chairperson: 'Chair' }
      })).rejects.toThrow();
    });
  });

  describe('announcementValidation', () => {
    it('createAnnouncementSchema accepts valid data', async () => {
      const data = {
        body: {
          title: 'Test Announcement', content: 'Content here', category: 'General',
        },
      };
      await expect(createAnnouncementSchema.parseAsync(data)).resolves.toEqual(data);
    });

    it('createAnnouncementSchema rejects short title', async () => {
      await expect(createAnnouncementSchema.parseAsync({
        body: { title: 'AB', content: 'Content' }
      })).rejects.toThrow();
    });

    it('updateAnnouncementSchema accepts partial data', async () => {
      const data = { params: { id: validId }, body: { isPublished: true } };
      await expect(updateAnnouncementSchema.parseAsync(data)).resolves.toEqual(data);
    });
  });

  describe('consultationValidation', () => {
    it('verifyFeedbackSchema accepts valid status', async () => {
      const data = {
        params: { id: validId },
        body: { status: 'Approved', sentiment: 'Positive' },
      };
      await expect(verifyFeedbackSchema.parseAsync(data)).resolves.toEqual(data);
    });

    it('verifyFeedbackSchema rejects invalid status', async () => {
      await expect(verifyFeedbackSchema.parseAsync({
        params: { id: validId }, body: { status: 'Invalid' }
      })).rejects.toThrow();
    });

    it('getFeedbackSchema accepts valid query', async () => {
      const data = { query: { barangay: 'Poblacion', sentiment: 'Positive' }, params: { ordinanceId: validId } };
      await expect(getFeedbackSchema.parseAsync(data)).resolves.toEqual(data);
    });

    it('getFeedbackSchema rejects invalid ordinanceId', async () => {
      await expect(getFeedbackSchema.parseAsync({
        query: {}, params: { ordinanceId: 'bad' }
      })).rejects.toThrow();
    });

    it('sendOtpSchema accepts valid contact number', async () => {
      const data = { body: { contactNumber: '09123456789' } };
      await expect(sendOtpSchema.parseAsync(data)).resolves.toEqual(data);
    });

    it('sendOtpSchema rejects missing contactNumber', async () => {
      await expect(sendOtpSchema.parseAsync({ body: {} })).rejects.toThrow();
    });

    it('sendOtpSchema rejects malformed mobile numbers', async () => {
      await expect(sendOtpSchema.parseAsync({ body: { contactNumber: '5551234' } })).rejects.toThrow();
    });
  });


  describe('authValidation', () => {
    it('loginSchema accepts valid credentials', async () => {
      const data = { body: { email: 'admin@ibosys.gov', password: 'Admin@1234' } };
      await expect(loginSchema.parseAsync(data)).resolves.toEqual(data);
    });

    it('loginSchema rejects invalid email', async () => {
      await expect(loginSchema.parseAsync({
        body: { email: 'bad-email', password: 'pass' }
      })).rejects.toThrow();
    });

    it('forgotPasswordSchema accepts valid email', async () => {
      const data = { body: { email: 'admin@ibosys.gov' } };
      await expect(forgotPasswordSchema.parseAsync(data)).resolves.toEqual(data);
    });

    it('resetPasswordSchema validates token and password', async () => {
      const data = { params: { token: 'valid-token' }, body: { password: 'NewPass@1234' } };
      await expect(resetPasswordSchema.parseAsync(data)).resolves.toEqual(data);
    });

    it('resetPasswordSchema rejects short password', async () => {
      await expect(resetPasswordSchema.parseAsync({
        params: { token: 'valid' }, body: { password: 'short' }
      })).rejects.toThrow();
    });
  });

  describe('publicValidation', () => {
    it('getDocumentsSchema accepts valid query', async () => {
      const data = { query: { search: 'ordinance', type: 'Ordinance', page: '1', limit: '10' } };
      await expect(getDocumentsSchema.parseAsync(data)).resolves.toEqual(data);
    });

    it('guestConsultSchema accepts valid data', async () => {
      const data = {
        params: { id: validId },
        body: {
          full_name: 'Juan Dela Cruz', barangay: 'Poblacion',
          contact_number: '09123456789', otp: '123456', data_privacy_consent: 'true',
        },
      };
      await expect(guestConsultSchema.parseAsync(data)).resolves.toEqual(data);
    });

    it('guestConsultSchema accepts verified email without SMS OTP and preserves the mobile OTP path', async () => {
      const base = {
        full_name: 'Juan Dela Cruz',
        barangay: 'Poblacion',
        contact_number: '09123456789',
        data_privacy_consent: 'true',
      };
      await expect(guestConsultSchema.parseAsync({
        params: { id: validId },
        body: { ...base, email: 'resident@example.com', emailVerificationToken: 'v'.repeat(43) },
      })).resolves.toMatchObject({ body: { email: 'resident@example.com' } });
      await expect(guestConsultSchema.parseAsync({
        params: { id: validId },
        body: { ...base, otp: '123456' },
      })).resolves.toMatchObject({ body: { otp: '123456' } });
    });

    it('guestConsultSchema requires a complete email verification pair or an SMS OTP', async () => {
      const body = {
        full_name: 'Juan Dela Cruz',
        barangay: 'Poblacion',
        contact_number: '09123456789',
        data_privacy_consent: 'true',
      };
      await expect(guestConsultSchema.parseAsync({ params: { id: validId }, body })).rejects.toThrow(/Verify your email|SMS OTP/i);
      await expect(guestConsultSchema.parseAsync({
        params: { id: validId }, body: { ...body, email: 'resident@example.com', otp: '123456' },
      })).rejects.toThrow(/provided together/i);
    });

    it('validates email verification send and check requests', async () => {
      await expect(sendEmailVerificationSchema.parseAsync({ body: { email: 'resident@example.com' } })).resolves.toEqual({ body: { email: 'resident@example.com' } });
      await expect(verifyEmailCodeSchema.parseAsync({ body: { email: 'resident@example.com', code: '123456' } })).resolves.toEqual({ body: { email: 'resident@example.com', code: '123456' } });
      await expect(verifyEmailCodeSchema.parseAsync({ body: { email: 'resident@example.com', code: '12x456' } })).rejects.toThrow();
    });

    it('guestConsultSchema rejects missing data_privacy_consent', async () => {
      await expect(guestConsultSchema.parseAsync({
        params: { id: validId },
        body: {
          full_name: 'Juan Dela Cruz', barangay: 'Poblacion', contact_number: '09123456789', otp: '123456',
        },
      })).rejects.toThrow();
    });

    it('guestConsultSchema rejects non-numeric OTPs', async () => {
      await expect(guestConsultSchema.parseAsync({
        params: { id: validId },
        body: {
          full_name: 'Juan Dela Cruz', barangay: 'Poblacion', contact_number: '09123456789',
          otp: '12a456', data_privacy_consent: 'true',
        },
      })).rejects.toThrow();
    });

    it('guestConsultSchema rejects invalid ordinanceId', async () => {
      await expect(guestConsultSchema.parseAsync({
        params: { id: 'bad' },
        body: { full_name: 'Juan', barangay: 'Pob', contact_number: '09123456789', otp: '123456', data_privacy_consent: 'true' }
      })).rejects.toThrow();
    });

    it('public feedback and term filters reject malformed identifiers', async () => {
      await expect(publicFeedbackIdSchema.parseAsync({ params: { id: 'bad' } })).rejects.toThrow();
      await expect(termFilterSchema.parseAsync({ query: { termId: 'bad' } })).rejects.toThrow();
      await expect(termFilterSchema.parseAsync({ query: { termId: validId } })).resolves.toEqual({ query: { termId: validId } });
    });
  });

  describe('route identifier schemas', () => {
    it('accepts valid ids and rejects malformed ids for deletion/read route classes', async () => {
      const schemas = [termIdParamsSchema, sessionIdParamsSchema, sbMemberIdParamsSchema, announcementIdParamsSchema];
      for (const schema of schemas) {
        await expect(schema.parseAsync({ params: { id: validId } })).resolves.toEqual({ params: { id: validId } });
        await expect(schema.parseAsync({ params: { id: 'bad' } })).rejects.toThrow();
      }
    });

    it('rejects malformed term ids in SB member bodies', async () => {
      await expect(createSbMemberSchema.parseAsync({
        body: { firstName: 'A', lastName: 'B', position: 'Member', termId: 'bad' },
      })).rejects.toThrow();
    });
  });

  describe('sessionValidation', () => {
    it('createSessionSchema accepts valid data including aligned metadata', async () => {
      const data = {
        body: {
          title: '47th Regular Session',
          sessionNumber: '47th',
          sessionType: 'Regular Session',
          legislativeBody: '12th Sangguniang Bayan',
          venue: 'Sangguniang Bayan Session Hall',
          municipality: 'Bongabong, Oriental Mindoro',
          date: '2026-06-15',
          orderOfBusiness: 'Adopted without amendments',
          privilegeHour: 'Hon. Monreal spoke on traffic regulations',
          callToOrder: 'Called at 10:15 AM',
        },
      };
      await expect(createSessionSchema.parseAsync(data)).resolves.toEqual(data);
    });

    it('createSessionSchema accepts legacy citizensHour for backwards compatibility', async () => {
      const data = {
        body: {
          title: 'Legacy Session',
          date: '2026-05-10',
          citizensHour: 'Citizen remarks recorded',
        },
      };
      await expect(createSessionSchema.parseAsync(data)).resolves.toEqual(data);
    });

    it('createSessionSchema rejects missing title or date', async () => {
      await expect(createSessionSchema.parseAsync({ body: { title: 'No Date' } })).rejects.toThrow();
      await expect(createSessionSchema.parseAsync({ body: { date: '2026-06-15' } })).rejects.toThrow();
    });

    it('updateSessionSchema accepts partial aligned fields', async () => {
      const data = {
        params: { id: validId },
        body: {
          privilegeHour: 'Updated privilege hour narrative',
          venue: 'Updated Session Hall',
        },
      };
      await expect(updateSessionSchema.parseAsync(data)).resolves.toEqual(data);
    });

    it('updateSessionSchema rejects invalid session id', async () => {
      await expect(updateSessionSchema.parseAsync({
        params: { id: 'invalid-id' },
        body: { title: 'Updated' },
      })).rejects.toThrow();
    });
  });
});
