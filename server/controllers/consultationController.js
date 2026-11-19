const asyncHandler = require('express-async-handler');
const ConsultationFeedback = require('../models/ConsultationFeedback');
const { generateSignedImageUrl } = require('../utils/cloudinary');
const { buildPublicFeedbackFilter, buildPublicVoteFilter } = require('../utils/publicFeedback');

const PENDING_STATES = ['Pending', 'RejectionRequested', 'AppealPending'];
const isSameUser = (left, right) => String(left?._id || left || '') === String(right?._id || right || '');
const buildDecisionFilter = (feedback, stateKey) => ({
  _id: feedback._id,
  __v: feedback.__v === undefined ? { $exists: false } : feedback.__v,
  [stateKey]: feedback[stateKey] === undefined ? { $exists: false } : feedback[stateKey],
});
const legacyState = (feedback, area) => {
  if (area === 'eligibility') return feedback.eligibility_status || feedback.status || 'Pending';
  if (feedback.comment_status) return feedback.comment_status;
  return feedback.comment ? (feedback.status || 'Pending') : 'NotProvided';
};

const serializeReviewHistory = (history = []) => history.map((entry) => {
  const reviewer = entry.reviewerId;
  const isPopulatedReviewer = reviewer && typeof reviewer === 'object' && reviewer.firstName;
  const reviewerId = isPopulatedReviewer ? reviewer._id : reviewer;
  const reviewerName = isPopulatedReviewer
    ? [reviewer.firstName, reviewer.middleName, reviewer.lastName].filter(Boolean).join(' ')
    : 'Reviewer account unavailable';

  return {
    id: entry._id ? String(entry._id) : undefined,
    reviewer: {
      id: reviewerId ? String(reviewerId) : '',
      name: reviewerName,
      role: isPopulatedReviewer ? reviewer.role : '',
    },
    action: entry.action,
    reason: entry.reason || '',
    createdAt: entry.createdAt,
  };
});

const feedbackQueueFilter = () => ({
  $or: [
    { eligibility_status: { $in: PENDING_STATES } },
    { comment_status: { $in: PENDING_STATES } },
    { eligibility_status: { $exists: false }, status: 'Pending' },
  ],
});

const reviewerMayAct = (feedback, area, action, userId) => {
  const state = legacyState(feedback, area);
  const history = area === 'eligibility' ? feedback.eligibility_review_history : feedback.comment_review_history;
  if (action === 'confirm_rejection') {
    const request = [...(history || [])].reverse().find((entry) => entry.action === 'RequestRejection');
    return state === 'RejectionRequested' && request && !isSameUser(request.reviewerId, userId);
  }
  if (action === 'resolve_appeal') {
    return state === 'AppealPending' && !(history || []).some((entry) => isSameUser(entry.reviewerId, userId));
  }
  const canRequestCommentHide = area === 'comment' && action === 'request_rejection' && state === 'Approved';
  if (state !== 'Pending' && !canRequestCommentHide) return false;
  if (state === 'Approved' && !canRequestCommentHide) return false;
  if (!feedback.assigned_reviewer || isSameUser(feedback.assigned_reviewer, userId)) return true;
  return !feedback.review_due_at || new Date(feedback.review_due_at).getTime() <= Date.now();
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getPendingFeedback = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const pageNumber = Number.parseInt(page, 10);
  const pageSize = Number.parseInt(limit, 10);
  const skip = (pageNumber - 1) * pageSize;

  const filter = feedbackQueueFilter();
  if (search?.trim()) {
    const safeSearch = escapeRegex(search.trim());
    filter.$and = [{ $or: [
      { full_name: { $regex: safeSearch, $options: 'i' } },
      { barangay: { $regex: safeSearch, $options: 'i' } }
    ] }];
  }

  const [pending, total] = await Promise.all([
    ConsultationFeedback.find(filter)
      .select('ordinanceId full_name barangay contact_number vote comment status eligibility_status comment_status eligibility_review_history comment_review_history assigned_reviewer review_due_at id_scan sentiment approved_by approved_at createdAt id_attachment_url id_attachment_public_id id_attachment_type')
      .populate('ordinanceId', 'title number')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize),
    ConsultationFeedback.countDocuments(filter)
  ]);
  const User = require('../models/User');
  const activeReviewerIds = (await User.find({
    role: { $in: ['Secretary', 'System Admin'] }, status: 'Active',
  }).select('_id').lean()).map(({ _id }) => String(_id));

  res.json({
    docs: pending.map((feedback) => {
      const { id_attachment_url: attachmentUrl, id_attachment_public_id: publicId, ...safeFeedback } = feedback.toObject();
      const eligibilityStatus = legacyState(safeFeedback, 'eligibility');
      const commentStatus = legacyState(safeFeedback, 'comment');
      const history = safeFeedback.eligibility_review_history || [];
      const lastEligibilityReview = history[history.length - 1];
      const canReviewEligibility = reviewerMayAct(safeFeedback, 'eligibility', eligibilityStatus === 'RejectionRequested' ? 'confirm_rejection' : eligibilityStatus === 'AppealPending' ? 'resolve_appeal' : 'approve', req.user._id);
      const canReviewComment = reviewerMayAct(safeFeedback, 'comment', commentStatus === 'RejectionRequested' ? 'confirm_rejection' : commentStatus === 'AppealPending' ? 'resolve_appeal' : 'approve', req.user._id);
      const eligibilityHistory = safeFeedback.eligibility_review_history || [];
      const commentHistory = safeFeedback.comment_review_history || [];
      const hasUninvolvedReviewer = (historyItems) => activeReviewerIds.some((id) => !historyItems.some((entry) => isSameUser(entry.reviewerId, id)));
      return {
        ...safeFeedback,
        eligibility_status: eligibilityStatus,
        comment_status: commentStatus,
        hasIdAttachment: Boolean(attachmentUrl || publicId),
        canReviewEligibility,
        canReviewComment,
        waitingForSecondReviewer: Boolean(lastEligibilityReview?.action === 'RequestRejection'),
        appealReviewerUnavailableEligibility: eligibilityStatus === 'AppealPending' && !hasUninvolvedReviewer(eligibilityHistory),
        appealReviewerUnavailableComment: commentStatus === 'AppealPending' && !hasUninvolvedReviewer(commentHistory),
      };
    }),
    total,
    page: pageNumber,
    pages: Math.ceil(total / pageSize),
  });
});

const getConsultationSubmissions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const pageNumber = Number.parseInt(page, 10);
  const pageSize = Number.parseInt(limit, 10);
  const filter = {};
  if (search?.trim()) {
    const safeSearch = escapeRegex(search.trim());
    filter.$or = [
      { full_name: { $regex: safeSearch, $options: 'i' } },
      { barangay: { $regex: safeSearch, $options: 'i' } },
      { contact_number: { $regex: safeSearch, $options: 'i' } },
      { email: { $regex: safeSearch, $options: 'i' } },
      { comment: { $regex: safeSearch, $options: 'i' } },
      { vote: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const [submissions, total] = await Promise.all([
    ConsultationFeedback.find(filter)
      .select('ordinanceId full_name barangay contact_number email vote comment status eligibility_status comment_status eligibility_review_history comment_review_history assigned_reviewer review_due_at id_scan sentiment approval_source approved_by approved_at createdAt id_attachment_url id_attachment_public_id id_attachment_type')
      .populate('ordinanceId', 'title number')
      .populate('eligibility_review_history.reviewerId', 'firstName middleName lastName role')
      .populate('comment_review_history.reviewerId', 'firstName middleName lastName role')
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize),
    ConsultationFeedback.countDocuments(filter),
  ]);
  const User = require('../models/User');
  const activeReviewerIds = (await User.find({
    role: { $in: ['Secretary', 'System Admin'] }, status: 'Active',
  }).select('_id').lean()).map(({ _id }) => String(_id));

  res.json({
    docs: submissions.map((feedback) => {
      const { id_attachment_url: attachmentUrl, id_attachment_public_id: publicId, ...safeFeedback } = feedback.toObject();
      const eligibilityStatus = legacyState(safeFeedback, 'eligibility');
      const commentStatus = legacyState(safeFeedback, 'comment');
      const eligibilityHistory = safeFeedback.eligibility_review_history || [];
      const commentHistory = safeFeedback.comment_review_history || [];
      const lastEligibilityReview = eligibilityHistory[eligibilityHistory.length - 1];
      const hasUninvolvedReviewer = (historyItems) => activeReviewerIds.some((id) => !historyItems.some((entry) => isSameUser(entry.reviewerId, id)));
      return {
        ...safeFeedback,
        eligibility_status: eligibilityStatus,
        comment_status: commentStatus,
        eligibility_review_history: serializeReviewHistory(eligibilityHistory),
        comment_review_history: serializeReviewHistory(commentHistory),
        hasIdAttachment: Boolean(attachmentUrl || publicId),
        canReviewEligibility: reviewerMayAct(safeFeedback, 'eligibility', eligibilityStatus === 'RejectionRequested' ? 'confirm_rejection' : eligibilityStatus === 'AppealPending' ? 'resolve_appeal' : 'approve', req.user._id),
        canReviewComment: reviewerMayAct(safeFeedback, 'comment', commentStatus === 'RejectionRequested' ? 'confirm_rejection' : commentStatus === 'AppealPending' ? 'resolve_appeal' : commentStatus === 'Approved' ? 'request_rejection' : 'approve', req.user._id),
        waitingForSecondReviewer: Boolean(lastEligibilityReview?.action === 'RequestRejection'),
        waitingForSecondReviewerComment: Boolean(commentHistory[commentHistory.length - 1]?.action === 'RequestRejection'),
        appealReviewerUnavailableEligibility: eligibilityStatus === 'AppealPending' && !hasUninvolvedReviewer(eligibilityHistory),
        appealReviewerUnavailableComment: commentStatus === 'AppealPending' && !hasUninvolvedReviewer(commentHistory),
      };
    }),
    total,
    page: pageNumber,
    pages: Math.ceil(total / pageSize),
  });
});

const getFeedbackAttachment = asyncHandler(async (req, res) => {
  // H-3 fix: removed status:'Pending' constraint — admins must be able to view
  // the ID attachment of approved/rejected submissions for audit purposes.
  // Route-level protect + authorize middleware enforces role-based access.
  const feedback = await ConsultationFeedback.findById(req.params.id)
    .select('id_attachment_url id_attachment_public_id id_attachment_format id_attachment_type');
  if (!feedback) {
    res.status(404);
    throw new Error('Feedback or attachment not found');
  }
  if (!feedback.id_attachment_public_id || feedback.id_attachment_type !== 'authenticated') {
    res.status(409);
    throw new Error('This attachment must be migrated to private storage before it can be viewed.');
  }

  const version = feedback.id_attachment_url?.match(/\/v(\d+)\//)?.[1];
  const url = generateSignedImageUrl(
    feedback.id_attachment_public_id,
    version ? { version: Number(version) } : {}
  );
  let upstream;
  try {
    upstream = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  } catch (error) {
    console.error('[Consultation Attachment] Cloudinary request failed:', {
      name: error?.name || 'Error',
      message: error?.name === 'TimeoutError' ? 'Cloudinary request timed out.' : 'Cloudinary request could not be completed.',
    });
    res.status(502);
    throw new Error('The protected attachment service is temporarily unavailable.');
  }
  if (!upstream.ok) {
    const providerMessage = upstream.headers.get('x-cld-error');
    console.error('[Consultation Attachment] Cloudinary rejected the signed image request:', {
      status: upstream.status,
      providerMessage: providerMessage?.slice(0, 300),
      requestId: upstream.headers.get('x-cld-request-id') || upstream.headers.get('x-request-id') || undefined,
    });
    await upstream.body?.cancel().catch(() => {});
    res.status(502);
    throw new Error('Cloudinary could not provide the protected attachment.');
  }
  const contentType = upstream.headers.get('content-type') || `image/${feedback.id_attachment_format || 'jpeg'}`;
  if (!contentType.startsWith('image/')) {
    res.status(502);
    throw new Error('The protected attachment is not an image.');
  }
  const image = Buffer.from(await upstream.arrayBuffer());
  if (!image.length || image.length > 25 * 1024 * 1024) {
    res.status(502);
    throw new Error('The protected attachment has an invalid size.');
  }
  res
    .status(200)
    .set('Cache-Control', 'private, no-store, max-age=0')
    .set('X-Content-Type-Options', 'nosniff')
    .type(contentType)
    .set('Content-Disposition', 'inline')
    .send(image);
});

const verifyFeedback = asyncHandler(async (req, res) => {
  let { area = 'eligibility', action, reason = '', status, sentiment } = req.body;

  // Preserve the old API shape while routing legacy reject requests through
  // the two-reviewer rejection process.
  if (!action && status) action = status === 'Approved' ? 'approve' : 'request_rejection';

  let feedback = await ConsultationFeedback.findById(req.params.id).populate('ordinanceId', 'title number _id');
  if (!feedback) {
    res.status(404);
    throw new Error('Feedback not found');
  }

  if (!['eligibility', 'comment'].includes(area)) {
    res.status(400);
    throw new Error('Review area must be eligibility or comment.');
  }
  if (!['approve', 'request_rejection', 'confirm_rejection', 'resolve_appeal'].includes(action)) {
    res.status(400);
    throw new Error('Unsupported review action.');
  }

  const isAppealResolution = action === 'resolve_appeal';
  const isRejectionResolution = action === 'confirm_rejection';
  const approvalOutcome = req.body.appealOutcome === 'approve';
  if (!reviewerMayAct(feedback, area, action, req.user._id)) {
    res.status(409);
    throw new Error('This item is assigned to another reviewer, is not awaiting this decision, or requires an independent reviewer.');
  }
  if ((action === 'request_rejection' || isRejectionResolution || isAppealResolution) && reason.trim().length < 8) {
    res.status(400);
    throw new Error('A clear reason of at least 8 characters is required for rejection or appeal decisions.');
  }

  const stateKey = area === 'eligibility' ? 'eligibility_status' : 'comment_status';
  const historyKey = area === 'eligibility' ? 'eligibility_review_history' : 'comment_review_history';
  let nextState;
  let actionName;
  if (isAppealResolution || isRejectionResolution) {
    nextState = approvalOutcome ? 'Approved' : 'Rejected';
    actionName = isAppealResolution
      ? (approvalOutcome ? 'AppealApprove' : 'AppealReject')
      : (approvalOutcome ? 'ConfirmApprove' : 'ConfirmRejection');
  } else if (action === 'approve') {
    nextState = 'Approved';
    actionName = 'Approve';
  } else if (action === 'request_rejection') {
    nextState = 'RejectionRequested';
    actionName = 'RequestRejection';
  } else {
    nextState = 'Rejected';
    actionName = 'ConfirmRejection';
  }

  const setUpdates = { [stateKey]: nextState };
  if (area === 'eligibility') {
    setUpdates.status = nextState === 'Approved' ? 'Approved'
      : nextState === 'Rejected' ? 'Rejected' : 'Pending';
    if (nextState === 'Approved') {
      setUpdates.approved_by = req.user._id;
      setUpdates.approved_at = Date.now();
      setUpdates.approval_source = 'Staff';
    }
  } else if (nextState === 'Approved') {
    setUpdates.approval_source = 'Staff';
  }

  if (sentiment && ['Positive', 'Negative', 'Neutral'].includes(sentiment)) {
    setUpdates.sentiment = sentiment;
  }

  const updatedFeedback = await ConsultationFeedback.findOneAndUpdate(
    buildDecisionFilter(feedback, stateKey),
    {
      $set: setUpdates,
      $push: { [historyKey]: { reviewerId: req.user._id, action: actionName, reason: reason.trim() } },
      $inc: { __v: 1 },
    },
    { new: true, runValidators: true }
  ).populate('ordinanceId', 'title number _id');
  if (!updatedFeedback) {
    res.status(409);
    throw new Error('This review was updated by another reviewer. Refresh the queue and review the current status.');
  }
  feedback = updatedFeedback;

  // Notify all SB Members + Vice Mayor when a consultation is approved so they can review community feedback
  if (area === 'eligibility' && feedback.eligibility_status === 'Approved') {
    try {
      const User = require('../models/User');
      const Notification = require('../models/Notification');
      const recipients = await User.find({ role: { $in: ['SB Member', 'Vice Mayor'] }, status: 'Active' }).select('_id');
      if (recipients.length > 0) {
        const ord = feedback.ordinanceId;
        await Notification.insertMany(
          recipients.map(u => ({
            recipientId: u._id,
            title: 'Consultation Feedback Approved',
            message: `A public submission on "${ord?.title || 'Ordinance'} (${ord?.number || ''})" has been verified and is now visible to the community.`,
            link: `/ordinances/${ord?._id}`,
          }))
        );
      }
    } catch (notifyErr) {
      console.error('[Consultation] Notification failed:', notifyErr.message);
    }
  }

  if (action === 'request_rejection') {
    try {
      const User = require('../models/User');
      const Notification = require('../models/Notification');
      const reviewers = await User.find({
        role: { $in: ['Secretary', 'System Admin'] },
        status: 'Active',
        _id: { $ne: req.user._id },
      }).select('_id');
      if (reviewers.length) {
        const reviewArea = area === 'eligibility' ? 'participation eligibility' : 'public comment visibility';
        const ordinance = feedback.ordinanceId;
        await Notification.insertMany(reviewers.map(({ _id }) => ({
          recipientId: _id,
          title: 'Independent Consultation Review Needed',
          message: `A second reviewer is needed for ${reviewArea} on "${ordinance?.title || 'Ordinance'} (${ordinance?.number || ''})".`,
          link: '/consultation-verification',
        })));
      }
    } catch (notifyErr) {
      console.error('[Consultation] Independent review notification failed:', notifyErr.message);
    }
  }

  res.json({
    message: action === 'request_rejection' ? 'Rejection requested for independent review.' : 'Review decision saved.',
    feedback: { _id: feedback._id, status: feedback.status, eligibility_status: feedback.eligibility_status, comment_status: feedback.comment_status },
  });
});

const getOrdinanceFeedback = asyncHandler(async (req, res) => {
  const { barangay, sentiment, search } = req.query;

  const approvedComments = buildPublicFeedbackFilter(req.params.ordinanceId);
  const filter = { ...approvedComments };

  if (barangay) filter.barangay = barangay;
  if (sentiment) filter.sentiment = sentiment;
  if (search?.trim()) filter.comment = { $regex: escapeRegex(search.trim()), $options: 'i' };

  // Fetch all approved feedback once, then derive both the filtered list and tally
  const [allVotes, feedbacks] = await Promise.all([
    ConsultationFeedback.find(buildPublicVoteFilter(req.params.ordinanceId)).select('vote'),
    ConsultationFeedback.find(filter)
      .select('vote comment sentiment createdAt')
      .sort({ createdAt: -1 })
      .limit(500),
  ]);

  const tally = { Agree: 0, Disagree: 0, Neutral: 0 };
  let totalVotes = 0;
  allVotes.forEach(f => {
    if (tally[f.vote] !== undefined) {
      tally[f.vote]++;
      totalVotes++;
    }
  });

  let majority = 'No votes yet';
  if (totalVotes > 0) {
    if (tally.Agree / totalVotes >= 0.5) majority = 'Majority Agrees';
    else if (tally.Disagree / totalVotes >= 0.5) majority = 'Majority Disagrees';
    else majority = 'No Clear Majority';
  }

  res.json({ feedbacks, tally, total: totalVotes, majority });
});

module.exports = {
  getPendingFeedback,
  getConsultationSubmissions,
  getFeedbackAttachment,
  verifyFeedback,
  getOrdinanceFeedback,
  reviewerMayAct,
  legacyState,
  serializeReviewHistory,
  buildDecisionFilter,
};
