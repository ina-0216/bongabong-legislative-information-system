import { describe, expect, it } from 'vitest';
const { toPublicFeedback, buildPublicFeedbackFilter, buildPublicVoteFilter, automaticApprovalFields } = require('../utils/publicFeedback');
const { buildAppealFilter } = require('../controllers/publicController');
const ConsultationFeedback = require('../models/ConsultationFeedback');

describe('public feedback projection', () => {
  it('returns only the anonymous public comment fields', () => {
    const feedback = toPublicFeedback({
      _id: 'feedback-id',
      full_name: 'Private Name',
      barangay: 'Private Barangay',
      contact_number: 'private-number',
      id_attachment_url: 'private-id-url',
      vote: 'Agree',
      comment: 'A public comment',
      sentiment: 'Positive',
      createdAt: '2026-10-10T00:00:00.000Z',
    });

    expect(feedback).toEqual({
      _id: 'feedback-id',
      vote: 'Agree',
      comment: 'A public comment',
      sentiment: 'Positive',
      createdAt: '2026-10-10T00:00:00.000Z',
    });
    expect(feedback).not.toHaveProperty('full_name');
    expect(feedback).not.toHaveProperty('barangay');
    expect(feedback).not.toHaveProperty('contact_number');
    expect(feedback).not.toHaveProperty('id_attachment_url');
  });

  it('publishes validated submissions immediately without recording a staff approver', () => {
    const approvedAt = new Date('2026-11-10T00:00:00.000Z');
    expect(automaticApprovalFields(true, approvedAt)).toEqual({
      status: 'Approved',
      eligibility_status: 'Approved',
      comment_status: 'Approved',
      approval_source: 'Automatic',
      approved_by: null,
      approved_at: approvedAt,
    });
    expect(automaticApprovalFields(false, approvedAt).comment_status).toBe('NotProvided');
  });

  it('does not label legacy records as staff-approved by default', () => {
    const record = new ConsultationFeedback({
      ordinanceId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      full_name: 'Resident Name',
      barangay: 'Poblacion',
      contact_number: '09123456789',
    });
    expect(record.approval_source).toBeUndefined();
  });

  it('keeps an already public comment visible while a second reviewer considers hiding it', () => {
    const filter = buildPublicFeedbackFilter('ordinance-id');
    expect(filter.$or).toContainEqual({ comment_status: 'Approved' });
    expect(filter.$or).toContainEqual({
      comment_status: 'RejectionRequested',
      $or: [
        { status: 'Approved' },
        { comment_review_history: { $elemMatch: { action: { $in: ['Approve', 'ConfirmApprove', 'AppealApprove'] } } } },
      ],
    });
    expect(filter.$or).toContainEqual({ comment_status: { $exists: false }, status: 'Approved' });
    expect(filter.$or).not.toContainEqual({ comment_status: 'RejectionRequested' });
    expect(filter.$or).not.toContainEqual({ comment_status: 'Rejected' });
  });

  it('keeps a previously counted vote in the tally while eligibility rejection awaits a second reviewer', () => {
    const filter = buildPublicVoteFilter('ordinance-id');
    expect(filter.$or).toContainEqual({ eligibility_status: 'Approved' });
    expect(filter.$or).toContainEqual({
      eligibility_status: 'RejectionRequested',
      $or: [
        { approval_source: 'Automatic' },
        { approved_by: { $exists: true, $ne: null } },
        { eligibility_review_history: { $elemMatch: { action: { $in: ['Approve', 'ConfirmApprove', 'AppealApprove'] } } } },
      ],
    });
    expect(filter.$or).toContainEqual({ eligibility_status: { $exists: false }, status: 'Approved' });
  });
});

describe('atomic public appeal guard', () => {
  it('requires the rejected state, current version, and no existing appeal for the target', () => {
    const filter = buildAppealFilter({
      feedback: {
        _id: 'feedback-id',
        __v: 2,
        eligibility_status: 'Rejected',
      },
      ordinanceId: 'ordinance-id',
      tokenHash: 'hashed-token',
      stateKey: 'eligibility_status',
      historyKey: 'eligibility_review_history',
      target: 'eligibility',
      now: new Date('2026-10-21T00:00:00.000Z'),
    });

    expect(filter).toMatchObject({
      _id: 'feedback-id',
      ordinanceId: 'ordinance-id',
      appeal_token_hash: 'hashed-token',
      __v: 2,
      eligibility_status: 'Rejected',
      public_appeals: { $not: { $elemMatch: { target: 'eligibility' } } },
    });
    expect(filter.eligibility_review_history.$not.$elemMatch.action.$in)
      .toEqual(['AppealApprove', 'AppealReject']);
  });

  it('requires the legacy rejection status when no area-specific state exists', () => {
    const filter = buildAppealFilter({
      feedback: { _id: 'legacy-id' },
      ordinanceId: 'ordinance-id',
      tokenHash: 'hashed-token',
      stateKey: 'comment_status',
      historyKey: 'comment_review_history',
      target: 'comment',
    });

    expect(filter.comment_status).toEqual({ $exists: false });
    expect(filter.status).toBe('Rejected');
    expect(filter.__v).toEqual({ $exists: false });
  });
});
