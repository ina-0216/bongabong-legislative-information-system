import { describe, expect, it, vi } from 'vitest';
import { reviewerMayAct, legacyState, serializeReviewHistory, buildDecisionFilter } from '../controllers/consultationController.js';
import { verifyFeedbackSchema, getConsultationSubmissionsSchema } from '../validations/consultationValidation.js';
const consultationsRouter = require('../routes/consultations');
const { protect } = require('../middleware/auth');

const idA = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const idB = 'bbbbbbbbbbbbbbbbbbbbbbbb';

describe('consultation review workflow', () => {
  it('retains legacy status fallback and defaults missing legacy comments safely', () => {
    expect(legacyState({ status: 'Approved' }, 'eligibility')).toBe('Approved');
    expect(legacyState({ status: 'Approved', comment: 'A public comment' }, 'comment')).toBe('Approved');
    expect(legacyState({ status: 'Pending' }, 'comment')).toBe('NotProvided');
  });

  it('requires a different reviewer to finalize a rejection request', () => {
    const feedback = {
      eligibility_status: 'RejectionRequested',
      eligibility_review_history: [{ reviewerId: idA, action: 'RequestRejection' }],
    };
    expect(reviewerMayAct(feedback, 'eligibility', 'confirm_rejection', idA)).toBe(false);
    expect(reviewerMayAct(feedback, 'eligibility', 'confirm_rejection', idB)).toBe(true);
  });

  it('returns a limited reviewer identity projection with each audit event', () => {
    const createdAt = new Date('2026-11-10T02:00:00.000Z');
    expect(serializeReviewHistory([{
      _id: 'review-event-id',
      reviewerId: {
        _id: idA,
        firstName: 'Casey',
        middleName: 'M',
        lastName: 'Reviewer',
        role: 'Secretary',
        email: 'private@example.test',
      },
      action: 'RequestRejection',
      reason: 'Contains personal abuse.',
      createdAt,
    }])).toEqual([{
      id: 'review-event-id',
      reviewer: { id: idA, name: 'Casey M Reviewer', role: 'Secretary' },
      action: 'RequestRejection',
      reason: 'Contains personal abuse.',
      createdAt,
    }]);
  });

  it('lets the assigned reviewer request hiding a published comment but prevents self-confirmation', () => {
    const feedback = {
      comment_status: 'Approved',
      assigned_reviewer: idA,
      review_due_at: new Date(Date.now() + 60_000),
      comment_review_history: [],
    };
    expect(reviewerMayAct(feedback, 'comment', 'request_rejection', idA)).toBe(true);
    expect(reviewerMayAct(feedback, 'comment', 'request_rejection', idB)).toBe(false);

    feedback.comment_status = 'RejectionRequested';
    feedback.comment_review_history = [{ reviewerId: idA, action: 'RequestRejection', reason: 'Contains personal abuse.' }];
    expect(reviewerMayAct(feedback, 'comment', 'confirm_rejection', idA)).toBe(false);
    expect(reviewerMayAct(feedback, 'comment', 'confirm_rejection', idB)).toBe(true);
  });

  it('allows an appeal to be decided by a reviewer other than the original reviewer', () => {
    const feedback = {
      comment_status: 'AppealPending',
      comment_review_history: [{ reviewerId: idA, action: 'ConfirmRejection' }],
    };
    expect(reviewerMayAct(feedback, 'comment', 'resolve_appeal', idA)).toBe(false);
    expect(reviewerMayAct(feedback, 'comment', 'resolve_appeal', idB)).toBe(true);
  });

  it('does not let either prior reviewer resolve an appeal after a two-person rejection', () => {
    const feedback = {
      eligibility_status: 'AppealPending',
      eligibility_review_history: [
        { reviewerId: idA, action: 'RequestRejection' },
        { reviewerId: idB, action: 'ConfirmRejection' },
      ],
    };
    expect(reviewerMayAct(feedback, 'eligibility', 'resolve_appeal', idA)).toBe(false);
    expect(reviewerMayAct(feedback, 'eligibility', 'resolve_appeal', idB)).toBe(false);
  });

  it('requires an explicit outcome and an audit reason for final decisions', () => {
    const base = { params: { id: idA }, body: { area: 'eligibility', action: 'confirm_rejection', reason: 'ID does not match' } };
    expect(verifyFeedbackSchema.safeParse(base).success).toBe(false);
    expect(verifyFeedbackSchema.safeParse({ ...base, body: { ...base.body, appealOutcome: 'reject' } }).success).toBe(true);
  });

  it('validates the paginated private submissions listing query', () => {
    expect(getConsultationSubmissionsSchema.safeParse({ query: { page: '2', limit: '20', search: 'comment' } }).success).toBe(true);
    expect(getConsultationSubmissionsSchema.safeParse({ query: { page: '0', limit: '20' } }).success).toBe(false);
    expect(getConsultationSubmissionsSchema.safeParse({ query: { search: 'x'.repeat(101) } }).success).toBe(false);
  });

  it('mounts the identity-bearing submissions list behind Secretary/System Admin authorization', () => {
    const route = consultationsRouter.stack.find((layer) => layer.route?.path === '/submissions');
    expect(route?.route?.methods?.get).toBe(true);
    const [authentication, roleGuard] = route.route.stack.map((layer) => layer.handle);
    expect(authentication).toBe(protect);

    const unauthorizedResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const deniedNext = vi.fn();
    roleGuard({ user: { role: 'SB Member' } }, unauthorizedResponse, deniedNext);
    expect(unauthorizedResponse.status).toHaveBeenCalledWith(403);
    expect(deniedNext).not.toHaveBeenCalled();

    const secretaryNext = vi.fn();
    roleGuard({ user: { role: 'Secretary' } }, {}, secretaryNext);
    expect(secretaryNext).toHaveBeenCalledOnce();

    const adminNext = vi.fn();
    roleGuard({ user: { role: 'System Admin' } }, {}, adminNext);
    expect(adminNext).toHaveBeenCalledOnce();
  });

  it('uses the observed state and document version as a compare-and-set guard', () => {
    expect(buildDecisionFilter({ _id: 'feedback-id', __v: 4, eligibility_status: 'Pending' }, 'eligibility_status'))
      .toEqual({ _id: 'feedback-id', __v: 4, eligibility_status: 'Pending' });
  });

  it('guards legacy records without a workflow state or version key', () => {
    expect(buildDecisionFilter({ _id: 'legacy-id' }, 'eligibility_status')).toEqual({
      _id: 'legacy-id',
      __v: { $exists: false },
      eligibility_status: { $exists: false },
    });
  });
});
