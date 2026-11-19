import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { normalizeArray } from '../utils/normalizeResponse';
import { Check, X, FileImage, Search, CheckCircle2, User, Phone, MapPin, Sparkles, ZoomIn, Mail, History } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { Pagination, Modal } from '@ibosys/ui';
import PageSkeleton from '../components/ui/PageSkeleton';

const REVIEW_ACTION_LABELS = {
  Approve: 'Approved',
  RequestRejection: 'Requested a second review',
  ConfirmApprove: 'Kept approved after second review',
  ConfirmRejection: 'Rejected after second review',
  AppealApprove: 'Approved on appeal',
  AppealReject: 'Rejected on appeal',
};

export function ConsultationReviewHistory({ title, history = [] }) {
  return (
    <section className="rounded-lg border border-border bg-background p-3" aria-label={title}>
      <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <History size={12} aria-hidden="true" /> {title}
      </h4>
      {history.length ? (
        <ol className="space-y-2">
          {history.map((entry, index) => {
            const reviewedAt = entry.createdAt ? new Date(entry.createdAt) : null;
            const hasValidTime = reviewedAt && !Number.isNaN(reviewedAt.getTime());
            const timeLabel = hasValidTime
              ? reviewedAt.toLocaleString('en-PH')
              : 'Time unavailable';

            return (
              <li key={entry.id || `${entry.action}-${index}`} className="border-l-2 border-primary/30 pl-2.5 text-[11px]">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <span className="font-semibold text-foreground">
                    {entry.reviewer?.name || 'Reviewer account unavailable'}
                    {entry.reviewer?.role && <span className="ml-1 font-normal text-muted-foreground">· {entry.reviewer.role}</span>}
                  </span>
                  <time className="text-muted-foreground" dateTime={hasValidTime ? reviewedAt.toISOString() : undefined}>{timeLabel}</time>
                </div>
                <p className="mt-0.5 font-medium text-foreground">{REVIEW_ACTION_LABELS[entry.action] || entry.action}</p>
                {entry.reason && <p className="mt-0.5 whitespace-pre-wrap text-muted-foreground">Reason: {entry.reason}</p>}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-[11px] text-muted-foreground">No staff review actions recorded yet.</p>
      )}
    </section>
  );
}

export default function ConsultationVerification() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [sentimentOverride, setSentimentOverride] = useState('');
  const [idModalOpen, setIdModalOpen] = useState(false);
  const [idAttachmentUrl, setIdAttachmentUrl] = useState('');
  const [idAttachmentLoading, setIdAttachmentLoading] = useState(false);
  const [idAttachmentError, setIdAttachmentError] = useState('');
  const [idAttachmentRetry, setIdAttachmentRetry] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  const [confirmModal, setConfirmModal] = useState({ open: false, id: null, area: 'eligibility', action: 'approve', appealOutcome: null, bulk: false });
  const [reviewReason, setReviewReason] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    let params = `page=${page}&limit=${ITEMS_PER_PAGE}`;
    if (search) params += `&search=${encodeURIComponent(search)}`;
    api.getConsultationSubmissions(params)
      .then(data => {
        setFeedbacks(normalizeArray(data));
        setTotalPages(data.pages || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, page, load]);

  useEffect(() => {
    if (!idModalOpen || !selectedFeedback?.hasIdAttachment) return undefined;
    let cancelled = false;
    let objectUrl = '';
    setIdAttachmentUrl('');
    setIdAttachmentError('');
    setIdAttachmentLoading(true);
    api.getConsultationAttachment(selectedFeedback._id)
      .then((imageBlob) => {
        if (!cancelled) {
          objectUrl = URL.createObjectURL(imageBlob);
          setIdAttachmentUrl(objectUrl);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        const status = error.response?.status;
        const message = status === 409
          ? 'This older attachment needs private-storage migration before it can be opened.'
          : status === 502
            ? 'Private image storage could not return this attachment. Try again shortly or contact the system administrator.'
            : 'Unable to load the private ID attachment. Check your connection and try again.';
        setIdAttachmentError(message);
        toast.error(message);
      })
      .finally(() => { if (!cancelled) setIdAttachmentLoading(false); });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [idModalOpen, selectedFeedback?._id, selectedFeedback?.hasIdAttachment, idAttachmentRetry]);

  const paginatedFeedbacks = feedbacks;

  const handleAction = (id, area, action, appealOutcome = null) => {
    setReviewReason('');
    setConfirmModal({ open: true, id, area, action, appealOutcome, bulk: false });
  };

  const executeAction = async () => {
    const { id, area, action, appealOutcome, bulk } = confirmModal;
    setConfirmModal({ open: false, id: null, area: 'eligibility', action: 'approve', appealOutcome: null, bulk: false });

    try {
      const ids = bulk ? selectedIds : [id];
      for (const feedbackId of ids) {
        await api.verifyConsultation(feedbackId, {
          area,
          action,
          appealOutcome: appealOutcome || undefined,
          reason: reviewReason.trim() || undefined,
          sentiment: area === 'comment' ? sentimentOverride : undefined,
        });
      }

      load();
      setSelectedFeedback(null);
      setSentimentOverride('');
      setSelectedIds([]);

      if (action === 'approve' || (action === 'resolve_appeal' && appealOutcome === 'approve')) {
        toast.success(bulk ? `${ids.length} participation records approved.` : 'Review decision saved.');
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ['#1e5e3a', '#b38f4d', '#ffffff'] });
      } else if (action === 'request_rejection') {
        toast.info('Rejection request sent for independent review.');
      } else {
        toast.info('Review decision saved with an audit reason.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update feedback status.');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-6 min-w-0"
    >
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Consultation Review</h2>
        <p className="text-sm text-muted-foreground mt-1">New submissions are published immediately. Review identity details here; a comment stays visible until a different Secretary or System Admin confirms a hide request. ID scanning is advisory.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Feedbacks List */}
        <div className="lg:col-span-7 bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              placeholder="Search name, barangay, contact, email, vote, or comment…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>

          {loading ? (
            <PageSkeleton rows={5} />
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-12 px-4">
              <CheckCircle2 size={36} className="mx-auto text-primary mb-2" />
              <h4 className="text-sm font-bold text-foreground">All Caught Up!</h4>
              <p className="text-xs text-muted-foreground mt-0.5">No consultation submissions match this search.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedFeedbacks.map(f => (
                <div
                  key={f._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedFeedback(f);
                    setSentimentOverride(f.sentiment);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedFeedback(f);
                      setSentimentOverride(f.sentiment);
                    }
                  }}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                    selectedFeedback?._id === f._id
                      ? 'border-primary bg-primary/5 shadow-xs'
                      : 'border-border bg-background hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(f._id)}
                        disabled={f.eligibility_status !== 'Pending' || !f.canReviewEligibility}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSelectedIds(prev => e.target.checked ? [...prev, f._id] : prev.filter(id => id !== f._id));
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5"
                        aria-label={`Select ${f.full_name} for eligibility approval`}
                      />
                      <div>
                      <div className="text-xs font-bold text-foreground">{f.full_name}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        <span>Brgy. {f.barangay}</span>
                        <span>·</span>
                        {f.ordinanceId?.number ? (
                          <span className="inline-block font-mono text-[10px] font-bold text-primary bg-primary/8 border border-primary/20 px-1.5 py-0.5 rounded shrink-0 leading-none">
                            {f.ordinanceId.number}
                          </span>
                        ) : (
                          <span className="font-semibold text-foreground">Measure</span>
                        )}
                      </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        f.vote === 'Agree' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        Vote: {f.vote}
                      </span>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {new Date(f.createdAt).toLocaleDateString('en-PH')}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">Eligibility: {f.eligibility_status} · Comment: {f.comment_status}</div>
                    </div>
                  </div>
                </div>
              ))}
              {selectedIds.length > 0 && (
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => { setReviewReason(''); setConfirmModal({ open: true, id: null, area: 'eligibility', action: 'approve', appealOutcome: null, bulk: true }); }} className="flex-1 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-md">Approve selected participation ({selectedIds.length})</button>
                </div>
              )}
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>

        {/* Right Column: Selected Feedback Detail Card */}
        <div className="lg:col-span-5">
          {selectedFeedback ? (
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4 sticky top-20">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground border-b border-border pb-2">
                Verification Details
              </h3>

              <div className="space-y-1 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Resident Info</span>
                <div className="font-bold text-foreground text-sm flex items-center gap-1.5"><User size={14} className="text-primary" /> {selectedFeedback.full_name}</div>
                <div className="text-muted-foreground flex items-center gap-1.5"><MapPin size={13} /> Brgy. {selectedFeedback.barangay}</div>
                {selectedFeedback.contact_number && (
                  <div className="text-muted-foreground flex items-center gap-1.5"><Phone size={13} /> {selectedFeedback.contact_number}</div>
                )}
                {selectedFeedback.email && (
                  <div className="text-muted-foreground flex items-center gap-1.5 break-all"><Mail size={13} className="shrink-0" /> {selectedFeedback.email}</div>
                )}
                <div className="text-[11px] text-muted-foreground">Approval source: {selectedFeedback.approval_source === 'Automatic' ? 'System' : selectedFeedback.approval_source === 'Staff' ? 'Staff' : 'Legacy record'} · {new Date(selectedFeedback.createdAt).toLocaleString('en-PH')}</div>
              </div>

              <div className="p-3 bg-secondary/50 rounded-lg border border-border space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold uppercase tracking-wider text-muted-foreground">Citizen Comment</span>
                  <span className={`font-bold ${selectedFeedback.vote === 'Agree' ? 'text-primary' : 'text-destructive'}`}>
                    VOTE: {selectedFeedback.vote}
                  </span>
                </div>
                <p className="text-xs italic text-foreground leading-relaxed">
                  "{selectedFeedback.comment || 'No written comment provided.'}"
                </p>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ID scan assistance</div>
                <p className="text-xs text-foreground">{selectedFeedback.id_scan?.status || 'Not scanned'} · Confidence: {selectedFeedback.id_scan?.confidence ?? '—'}% · Name: {selectedFeedback.id_scan?.nameMatch || 'Not checked'}</p>
                {selectedFeedback.id_scan?.flags?.length > 0 && <p className="text-[11px] text-amber-700">Flags: {selectedFeedback.id_scan.flags.join(', ')}. Please inspect the attachment manually.</p>}
                <p className="text-[10px] text-muted-foreground">The scan is advisory and cannot approve or reject a submission.</p>
              </div>
              {selectedFeedback.review_due_at && <p className="text-[11px] text-muted-foreground">Assigned review window ends {new Date(selectedFeedback.review_due_at).toLocaleString('en-PH')}.</p>}
              {selectedFeedback.eligibility_status === 'RejectionRequested' && <div className="rounded-md bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-900">Awaiting a second reviewer for the eligibility decision.</div>}
              {selectedFeedback.comment_status === 'RejectionRequested' && <div className="rounded-md bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-900">Awaiting a second reviewer. The comment remains visible until that reviewer decides.</div>}
              <div className="grid gap-2">
                <ConsultationReviewHistory
                  title="Eligibility review history"
                  history={selectedFeedback.eligibility_review_history}
                />
                {selectedFeedback.comment && <ConsultationReviewHistory
                  title="Comment moderation history"
                  history={selectedFeedback.comment_review_history}
                />}
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Sparkles size={11} className="text-primary" /> Sentiment Analysis
                </span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                    selectedFeedback.sentiment === 'Positive' ? 'bg-emerald-50 text-emerald-800' : selectedFeedback.sentiment === 'Neutral' ? 'bg-slate-100 text-slate-700' : 'bg-red-50 text-red-700'
                  }`}>
                    AI: {selectedFeedback.sentiment}
                  </span>
                  <select
                    value={sentimentOverride}
                    onChange={e => setSentimentOverride(e.target.value)}
                    className="flex-1 px-2.5 py-1 bg-background border border-input rounded-md text-xs text-foreground outline-none focus:border-primary"
                  >
                    <option value="Positive">Override: Positive</option>
                    <option value="Neutral">Override: Neutral</option>
                    <option value="Negative">Override: Negative</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Attached Resident ID</span>
                {selectedFeedback.hasIdAttachment ? (
                  <button
                    type="button"
                    onClick={() => setIdModalOpen(true)}
                    className="w-full flex items-center gap-2.5 p-3 rounded-lg border border-border bg-background hover:bg-muted/40 transition-colors text-left"
                  >
                    <FileImage size={20} className="text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-foreground truncate">View Valid ID / Clearance</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1"><ZoomIn size={11} /> Full-screen preview</div>
                    </div>
                  </button>
                ) : (
                  <div className="p-3 text-xs text-muted-foreground text-center bg-muted/20 rounded-lg border border-border">
                    No valid ID attached
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2 border-t border-border">
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Participation eligibility</div>
                  {selectedFeedback.eligibility_status === 'Pending' && selectedFeedback.canReviewEligibility && <div className="flex gap-2">
                    <button onClick={() => handleAction(selectedFeedback._id, 'eligibility', 'approve')} className="flex-1 py-2 px-3 bg-primary text-primary-foreground font-semibold text-xs rounded-lg"><Check size={14} className="inline mr-1" />Approve eligibility</button>
                    <button onClick={() => handleAction(selectedFeedback._id, 'eligibility', 'request_rejection')} className="flex-1 py-2 px-3 bg-destructive/10 text-destructive border border-destructive/20 font-semibold text-xs rounded-lg"><X size={14} className="inline mr-1" />Request rejection</button>
                  </div>}
                  {selectedFeedback.eligibility_status === 'RejectionRequested' && selectedFeedback.canReviewEligibility && <div className="flex gap-2">
                    <button onClick={() => handleAction(selectedFeedback._id, 'eligibility', 'confirm_rejection', 'approve')} className="flex-1 py-2 px-3 bg-primary text-primary-foreground font-semibold text-xs rounded-lg">Uphold citizen submission</button>
                    <button onClick={() => handleAction(selectedFeedback._id, 'eligibility', 'confirm_rejection', 'reject')} className="flex-1 py-2 px-3 bg-destructive/10 text-destructive border border-destructive/20 font-semibold text-xs rounded-lg">Confirm rejection</button>
                  </div>}
                  {selectedFeedback.eligibility_status === 'AppealPending' && selectedFeedback.canReviewEligibility && <div className="flex gap-2">
                    <button onClick={() => handleAction(selectedFeedback._id, 'eligibility', 'resolve_appeal', 'approve')} className="flex-1 py-2 px-3 bg-primary text-primary-foreground font-semibold text-xs rounded-lg">Grant appeal</button>
                    <button onClick={() => handleAction(selectedFeedback._id, 'eligibility', 'resolve_appeal', 'reject')} className="flex-1 py-2 px-3 bg-destructive/10 text-destructive border border-destructive/20 font-semibold text-xs rounded-lg">Deny appeal</button>
                  </div>}
                  {selectedFeedback.appealReviewerUnavailableEligibility && <p role="alert" className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">No active Secretary or System Admin who is uninvolved in the earlier decision is available. Arrange another eligible reviewer account before resolving this appeal. Vice Mayor and SB Member accounts remain view-only.</p>}
                  {!selectedFeedback.canReviewEligibility && !selectedFeedback.appealReviewerUnavailableEligibility && <p className="text-[11px] text-muted-foreground">Assigned to another reviewer until the review deadline. Then another reviewer can take over.</p>}
                </div>
                {selectedFeedback.comment && <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Comment visibility</div>
                  {selectedFeedback.comment_status === 'Pending' && selectedFeedback.canReviewComment && <div className="flex gap-2">
                    <button onClick={() => handleAction(selectedFeedback._id, 'comment', 'approve')} className="flex-1 py-2 px-3 bg-primary text-primary-foreground font-semibold text-xs rounded-lg">Approve comment</button>
                    <button onClick={() => handleAction(selectedFeedback._id, 'comment', 'request_rejection')} className="flex-1 py-2 px-3 bg-destructive/10 text-destructive border border-destructive/20 font-semibold text-xs rounded-lg">Request hiding</button>
                  </div>}
                  {selectedFeedback.comment_status === 'Approved' && selectedFeedback.canReviewComment && <button onClick={() => handleAction(selectedFeedback._id, 'comment', 'request_rejection')} className="w-full py-2 px-3 bg-destructive/10 text-destructive border border-destructive/20 font-semibold text-xs rounded-lg">Request hiding (second review required)</button>}
                  {selectedFeedback.comment_status === 'RejectionRequested' && selectedFeedback.canReviewComment && <div className="flex gap-2">
                    <button onClick={() => handleAction(selectedFeedback._id, 'comment', 'confirm_rejection', 'approve')} className="flex-1 py-2 px-3 bg-primary text-primary-foreground font-semibold text-xs rounded-lg">Keep comment visible</button>
                    <button onClick={() => handleAction(selectedFeedback._id, 'comment', 'confirm_rejection', 'reject')} className="flex-1 py-2 px-3 bg-destructive/10 text-destructive border border-destructive/20 font-semibold text-xs rounded-lg">Confirm hiding</button>
                  </div>}
                  {selectedFeedback.comment_status === 'AppealPending' && selectedFeedback.canReviewComment && <div className="flex gap-2">
                    <button onClick={() => handleAction(selectedFeedback._id, 'comment', 'resolve_appeal', 'approve')} className="flex-1 py-2 px-3 bg-primary text-primary-foreground font-semibold text-xs rounded-lg">Grant appeal</button>
                    <button onClick={() => handleAction(selectedFeedback._id, 'comment', 'resolve_appeal', 'reject')} className="flex-1 py-2 px-3 bg-destructive/10 text-destructive border border-destructive/20 font-semibold text-xs rounded-lg">Deny appeal</button>
                  </div>}
                  {selectedFeedback.comment_status === 'Rejected' && <p className="text-[11px] text-muted-foreground">This comment is hidden following independent review. The original text and decision history remain in the private record.</p>}
                  {selectedFeedback.appealReviewerUnavailableComment && <p role="alert" className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">No active Secretary or System Admin who is uninvolved in the earlier decision is available. Arrange another eligible reviewer account before resolving this appeal. Vice Mayor and SB Member accounts remain view-only.</p>}
                  {!selectedFeedback.canReviewComment && !selectedFeedback.appealReviewerUnavailableComment && <p className="text-[11px] text-muted-foreground">Comment is awaiting a separate reviewer.</p>}
                </div>}
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-12 text-center text-xs text-muted-foreground shadow-xs">
              Select a submission to view its comment, vote, identity details, and private ID attachment.
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal isOpen={idModalOpen} onClose={() => { setIdModalOpen(false); setIdAttachmentUrl(''); setIdAttachmentError(''); }} title="Resident ID" size="lg">
        {idAttachmentLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading secure attachment…</div>
        ) : idAttachmentUrl ? (
          <div className="space-y-3">
            <img src={idAttachmentUrl} alt="Resident identification document" className="w-full max-h-[70vh] object-contain rounded-md bg-muted" />
            <a href={idAttachmentUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">Open original / download</a>
          </div>
        ) : idAttachmentError ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <p>{idAttachmentError}</p>
            <button
              type="button"
              onClick={() => setIdAttachmentRetry((attempt) => attempt + 1)}
              className="mt-4 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/40"
            >
              Try again
            </button>
          </div>
        ) : selectedFeedback?.hasIdAttachment ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Select the attachment again to load it.</div>
        ) : (
          <div className="py-12 text-center text-sm text-muted-foreground">No attachment is available.</div>
        )}
      </Modal>

      <Modal isOpen={confirmModal.open} onClose={() => setConfirmModal({ open: false, id: null, area: 'eligibility', action: 'approve', appealOutcome: null, bulk: false })} title="Confirm Review Decision">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {confirmModal.action === 'request_rejection' ? 'Request an independent reviewer to consider rejection/hiding?' : confirmModal.action === 'resolve_appeal' ? `Finalize the ${confirmModal.appealOutcome === 'approve' ? 'appeal approval' : 'appeal denial'}?` : confirmModal.action === 'confirm_rejection' ? `Finalize the independent decision to ${confirmModal.appealOutcome === 'approve' ? 'keep this submission visible' : 'reject or hide it'}?` : `Approve ${confirmModal.bulk ? `${selectedIds.length} participation records` : confirmModal.area === 'comment' ? 'this comment for public display' : 'this participation record'}?`}
          </p>
          {(confirmModal.action === 'request_rejection' || confirmModal.action === 'confirm_rejection' || confirmModal.action === 'resolve_appeal') && <label className="block space-y-1 text-xs font-semibold text-foreground">Reason (required, at least 8 characters)<textarea value={reviewReason} onChange={(e) => setReviewReason(e.target.value)} maxLength={1000} rows={3} className="w-full rounded-md border border-input bg-background p-2 text-xs" /></label>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setConfirmModal({ open: false, id: null, area: 'eligibility', action: 'approve', appealOutcome: null, bulk: false })}
              className="px-3.5 py-1.5 text-xs font-semibold text-foreground bg-background border border-border rounded-md hover:bg-muted/50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={executeAction}
              className={`px-3.5 py-1.5 text-xs font-semibold text-white rounded-md ${
                confirmModal.appealOutcome === 'reject' || confirmModal.action === 'request_rejection' ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'
              }`}
              disabled={(confirmModal.action === 'request_rejection' || confirmModal.action === 'confirm_rejection' || confirmModal.action === 'resolve_appeal') && reviewReason.trim().length < 8}
            >
              Confirm decision
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
