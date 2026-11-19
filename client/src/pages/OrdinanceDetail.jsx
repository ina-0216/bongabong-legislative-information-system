import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, cloudinaryPdfDownloadUrl, createPdfFilename, downloadPdf } from '../utils/api';
import PageSkeleton from '../components/ui/PageSkeleton';
import { normalizeArray } from '../utils/normalizeResponse';
import { useAuth } from '../context/AuthContext';
import { Badge } from '@ibosys/ui';
import { normalizeStatus } from '../constants/stages';
import CommitteeBadge from '../components/features/CommitteeBadge';
import TypeBadge from '../components/features/TypeBadge';
import OrdinanceTimeline from '../components/features/OrdinanceTimeline';
import SentimentChart from '../components/features/SentimentChart';
import OrdinanceOverviewTab from '../components/tabs/OrdinanceOverviewTab';
import CommitteeReportTab from '../components/tabs/CommitteeReportTab';
import ConsultationTab from '../components/tabs/ConsultationTab';
import { Modal } from '@ibosys/ui';
import { ArrowLeft, AlertTriangle, Lock, FileEdit, FileText, Printer, Download, Calendar, User, Tag, Landmark, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { STAGES, RESOLUTION_STAGES } from '../constants/stages';

export default function OrdinanceDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ord, setOrd] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [nextStatus, setNextStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [commentFilter, setCommentFilter] = useState({ barangay: '', sentiment: '', search: '' });

  // Committee assignment stage state
  const [assigningCommittee, setAssigningCommittee] = useState(false);
  const [selectedCommittee, setSelectedCommittee] = useState('');
  const [committees, setCommittees] = useState([]);
  const [committeeNotes, setCommitteeNotes] = useState('');

  const [commReport, setCommReport] = useState({ findings: '', recommendation: '', viceSecretaryName: '' });
  const [savingReport, setSavingReport] = useState(false);

  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [selectedStages, setSelectedStages] = useState(STAGES);
  const [printingTimeline, setPrintingTimeline] = useState(false);
  const [openingDocument, setOpeningDocument] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [minutesReference, setMinutesReference] = useState('');
  const [rejectionSessionId, setRejectionSessionId] = useState('');
  const [rejectionVoteTally, setRejectionVoteTally] = useState({ votesFor: '', votesAgainst: '', abstentions: '', absent: '' });
  const [rejectionError, setRejectionError] = useState('');

  const load = useCallback(async () => {
    try {
      const o = await api.getOrdinance(id);
      setOrd(o);
      try {
        const availableSessions = await api.getSessions({ page: 1, limit: 100 });
        setSessions(normalizeArray(availableSessions));
      } catch {
        setSessions([]);
      }
      try {
        let termId = o.termId?._id || o.termId;
        if (!termId) {
          const terms = normalizeArray(await api.getTerms());
          termId = terms.find(term => term.isCurrent)?._id;
        }
        if (termId) {
          const availableCommittees = normalizeArray(await api.getCommittees({ termId }));
          setCommittees(availableCommittees);
        } else {
          setCommittees([]);
        }
      } catch {
        setCommittees([]);
      }
      const stageSet = o.type === 'Resolution' ? RESOLUTION_STAGES : STAGES;
      const nextIdx = stageSet.indexOf(o.status) + 1;
      setNextStatus(o.status === 'Rejected' ? '' : stageSet[nextIdx] || '');
      setSelectedCommittee(o.committee || '');
      if (o.committeeReport) {
        setCommReport({
          findings: o.committeeReport.findings || '',
          recommendation: o.committeeReport.recommendation || '',
          viceSecretaryName: o.committeeReport.viceSecretaryName || ''
        });
      }
    } catch { navigate('/ordinances'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  const loadFeedback = useCallback(async () => {
    try {
      const p = new URLSearchParams(commentFilter).toString();
      const f = await api.getConsultationAnalytics(id, p);
      setFeedback(f);
    } catch (err) { console.error(err); }
  }, [id, commentFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (tab === 'consultation') {
      const t = setTimeout(loadFeedback, 300);
      return () => clearTimeout(t);
    }
  }, [tab, commentFilter, loadFeedback]);

  const isStaff = ['Secretary', 'System Admin'].includes(user?.role);
  const isDraftRecord = ord?.isDraft || ord?.status === 'Draft';
  const isCommitteeStage = ord?.status === 'Committee Assignment';
  const hasCommitteeAssigned = Boolean(ord?.committee && ord.committee.trim() !== '');
  const canSaveCommitteeReport = ord?.type === 'Ordinance' && ord?.status === 'Committee Hearing' && hasCommitteeAssigned;
  const isBlockedByCommittee = isCommitteeStage && !hasCommitteeAssigned;
  const canAdvance = isStaff && !ord?.isLocked && nextStatus && !isBlockedByCommittee;
  const canReject = isStaff && ord?.type === 'Ordinance' && !ord?.isLocked && !isDraftRecord &&
    ['First Reading', 'Committee Assignment', 'Committee Hearing', 'Public Consultation', 'Second Reading', 'Third Reading'].includes(ord?.status);

  const handleAdvance = async () => {
    if (!nextStatus) return;
    if (nextStatus === 'Approved') {
      setShowApproveModal(true);
      return;
    }
    await executeAdvance();
  };

  const executeAdvance = async () => {
    if (!nextStatus) return;
    setAdvancing(true); setError(''); setSuccess('');
    try {
      await api.advanceStatus(id, {
        status: nextStatus,
        notes,
        ...(selectedSessionId ? { sessionId: selectedSessionId } : {}),
      });
      setSuccess(`Status advanced to "${nextStatus}"`);
      setNotes('');
      setSelectedSessionId('');
      setShowApproveModal(false);
      await load();
    } catch (e) { setError(e.message); }
    finally { setAdvancing(false); }
  };

  const closeRejectModal = () => {
    if (rejecting) return;
    setShowRejectModal(false);
    setRejectionReason('');
    setMinutesReference('');
    setRejectionSessionId('');
    setRejectionVoteTally({ votesFor: '', votesAgainst: '', abstentions: '', absent: '' });
    setRejectionError('');
  };

  const handleRecordRejection = async () => {
    if (rejectionReason.trim().length < 8) {
      setRejectionError('Enter the official decision reason (at least 8 characters).');
      return;
    }

    setRejecting(true);
    setRejectionError('');
    try {
      const voteTally = Object.fromEntries(
        Object.entries(rejectionVoteTally)
          .filter(([, value]) => value !== '')
          .map(([key, value]) => [key, Number(value)])
      );
      await api.rejectOrdinance(id, {
        reason: rejectionReason.trim(),
        ...(minutesReference.trim() ? { minutesReference: minutesReference.trim() } : {}),
        ...(rejectionSessionId ? { sessionId: rejectionSessionId } : {}),
        ...(Object.keys(voteTally).length ? { voteTally } : {}),
      });
      setSuccess('The Sangguniang Bayan rejection decision has been recorded.');
      setShowRejectModal(false);
      setRejectionReason('');
      setMinutesReference('');
      setRejectionSessionId('');
      setRejectionVoteTally({ votesFor: '', votesAgainst: '', abstentions: '', absent: '' });
      await load();
    } catch (e) {
      setRejectionError(e.message || 'Unable to record the rejection decision.');
    } finally {
      setRejecting(false);
    }
  };

  const handleAssignCommittee = async () => {
    if (!selectedCommittee) {
      toast.error('Please select a standing committee.');
      return;
    }
    setAssigningCommittee(true);
    try {
      await api.assignCommittee(id, { committee: selectedCommittee, notes: committeeNotes });
      toast.success(`Committee assigned to "${selectedCommittee}"`);
      setCommitteeNotes('');
      await load();
    } catch (e) {
      toast.error(e.message || 'Failed to assign committee.');
    } finally {
      setAssigningCommittee(false);
    }
  };

  const handleTimelineReport = async () => {
    setPrintingTimeline(true);
    try {
      const stagesQuery = selectedStages.length === STAGES.length ? '' : `?stages=${encodeURIComponent(selectedStages.join(','))}`;
      await downloadPdf(api.getTimelineReport(id + stagesQuery), createPdfFilename('Legislative Timeline Report', ord.number, ord.title));
      setShowTimelineModal(false);
    } catch (e) { toast.error(e.message || 'Failed to generate timeline report'); }
    finally { setPrintingTimeline(false); }
  };

  const handleViewGeneratedDocument = async () => {
    // Open synchronously from the click so popup blockers allow the PDF tab.
    const pdfWindow = window.open('', '_blank');
    if (!pdfWindow) {
      toast.error('Allow pop-ups to view the generated document.');
      return;
    }

    setOpeningDocument(true);
    try {
      const pdf = await api.getLegislativeDocumentPdf(ord._id);
      const url = URL.createObjectURL(pdf);
      pdfWindow.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      pdfWindow.close();
      toast.error(e.message || 'Failed to open the generated document.');
    } finally {
      setOpeningDocument(false);
    }
  };

  const handleSaveCommitteeReport = async () => {
    setSavingReport(true);
    try {
      await api.saveCommitteeReport(id, commReport);
      toast.success('Committee report saved successfully!');
      await load();
    } catch (e) {
      toast.error(e.message || 'Failed to save committee report');
    } finally {
      setSavingReport(false);
    }
  };

  if (loading) {
    return <PageSkeleton variant="detail" />;
  }
  if (!ord) return null;

  const isAmended = !!ord.amendedByOrdinanceId;
  const amendsMeasure = ord.amendsOrdinanceId;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="space-y-6 min-w-0">
      {/* Back Navigation */}
      <div>
        <button
          onClick={() => navigate('/ordinances')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Repository
        </button>
      </div>

      {/* Hero Document Header Card */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <TypeBadge type={ord.type} />
              <span className="inline-block font-mono text-[10px] font-bold text-primary bg-primary/8 border border-primary/20 px-1.5 py-0.5 rounded shrink-0 leading-none">
                {ord.number}
              </span>
              {ord.seriesYear && (
                <span className="text-[10px] text-muted-foreground font-semibold">
                  Series of {ord.seriesYear}
                </span>
              )}
              {isDraftRecord && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-800">
                  WORKING DRAFT (UNPUBLISHED)
                </span>
              )}
              {ord.isLocked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-800">
                  <Lock size={10} /> LOCKED (ENACTED / APPROVED)
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-snug">
              {ord.title}
            </h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-2">
              <CommitteeBadge committee={ord.committee || 'Unassigned (Pending Committee Assignment)'} />
              <span className="flex items-center gap-1"><Landmark size={13} /> {ord.termId?.label || 'Term not set'}</span>
              <span className="flex items-center gap-1"><User size={13} /> {ord.proponentId?.name}</span>
              <span className="flex items-center gap-1"><Tag size={13} /> {ord.sectorTag}</span>
              {ord.effectivityDate && (
                <span className="flex items-center gap-1">
                  <Calendar size={13} /> Effectivity: {new Date(ord.effectivityDate).toLocaleDateString('en-PH')}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            {isStaff && !ord.isLocked && ord.status !== 'Rejected' && (
              <Link
                to={`/ordinances/${ord._id}/edit`}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-background border border-border hover:bg-muted/50 text-foreground font-semibold text-xs rounded-lg transition-colors"
              >
                <FileEdit size={13} /> Edit
              </Link>
            )}

            {/* If an official signed PDF was uploaded, link it; otherwise link generated PDF */}
            {ord.pdfUrl ? (
              <>
                <a
                  href={ord.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold text-xs rounded-lg transition-colors"
                >
                  <FileText size={13} /> View Signed Instrument
                </a>
                <a
                  href={cloudinaryPdfDownloadUrl(ord.pdfUrl, createPdfFilename(ord.type, ord.number, ord.title))}
                  download={createPdfFilename(ord.type, ord.number, ord.title)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-background border border-border text-foreground hover:bg-muted/50 font-semibold text-xs rounded-lg transition-colors"
                >
                  <Download size={13} /> Download Signed PDF
                </a>
              </>
            ) : null}

            <button
              type="button"
              onClick={handleViewGeneratedDocument}
              disabled={openingDocument}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-background border border-border text-foreground hover:bg-muted/50 font-semibold text-xs rounded-lg transition-colors"
            >
              <FileText size={13} /> {openingDocument ? 'Opening…' : isDraftRecord ? 'Draft Working Copy' : 'Generated Document'}
            </button>

            <Badge variant="status" status={normalizeStatus(ord.status)} dot size="sm">
              {ord.status || 'Draft'}
            </Badge>
          </div>
        </div>

        {ord.legacyRejection && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900">
            This older record was marked “Rejected” in its adoption result. No formal rejection details were recorded, and the ordinance is treated as a terminal record.
          </div>
        )}
        {isAmended && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-600 shrink-0" />
            <span>
              This measure has been <strong>amended</strong>.{' '}
              <Link to={`/ordinances/${ord.amendedByOrdinanceId._id || ord.amendedByOrdinanceId}`} className="font-semibold underline ml-1">
                View newer version →
              </Link>
            </span>
          </div>
        )}
        {amendsMeasure && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2">
            <FileText size={15} className="text-blue-600 shrink-0" />
            <span>
              This measure amends{' '}
              <Link to={`/ordinances/${amendsMeasure._id || amendsMeasure}`} className="font-semibold underline">
                {amendsMeasure.number || 'an earlier measure'}{amendsMeasure.title ? ` — ${amendsMeasure.title}` : ''}
              </Link>.
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="inline-flex gap-1 p-1 bg-card border border-border rounded-xl">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'timeline', label: 'Legislative Timeline' },
          ...(canSaveCommitteeReport ? [{ id: 'committee-report', label: 'Committee Report' }] : []),
          { id: 'consultation', label: 'Public Consultation' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === t.id
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OrdinanceOverviewTab ord={ord} />}

      {tab === 'timeline' && (
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h4 className="text-sm font-bold uppercase tracking-wider text-foreground">Timeline History</h4>
              <button
                onClick={() => setShowTimelineModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-foreground bg-background border border-border hover:bg-muted/50 rounded-md transition-colors"
              >
                <Printer size={13} /> Print Timeline
              </button>
            </div>
            <OrdinanceTimeline ordinance={ord} />
          </div>

          {/* Committee Assignment Control Card */}
          {isCommitteeStage && isStaff && (
            <div className="bg-card border-2 border-primary/30 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-primary" />
                  <h4 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Committee Assignment Stage Action
                  </h4>
                </div>
                <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  Active Stage
                </span>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                In accordance with Bongabong Sangguniang Bayan rules, committee assignment occurs exclusively at this stage. Select the lead standing committee to handle hearings and deliberations.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                  Select Lead Committee *
                </label>
                <select
                  value={selectedCommittee}
                  onChange={e => setSelectedCommittee(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-background border border-input rounded-md text-xs font-medium text-foreground outline-none focus:border-primary"
                >
                  <option value="">Select a committee…</option>
                  {committees.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Referral Remarks / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Referred jointly with Committee on Legal Matters..."
                  value={committeeNotes}
                  onChange={e => setCommitteeNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-background border border-input rounded-md text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs">
                  {hasCommitteeAssigned ? (
                    <span className="text-emerald-700 font-semibold">
                      ✓ Current Lead Committee: {ord.committee}
                    </span>
                  ) : (
                    <span className="text-destructive font-semibold">
                      ⚠ Committee not yet assigned. Required before stage advancement.
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAssignCommittee}
                  disabled={assigningCommittee}
                  className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {assigningCommittee ? 'Saving…' : hasCommitteeAssigned ? 'Update Committee' : 'Confirm Assignment'}
                </button>
              </div>
            </div>
          )}

          {/* Stage Advancement Card */}
          {isStaff && !ord?.isLocked && nextStatus && (
            <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-foreground border-b border-border pb-3">
                Advance Legislative Stage
              </h4>
              {error && <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-md font-medium">{error}</div>}
              {success && <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-md font-medium">{success}</div>}

              {isBlockedByCommittee && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-md">
                  <strong>Notice:</strong> You must assign a lead standing committee using the form above before you can advance to {nextStatus}.
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Target Next Stage
                </label>
                <input
                  value={nextStatus}
                  readOnly
                  className="w-full px-3.5 py-2 bg-muted/40 border border-input rounded-md text-xs font-bold text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Stage Remarks (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Record this measure’s outcome or remarks at this stage…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-background border border-input rounded-md text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Link Existing Session (Optional)
                </label>
                <select
                  value={selectedSessionId}
                  onChange={e => setSelectedSessionId(e.target.value)}
                  disabled={advancing}
                  className="w-full px-3.5 py-2.5 bg-background border border-input rounded-md text-xs font-medium text-foreground outline-none focus:border-primary disabled:opacity-60"
                >
                  <option value="">No session selected</option>
                  {sessions.map(session => (
                    <option key={session._id} value={session._id}>
                      {session.title} · {session.date ? new Date(session.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date not set'} · {session.status}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  The selected session will be linked to this stage and this measure will be added to its discussed items.
                  {sessions.length === 0 && ' Create a session first from the Sessions page.'}
                </p>
              </div>

              <button
                onClick={handleAdvance}
                disabled={advancing || !canAdvance}
                className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-semibold text-xs rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {advancing ? 'Processing…' : `Advance to "${nextStatus}"`}
              </button>
              {canReject && (
                <button
                  type="button"
                  onClick={() => { setRejectionError(''); setShowRejectModal(true); }}
                  disabled={advancing || rejecting}
                  className="w-full py-2.5 px-4 bg-destructive/10 text-destructive border border-destructive/25 font-semibold text-xs rounded-md hover:bg-destructive/15 transition-colors disabled:opacity-50"
                >
                  Record formal rejection
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'committee-report' && canSaveCommitteeReport && (
        <CommitteeReportTab
          ord={ord}
          commReport={commReport}
          setCommReport={setCommReport}
          savingReport={savingReport}
          saveCommitteeReport={handleSaveCommitteeReport}
        />
      )}

      {tab === 'consultation' && (
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-foreground border-b border-border pb-3">
              Citizen Sentiment
            </h4>
            <SentimentChart tally={feedback?.tally} total={feedback?.total || 0} />
          </div>
          <ConsultationTab
            ord={ord}
            feedback={feedback}
            commentFilter={commentFilter}
            setCommentFilter={setCommentFilter}
            loadingFeedback={false}
          />
        </div>
      )}

      {/* Timeline Print Modal */}
      <Modal isOpen={showTimelineModal} onClose={() => setShowTimelineModal(false)} title="Select Stages to Print">
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">Choose which legislative stages to include in the timeline printout:</p>
          <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto">
            {STAGES.map(s => (
              <label key={s} className="flex items-center gap-2 p-2 bg-background border border-border rounded-md text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedStages.includes(s)}
                  onChange={() => {
                    if (selectedStages.includes(s)) setSelectedStages(p => p.filter(x => x !== s));
                    else setSelectedStages(p => [...p, s]);
                  }}
                  className="accent-primary"
                />
                <span className="font-medium text-foreground">{s}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button type="button" onClick={() => setSelectedStages(STAGES)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
              Select All
            </button>
            <button
              type="button"
              onClick={handleTimelineReport}
              disabled={selectedStages.length === 0 || printingTimeline}
              className="px-4 py-1.5 text-xs font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90"
            >
              {printingTimeline ? 'Generating…' : 'Download PDF'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Pre-Approval Review Modal */}
      <Modal isOpen={showApproveModal} onClose={() => setShowApproveModal(false)} title="Pre-Approval Review & Notice">
        <div className="space-y-4">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-800">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <span>Notice: Formal Document Finalization</span>
            </div>
            <p>
              Advancing this {ord.type?.toLowerCase() || 'measure'} to <strong>Approved</strong> will officially finalize and lock this legislative record.
              Once approved, direct editing is disabled.
            </p>
          </div>

          <div className="bg-muted/40 p-3.5 rounded-lg border border-border space-y-2 text-xs">
            <p className="font-semibold text-foreground">Please double-check the following for accuracy:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Official title, measure numbering, and committee assignment</li>
              <li>Explanatory note, preamble, and legal basis</li>
              <li>Numbered sections, body provisions, and penalty clauses</li>
              <li>Plain-language citizen summary displayed on the public portal</li>
            </ul>
          </div>

          {notes && (
            <div className="text-xs text-muted-foreground bg-background p-2.5 rounded border border-border">
              <span className="font-semibold text-foreground">Stage remarks to record:</span> {notes}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setShowApproveModal(false)}
              className="px-3.5 py-1.5 text-xs font-semibold text-foreground bg-background border border-border rounded-md hover:bg-muted/50 cursor-pointer"
            >
              Go Back &amp; Review
            </button>
            <button
              type="button"
              disabled={advancing}
              onClick={executeAdvance}
              className="px-4 py-1.5 text-xs font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
            >
              {advancing ? 'Approving…' : 'I Have Reviewed — Proceed with Approval'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showRejectModal} onClose={closeRejectModal} title="Record ordinance rejection">
        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-muted-foreground">
            This records the Sangguniang Bayan’s official decision. It does not cast a vote. The ordinance will be marked Rejected at its current stage, <strong className="text-foreground">{ord.status}</strong>, and will no longer advance.
          </div>
          {rejectionError && <div role="alert" className="rounded-md bg-destructive/10 p-3 text-xs font-medium text-destructive">{rejectionError}</div>}
          <div>
            <label htmlFor="rejection-reason" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-foreground">Official decision reason *</label>
            <textarea
              id="rejection-reason"
              rows={3}
              maxLength={2000}
              value={rejectionReason}
              onChange={event => setRejectionReason(event.target.value)}
              placeholder="Summarize the official decision recorded by the Sanggunian…"
              className="w-full rounded-md border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Enter at least 8 characters. This reason will be added to the ordinance timeline.</p>
          </div>
          <div>
            <label htmlFor="rejection-session" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-foreground">Sanggunian session (optional)</label>
            <select
              id="rejection-session"
              value={rejectionSessionId}
              onChange={event => setRejectionSessionId(event.target.value)}
              disabled={rejecting}
              className="w-full rounded-md border border-input bg-background px-3.5 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary disabled:opacity-60"
            >
              <option value="">No session selected</option>
              {sessions.map(session => (
                <option key={session._id} value={session._id}>
                  {session.title} · {session.date ? new Date(session.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date not set'} · {session.status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="rejection-minutes-reference" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-foreground">Minutes reference (optional)</label>
            <input
              id="rejection-minutes-reference"
              value={minutesReference}
              maxLength={300}
              onChange={event => setMinutesReference(event.target.value)}
              placeholder="e.g. 24th Regular Session, item 7"
              className="w-full rounded-md border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-xs font-bold uppercase tracking-wider text-foreground">Vote tally (optional)</legend>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['votesFor', 'Votes for'],
                ['votesAgainst', 'Votes against'],
                ['abstentions', 'Abstentions'],
                ['absent', 'Absent'],
              ].map(([key, label]) => (
                <label key={key} className="space-y-1 text-[11px] font-medium text-muted-foreground">
                  {label}
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    step="1"
                    value={rejectionVoteTally[key]}
                    onChange={event => setRejectionVoteTally(current => ({ ...current, [key]: event.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Enter the figures from the official record. The system does not calculate or determine the vote outcome.</p>
          </fieldset>
          <div className="flex justify-end gap-3 border-t border-border pt-3">
            <button type="button" onClick={closeRejectModal} disabled={rejecting} className="rounded-md border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted/50 disabled:opacity-50">Cancel</button>
            <button type="button" onClick={handleRecordRejection} disabled={rejecting || rejectionReason.trim().length < 8} className="rounded-md bg-destructive px-3.5 py-2 text-xs font-semibold text-white hover:bg-destructive/90 disabled:opacity-50">
              {rejecting ? 'Recording…' : 'Confirm rejection'}
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
