const toPublicFeedback = (feedback) => ({
  _id: feedback._id,
  vote: feedback.vote,
  comment: feedback.comment,
  sentiment: feedback.sentiment,
  createdAt: feedback.createdAt,
});

const buildPublicFeedbackFilter = (ordinanceId) => ({
  ordinanceId,
  $or: [
    { comment_status: 'Approved' },
    // A published comment stays public while an independent hide request is pending.
    {
      comment_status: 'RejectionRequested',
      $or: [
        { status: 'Approved' },
        { comment_review_history: { $elemMatch: { action: { $in: ['Approve', 'ConfirmApprove', 'AppealApprove'] } } } },
      ],
    },
    { comment_status: { $exists: false }, status: 'Approved' },
  ],
});

const buildPublicVoteFilter = (ordinanceId) => ({
  ordinanceId,
  $or: [
    { eligibility_status: 'Approved' },
    {
      eligibility_status: 'RejectionRequested',
      $or: [
        { approval_source: 'Automatic' },
        { approved_by: { $exists: true, $ne: null } },
        { eligibility_review_history: { $elemMatch: { action: { $in: ['Approve', 'ConfirmApprove', 'AppealApprove'] } } } },
      ],
    },
    { eligibility_status: { $exists: false }, status: 'Approved' },
  ],
});

const automaticApprovalFields = (hasComment, approvedAt = new Date()) => ({
  status: 'Approved',
  eligibility_status: 'Approved',
  comment_status: hasComment ? 'Approved' : 'NotProvided',
  approval_source: 'Automatic',
  approved_by: null,
  approved_at: approvedAt,
});

module.exports = { toPublicFeedback, buildPublicFeedbackFilter, buildPublicVoteFilter, automaticApprovalFields };
