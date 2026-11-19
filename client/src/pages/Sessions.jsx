import { useState, useEffect, useCallback } from 'react';
import { api, viewPdf } from '../utils/api';
import { normalizeArray, normalizePaginated } from '../utils/normalizeResponse';
import { Plus, Archive, FileText, Edit, Trash2, Search, X, Calendar, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import RichTextEditor from '../components/ui/RichTextEditor';
import { Pagination } from '@ibosys/ui';
import SpellCheckModal from '../components/features/SpellCheckModal';
import { useSpellCheck } from '../hooks/useSpellCheck';
import PageSkeleton from '../components/ui/PageSkeleton';

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [attendancePage, setAttendancePage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSessionType, setFilterSessionType] = useState('');
  const ITEMS_PER_PAGE = 10;
  const ATTENDANCE_ITEMS_PER_PAGE = 8;
  
  const DEFAULT_FORM = {
    title: '',
    sessionNumber: '',
    sessionType: 'Regular Session',
    legislativeBody: '12th Sangguniang Bayan',
    venue: 'Sangguniang Bayan Session Hall, 2nd Floor, Executive and Legislative Building, Poblacion, Bongabong, Oriental Mindoro',
    municipality: 'Bongabong, Oriental Mindoro',
    date: '',
    callToOrder: '',
    invocation: '',
    rollCall: '',
    readingOfPreviousMinutes: '',
    orderOfBusiness: '',
    privilegeHour: '',
    citizensHour: '',
    questionHour: '',
    committeeReport: '',
    firstReading: '',
    unfinishedBusiness: '',
    referralForAction: '',
    referralForReference: '',
    otherMatters: '',
    thanksgivingPrayer: '',
    adjournment: '',
    status: 'Draft'
  };

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  
  const [ordinances, setOrdinances] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [terms, setTerms] = useState([]);
  const [attendance, setAttendance] = useState({ present: [], onOfficialBusiness: [], absent: [] });
  const [editId, setEditId] = useState(null);
  
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, title: '' });
  const [submitting, setSubmitting] = useState(false);
  const [spellModal, setSpellModal] = useState({ isOpen: false, issues: [] });
  const { checkFields } = useSpellCheck();

  const loadSessions = useCallback(() => {
    setLoading(true);
    const query = new URLSearchParams({ page: String(page), limit: String(ITEMS_PER_PAGE), search: search.trim() });
    if (filterTerm) query.set('termId', filterTerm);
    if (filterStatus) query.set('status', filterStatus);
    if (filterSessionType) query.set('sessionType', filterSessionType);
    const params = query.toString();
    api.getSessions(params)
      .then(res => {
        const result = normalizePaginated(res);
        setSessions(result.docs);
        setTotalPages(result.pages);
        if (page > result.pages) setPage(result.pages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search, filterTerm, filterStatus, filterSessionType]);

  const loadMetadata = useCallback(() => {
    api.getOrdinances('limit=9999').then(res => setOrdinances(normalizeArray(res))).catch(console.error);
    api.getTerms().then(res => setTerms(normalizeArray(res))).catch(console.error);
    api.getSBMembers('limit=0').then(res => setMembers(normalizeArray(res))).catch(console.error);
  }, []);

  useEffect(() => { 
    loadSessions();
    loadMetadata(); 
  }, [loadSessions, loadMetadata]);

  const currentTerm = terms.find(term => term.isCurrent);
  const attendanceMembers = currentTerm
    ? members.filter(member => member.termId === currentTerm._id)
    : [];
  const paginatedAttendanceMembers = attendanceMembers.slice(
    (attendancePage - 1) * ATTENDANCE_ITEMS_PER_PAGE,
    attendancePage * ATTENDANCE_ITEMS_PER_PAGE
  );

  const handleEdit = async (id) => {
    try {
      setAttendancePage(1);
      setShowModal(true);
      const session = await api.getSession(id);
      if (!session) throw new Error('Session data not found');
      
      const newForm = {
        title: session.title || '',
        sessionNumber: session.sessionNumber || '',
        sessionType: session.sessionType || 'Regular Session',
        legislativeBody: session.legislativeBody || '12th Sangguniang Bayan',
        venue: session.venue || 'Sangguniang Bayan Session Hall, 2nd Floor, Executive and Legislative Building, Poblacion, Bongabong, Oriental Mindoro',
        municipality: session.municipality || 'Bongabong, Oriental Mindoro',
        date: session.date ? new Date(session.date).toISOString().substring(0, 10) : '',
        callToOrder: session.callToOrder || '',
        invocation: session.invocation || '',
        rollCall: session.rollCall || '',
        readingOfPreviousMinutes: session.readingOfPreviousMinutes || '',
        orderOfBusiness: session.orderOfBusiness || '',
        privilegeHour: session.privilegeHour || session.citizensHour || '',
        citizensHour: session.citizensHour || session.privilegeHour || '',
        questionHour: session.questionHour || '',
        committeeReport: session.committeeReport || '',
        firstReading: session.firstReading || '',
        unfinishedBusiness: session.unfinishedBusiness || '',
        referralForAction: session.referralForAction || '',
        referralForReference: session.referralForReference || '',
        otherMatters: session.otherMatters || '',
        thanksgivingPrayer: session.thanksgivingPrayer || '',
        adjournment: session.adjournment || '',
        status: session.status || 'Draft'
      };
      
      setForm(newForm);
      setEditId(id);
      setSelectedItems(session.itemsDiscussed?.map(i => i._id || i) || []);
      
      const att = { present: [], onOfficialBusiness: [], absent: [] };
      if (session.attendance) {
        if (session.attendance.present) att.present = session.attendance.present.map(m => m._id || m);
        if (session.attendance.onOfficialBusiness) att.onOfficialBusiness = session.attendance.onOfficialBusiness.map(m => m._id || m);
        if (session.attendance.absent) att.absent = session.attendance.absent.map(m => m._id || m);
      }
      setAttendance(att);
    } catch(err) {
      setShowModal(false);
      toast.error(err.message || 'Failed to load session details');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // Run spell-check before saving
    toast.loading('Checking spelling…', { id: 'spell-check' });
    const spellFields = [
      { label: 'Session Title', value: form.title },
      { label: 'Session Number', value: form.sessionNumber },
      { label: 'Legislative Body', value: form.legislativeBody },
      { label: 'Venue', value: form.venue },
      { label: 'I. Call to Order', value: form.callToOrder },
      { label: 'II. Invocation', value: form.invocation },
      { label: 'III. Roll Call', value: form.rollCall },
      { label: 'IV. Reading of Previous Minutes', value: form.readingOfPreviousMinutes },
      { label: 'Adoption of Order and Calendar of Business', value: form.orderOfBusiness },
      { label: 'V. Privilege Hour', value: form.privilegeHour },
      { label: 'VI. Question Hour', value: form.questionHour },
      { label: 'VII. Committee Report', value: form.committeeReport },
      { label: 'VIII-A. First Reading', value: form.firstReading },
      { label: 'VIII-B. Unfinished Business', value: form.unfinishedBusiness },
      { label: 'VIII-C. Referral of Measures', value: form.referralForAction },
      { label: 'IX. For Reference and Information', value: form.referralForReference },
      { label: 'X. Other Matters', value: form.otherMatters },
      { label: 'XI. Thanksgiving Prayer', value: form.thanksgivingPrayer },
      { label: 'XII. Adjournment', value: form.adjournment },
    ];
    const issues = await checkFields(spellFields);
    toast.dismiss('spell-check');
    if (issues.length === 0) {
      executeSave();
    } else {
      setSpellModal({ isOpen: true, issues });
    }
  };

  const executeSave = async () => {
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        citizensHour: form.privilegeHour, // Legacy compatibility fallback
        itemsDiscussed: selectedItems,
        attendance
      };
      
      if (editId) {
        await api.updateSession(editId, payload);
        toast.success('Session minutes updated successfully!');
      } else {
        await api.createSession(payload);
        toast.success('Session minutes saved successfully!');
      }
      
      setShowModal(false);
      setForm(DEFAULT_FORM);
      setSelectedItems([]);
      setAttendance({ present: [], onOfficialBusiness: [], absent: [] });
      setEditId(null);
      loadSessions();
    } catch (err) {
      toast.error(err.message || 'Failed to save session');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    try {
      setSubmitting(true);
      await api.deleteSession(deleteModal.id);
      toast.success('Session deleted successfully');
      setDeleteModal({ show: false, id: null, title: '' });
      loadSessions();
    } catch (err) {
      toast.error(err.message || 'Failed to delete session');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleItem = (id) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  
  const toggleAttendance = (memberId, status) => {
    setAttendance(prev => {
      const newAtt = {
        present: prev.present.filter(id => id !== memberId),
        onOfficialBusiness: prev.onOfficialBusiness.filter(id => id !== memberId),
        absent: prev.absent.filter(id => id !== memberId)
      };
      newAtt[status].push(memberId);
      return newAtt;
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="space-y-6 min-w-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Sessions & Minutes</h2>
          <p className="text-sm text-muted-foreground mt-1">Archive session minutes and link them to discussed ordinances and resolutions.</p>
        </div>
        <button
          onClick={() => {
            setForm(DEFAULT_FORM);
            setSelectedItems([]);
            setAttendance({ present: [], onOfficialBusiness: [], absent: [] });
            setAttendancePage(1);
            setEditId(null);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:bg-primary/90 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} /> Create Minutes
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            aria-label="Search sessions"
            placeholder="Search by session title or date (YYYY-MM-DD)..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all shadow-2xs"
          />
        </div>
        <select aria-label="Filter sessions by term" value={filterTerm} onChange={e => { setFilterTerm(e.target.value); setPage(1); }} className="w-full px-3 py-2.5 bg-card border border-input rounded-lg text-sm text-foreground outline-none focus:border-primary">
          <option value="">All Terms</option>
          {terms.map(term => <option key={term._id} value={term._id}>{term.label}</option>)}
        </select>
        <select aria-label="Filter sessions by publication status" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="w-full px-3 py-2.5 bg-card border border-input rounded-lg text-sm text-foreground outline-none focus:border-primary">
          <option value="">All Publication Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Final">Published</option>
        </select>
        <select aria-label="Filter sessions by type" value={filterSessionType} onChange={e => { setFilterSessionType(e.target.value); setPage(1); }} className="w-full px-3 py-2.5 bg-card border border-input rounded-lg text-sm text-foreground outline-none focus:border-primary">
          <option value="">All Session Types</option>
          <option value="Regular Session">Regular Session</option>
          <option value="Special Session">Special Session</option>
        </select>
      </div>

      {/* Main Table Card */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <PageSkeleton rows={5} />
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Archive size={40} className="mx-auto text-muted-foreground mb-3 opacity-60" />
            <h4 className="text-base font-bold text-foreground">{search.trim() || filterTerm || filterStatus || filterSessionType ? 'No matching sessions' : 'No Sessions Recorded'}</h4>
            <p className="text-sm text-muted-foreground mt-1">{search.trim() || filterTerm || filterStatus || filterSessionType ? 'Try changing or clearing the search filters.' : 'Click "Create Minutes" to build your first session document.'}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 border-b border-border text-xs uppercase font-bold text-muted-foreground tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Session Title</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Publication Status</th>
                    <th className="px-6 py-3.5">Items Discussed</th>
                    <th className="px-6 py-3.5">Recorded By</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sessions.map(s => (
                    <tr key={s._id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar size={15} className="text-primary shrink-0" />
                          <span>{s.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(s.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${s.status === 'Final' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {s.status === 'Final' ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {s.itemsDiscussed?.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {s.itemsDiscussed.map(item => (
                              <span key={item._id || item} className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs font-semibold border border-border/60">
                                {item.number || item}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {s.createdBy?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleEdit(s._id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-background border border-border hover:bg-muted/60 text-foreground font-medium text-xs rounded-md transition-colors cursor-pointer"
                          >
                            <Edit size={13} /> Edit
                          </button>
                          <button
                            onClick={() => viewPdf(api.getSessionPdf(s._id))}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary font-semibold text-xs rounded-md transition-colors cursor-pointer"
                          >
                            <FileText size={13} /> View PDF
                          </button>
                          <button
                            onClick={() => setDeleteModal({ show: true, id: s._id, title: s.title })}
                            className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
                            title="Delete Session"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Minutes Builder Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 bg-black/40 backdrop-blur-xs overflow-y-auto">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="sessions-minutes-title"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="w-full max-w-4xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col my-8 max-h-[85vh]"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
                <div>
                  <h3 id="sessions-minutes-title" className="text-base font-bold text-foreground tracking-tight">
                    {editId ? 'Edit Session Minutes' : 'Create Session Minutes'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Sangguniang Bayan official legislative record</p>
                </div>
                <button
                  type="button"
                  aria-label="Close session minutes dialog"
                  onClick={() => setShowModal(false)}
                  className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                  {/* Session Heading Metadata */}
                  <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Session Heading & Venue</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                          Session Title *
                        </label>
                        <input
                          placeholder="e.g. 47th Regular Session"
                          value={form.title}
                          spellCheck={true}
                          onChange={e => setForm({...form, title: e.target.value})}
                          required
                          className="w-full px-3.5 py-2.5 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                          Date *
                        </label>
                        <input
                          type="date"
                          value={form.date}
                          onChange={e => setForm({...form, date: e.target.value})}
                          required
                          className="w-full px-3.5 py-2.5 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                          Session Number
                        </label>
                        <input
                          placeholder="e.g. 47th"
                          value={form.sessionNumber}
                          spellCheck={true}
                          onChange={e => setForm({...form, sessionNumber: e.target.value})}
                          className="w-full px-3.5 py-2.5 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                          Session Type
                        </label>
                        <select
                          value={form.sessionType}
                          onChange={e => setForm({...form, sessionType: e.target.value})}
                          className="w-full px-3.5 py-2.5 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                        >
                          <option value="Regular Session">Regular Session</option>
                          <option value="Special Session">Special Session</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                          Council / Legislative Body
                        </label>
                        <input
                          placeholder="e.g. 12th Sangguniang Bayan"
                          value={form.legislativeBody}
                          spellCheck={true}
                          onChange={e => setForm({...form, legislativeBody: e.target.value})}
                          className="w-full px-3.5 py-2.5 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                        Venue
                      </label>
                      <input
                        placeholder="e.g. Sangguniang Bayan Session Hall, 2nd Floor, Executive and Legislative Building, Poblacion, Bongabong, Oriental Mindoro"
                        value={form.venue}
                        spellCheck={true}
                        onChange={e => setForm({...form, venue: e.target.value})}
                        className="w-full px-3.5 py-2.5 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  {/* Attendance Matrix */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2 flex items-center gap-1.5">
                      <Users size={14} className="text-primary" /> Attendance Roll
                    </label>
                    <div className="border border-border rounded-lg overflow-hidden bg-background">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-muted/50 border-b border-border font-bold text-muted-foreground uppercase">
                            <tr>
                              <th className="p-3">Member</th>
                              <th className="p-3 text-center">Present</th>
                              <th className="p-3 text-center">Official Business</th>
                              <th className="p-3 text-center">Absent</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {paginatedAttendanceMembers.map(m => (
                              <tr key={m._id} className="hover:bg-muted/10">
                                <td className="p-3 font-medium text-foreground">{m.name || `${m.firstName} ${m.lastName}`} – <span className="text-muted-foreground">{m.position}</span></td>
                                <td className="p-3 text-center"><input type="radio" name={`att-${m._id}`} checked={attendance.present.includes(m._id)} onChange={() => toggleAttendance(m._id, 'present')} className="accent-primary" /></td>
                                <td className="p-3 text-center"><input type="radio" name={`att-${m._id}`} checked={attendance.onOfficialBusiness.includes(m._id)} onChange={() => toggleAttendance(m._id, 'onOfficialBusiness')} className="accent-primary" /></td>
                                <td className="p-3 text-center"><input type="radio" name={`att-${m._id}`} checked={attendance.absent.includes(m._id)} onChange={() => toggleAttendance(m._id, 'absent')} className="accent-primary" /></td>
                              </tr>
                            ))}
                            {attendanceMembers.length === 0 && (
                              <tr>
                                <td colSpan="4" className="p-4 text-center text-muted-foreground">No current-term members available.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <Pagination
                        currentPage={attendancePage}
                        totalPages={Math.ceil(attendanceMembers.length / ATTENDANCE_ITEMS_PER_PAGE)}
                        onPageChange={setAttendancePage}
                        className="px-4 py-3"
                      />
                    </div>
                  </div>

                  {/* Rich Text Minutes Sections */}
                  {[
                    { key: 'callToOrder', label: 'I. Call to Order' },
                    { key: 'invocation', label: 'II. Invocation, National Anthem and Bongabong Hymn' },
                    { key: 'rollCall', label: 'III. Roll Call & Quorum' },
                    { key: 'readingOfPreviousMinutes', label: 'IV. Reading & Adoption of Previous Minutes' },
                    { key: 'orderOfBusiness', label: 'Adoption of the Order and Calendar of Business (Optional)' },
                    { key: 'privilegeHour', label: 'V. Privilege Hour' },
                    { key: 'questionHour', label: 'VI. Question Hour' },
                    { key: 'committeeReport', label: 'VII. Committee Report' },
                    { key: 'firstReading', label: 'VIII. Reference of Business — A. First Reading' },
                    { key: 'unfinishedBusiness', label: 'VIII. Reference of Business — B. Unfinished Business' },
                    { key: 'referralForAction', label: 'VIII. Reference of Business — C. Referral Business of Measures and Communication' },
                    { key: 'referralForReference', label: 'IX. For Reference and Information / Communications' },
                    { key: 'otherMatters', label: 'X. Other Matters' },
                    { key: 'thanksgivingPrayer', label: 'XI. Thanksgiving Prayer' },
                    { key: 'adjournment', label: 'XII. Adjournment' }
                  ].map(section => (
                    <div key={section.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-foreground">{section.label}</label>
                        {section.key === 'privilegeHour' && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">Replaces Citizen's Hour</span>
                        )}
                      </div>
                      <RichTextEditor value={form[section.key]} onChange={val => setForm({...form, [section.key]: val})} placeholder={`Enter ${section.label}...`} minHeight={100} />
                    </div>
                  ))}

                  {/* Status & Discussed Items */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">Publication Status</label>
                      <select
                        className="w-full px-3.5 py-2.5 bg-background border border-input rounded-md text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                        value={form.status}
                        onChange={e => setForm({...form, status: e.target.value})}
                      >
                        <option value="Draft">Draft (Internal Only)</option>
                        <option value="Final">Publish to Public Portal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">Linked Ordinances / Resolutions</label>
                      <div className="max-h-36 overflow-y-auto border border-border rounded-md p-2 bg-background space-y-1">
                        {ordinances.map(o => (
                          <label key={o._id} className="flex items-center gap-2 p-1 text-xs text-foreground hover:bg-muted/40 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(o._id)}
                              onChange={() => toggleItem(o._id)}
                              className="accent-primary"
                            />
                            <span className="truncate"><strong>[{o.type}] {o.number}</strong> - {o.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-background border border-border rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {submitting
                      ? (form.status === 'Final' ? 'Publishing…' : 'Saving draft…')
                      : (form.status === 'Final' ? 'Publish Minutes' : 'Save Draft')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Delete Modal */}
        {deleteModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl p-6 space-y-4"
            >
              <h3 className="text-base font-bold text-foreground">Delete Session Record</h3>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete <strong className="text-foreground">{deleteModal.title}</strong>? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeleteModal({ show: false, id: null, title: '' })}
                  disabled={submitting}
                  className="px-3.5 py-1.5 text-xs font-semibold text-foreground bg-background border border-border rounded-md hover:bg-muted/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={submitting}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-destructive rounded-md hover:bg-destructive/90 transition-colors"
                >
                  {submitting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Pre-Save Spell Check Modal */}
        <SpellCheckModal
          isOpen={spellModal.isOpen}
          issues={spellModal.issues}
          isSaving={submitting}
          onClose={() => setSpellModal({ isOpen: false, issues: [] })}
          onSaveAnyway={() => {
            setSpellModal({ isOpen: false, issues: [] });
            executeSave();
          }}
        />
      </AnimatePresence>
    </motion.div>
  );
}
