import { useState, useEffect } from 'react';
import { api, createPdfFilename, downloadPdf } from '../utils/api';
import PageSkeleton from '../components/ui/PageSkeleton';
import { normalizeArray, normalizePaginated } from '../utils/normalizeResponse';
import { Download, FileBarChart, Calendar, GitBranch, X, FileText, Printer, Search } from 'lucide-react';
import { Modal } from '@ibosys/ui';
import { motion } from 'framer-motion';
import { STAGES } from '../constants/stages';

const OrdOptions = ({ value, onChange, termFilter, terms, ords }) => {
  const groups = terms.map(t => ({
    term: t,
    items: ords.filter(o => o.termId === t._id || o.termId?._id === t._id)
  }));
  const matchedIds = new Set(groups.flatMap(g => g.items.map(o => o._id)));
  const ungrouped = ords.filter(o => !matchedIds.has(o._id));
  const filteredGroups = termFilter ? groups.filter(g => g.term._id === termFilter) : groups;
  const showUngrouped = !termFilter && ungrouped.length > 0;
  return (
    <select className="w-full px-3 py-2.5 bg-background border border-input rounded-md text-xs text-foreground outline-none focus:border-primary" value={value} onChange={onChange}>
      {filteredGroups.filter(g => g.items.length > 0).map(g => (
        <optgroup key={g.term._id} label={g.term.label}>
          {g.items.map(o => <option key={o._id} value={o._id}>No. {o.number} – {o.title}</option>)}
        </optgroup>
      ))}
      {showUngrouped && (
        <optgroup label="Other">
          {ungrouped.map(o => <option key={o._id} value={o._id}>No. {o.number} – {o.title}</option>)}
        </optgroup>
      )}
    </select>
  );
};

const SessionOptions = ({ id, value, onChange, termFilter, terms, sessions, search }) => {
  const getSessionTerm = (session) => {
    const directTermId = session.termId?._id || session.termId;
    if (directTermId) return terms.find(term => term._id === directTermId);
    const year = new Date(session.date).getFullYear();
    return terms.find(term => year >= Number(term.startYear) && year <= Number(term.endYear));
  };
  const matchesSearch = (session) => [session.title, session.sessionNumber, session.sessionType, session.date]
    .filter(Boolean).join(' ').toLowerCase().includes(search.trim().toLowerCase());
  const groups = terms.map(t => ({ term: t, items: sessions.filter(s => getSessionTerm(s)?._id === t._id && matchesSearch(s)) }));
  const matchedIds = new Set(groups.flatMap(g => g.items.map(s => s._id)));
  const ungrouped = sessions.filter(s => !matchedIds.has(s._id));
  const filteredGroups = termFilter ? groups.filter(g => g.term._id === termFilter) : groups;
  const showUngrouped = !termFilter && ungrouped.length > 0;
  return (
    <select id={id} className="w-full px-3 py-2.5 bg-background border border-input rounded-md text-xs text-foreground outline-none focus:border-primary" value={value} onChange={onChange}>
      <option value="">Select a session</option>
      {filteredGroups.filter(g => g.items.length > 0).map(g => (
        <optgroup key={g.term._id} label={g.term.label}>
          {g.items.map(s => (
            <option key={s._id} value={s._id}>
              {s.title} — {new Date(s.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </option>
          ))}
        </optgroup>
      ))}
      {showUngrouped && (
        <optgroup label="Other">
          {ungrouped.filter(matchesSearch).map(s => (
            <option key={s._id} value={s._id}>
              {s.title} — {new Date(s.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
};

function ReportCard({ icon, iconBg, title, description, children }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-xs flex gap-5">
      <div className={`${iconBg} w-14 h-14 rounded-xl flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-foreground mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{description}</p>
        {children}
      </div>
    </div>
  );
}

export default function Reports() {
  const [ords, setOrds] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [selectedOrd, setSelectedOrd] = useState('');
  const [selectedOrdTimeline, setSelectedOrdTimeline] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [filterTermOrdinance, setFilterTermOrdinance] = useState('');
  const [filterTermTimeline, setFilterTermTimeline] = useState('');
  const [filterTermSession, setFilterTermSession] = useState('');
  const [searchSession, setSearchSession] = useState('');
  
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [selectedStages, setSelectedStages] = useState(STAGES);

  const [dlState, setDlState] = useState({ type: '', loading: false, error: '' });

  useEffect(() => {
    const getAllSessions = async () => {
      const firstPage = normalizePaginated(await api.getSessions({ page: 1, limit: 100 }));
      const remainingPages = await Promise.all(
        Array.from({ length: Math.max(0, firstPage.pages - 1) }, (_, index) =>
          api.getSessions({ page: index + 2, limit: 100 })
        )
      );
      return [...firstPage.docs, ...remainingPages.flatMap(response => normalizePaginated(response).docs)];
    };
    Promise.all([
      api.getOrdinances('limit=9999'),
      getAllSessions(),
      api.getTerms()
    ]).then(([ordData, sessData, termData]) => {
      const ords   = normalizeArray(ordData);
      const sess   = normalizeArray(sessData);
      const terms2 = normalizeArray(termData);
      setOrds(ords);
      setTerms(terms2);
      if (ords.length > 0) {
        setSelectedOrd(ords[0]._id);
        setSelectedOrdTimeline(ords[0]._id);
      }
      setSessions(sess);
      if (sess.length > 0) setSelectedSession(sess[0]._id);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleDownload = async (type) => {
    setDlState({ type, loading: true, error: '' });
    try {
      if (type === 'annual') {
        await downloadPdf(api.getAnnualReport(year), createPdfFilename('Annual Legislative Report', year));
      } else if (type === 'committee') {
        if (!selectedOrd) throw new Error('Please select an ordinance');
        const ord = ords.find(o => o._id === selectedOrd);
        await downloadPdf(api.getCommitteeReport(selectedOrd), createPdfFilename('Committee Report', ord.number, ord.title));
      } else if (type === 'participation') {
        if (!selectedOrd) throw new Error('Please select an ordinance');
        const ord = ords.find(o => o._id === selectedOrd);
        await downloadPdf(api.getParticipationReport(selectedOrd), createPdfFilename('Consultation Participation Report', ord.number, ord.title));
      } else if (type === 'minutes') {
        if (!selectedSession) throw new Error('Please select a session');
        const sess = sessions.find(s => s._id === selectedSession);
        const sessionDate = sess?.date && !Number.isNaN(new Date(sess.date).getTime())
          ? new Date(sess.date).toISOString().slice(0, 10)
          : undefined;
        await downloadPdf(api.getSessionPdf(selectedSession), createPdfFilename('Official Minutes', sess?.title, sessionDate));
      } else if (type === 'timeline') {
        if (!selectedOrdTimeline) throw new Error('Please select an ordinance');
        const ord = ords.find(o => o._id === selectedOrdTimeline);
        const stagesQuery = selectedStages.length === STAGES.length ? '' : `?stages=${encodeURIComponent(selectedStages.join(','))}`;
        await downloadPdf(api.getTimelineReport(selectedOrdTimeline + stagesQuery), createPdfFilename('Legislative Timeline Report', ord.number, ord.title));
        setShowTimelineModal(false);
      }
    } catch (err) {
      setDlState(p => ({ ...p, error: err.message }));
    } finally {
      setDlState(p => ({ ...p, loading: false }));
    }
  };

  if (loading) {
    return <PageSkeleton variant="form" />;
  }

  const selectCls = "px-3 py-2.5 bg-background border border-input rounded-md text-xs text-foreground outline-none focus:border-primary min-w-[120px]";
  const btnCls = "inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Official Reports</h2>
        <p className="text-sm text-muted-foreground mt-1">Generate and download automated PDF reports for transparency and official record-keeping.</p>
      </div>

      {dlState.error && (
        <div className="p-3 bg-destructive/10 text-destructive text-xs font-medium rounded-lg border border-destructive/20 flex items-center justify-between">
          <span>{dlState.error}</span>
          <button type="button" aria-label="Dismiss error" onClick={() => setDlState(p => ({...p, error: ''}))} className="ml-3"><X size={14} /></button>
        </div>
      )}

      <div className="space-y-4">
        {/* Annual Report */}
        <ReportCard
          icon={<Calendar size={26} className="text-primary" />}
          iconBg="bg-primary/10"
            title="Annual Legislative Documents Report"
            description="A year-end summary of non-draft ordinances and resolutions filed during a Philippine calendar year, with separate totals by document type and approved status."
        >
          <div className="flex items-center gap-3">
            <select className={selectCls} value={year} onChange={e => setYear(e.target.value)}>
              {[...Array(5)].map((_, i) => {
                const y = new Date().getFullYear() - i;
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>
            <button className={btnCls} onClick={() => handleDownload('annual')} disabled={dlState.loading && dlState.type === 'annual'}>
              <Download size={13} /> {dlState.loading && dlState.type === 'annual' ? 'Generating…' : 'Download PDF'}
            </button>
          </div>
        </ReportCard>

        {/* Timeline Report */}
        <ReportCard
          icon={<GitBranch size={26} className="text-amber-600" />}
          iconBg="bg-amber-50"
          title="Legislative Timeline Report"
          description="A full printable report of every legislative stage an ordinance has passed through — including dates, stage remarks, linked sessions, who recorded each step, and the Committee Hearing Report with findings and recommendation."
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Filter by Term</label>
              <select className={selectCls + " w-full"} value={filterTermTimeline} onChange={e => setFilterTermTimeline(e.target.value)}>
                <option value="">All Terms</option>
                {terms.map(t => <option key={t._id} value={t._id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Select Ordinance</label>
              <OrdOptions ords={ords} terms={terms} value={selectedOrdTimeline} onChange={e => setSelectedOrdTimeline(e.target.value)} termFilter={filterTermTimeline} />
            </div>
            <button className={btnCls} onClick={() => setShowTimelineModal(true)} disabled={dlState.loading && dlState.type === 'timeline'}>
              <Printer size={13} /> Select &amp; Print
            </button>
          </div>
        </ReportCard>

        {/* Committee Report */}
        <ReportCard
          icon={<FileBarChart size={26} className="text-purple-600" />}
          iconBg="bg-purple-50"
          title="Committee Hearing Report"
          description="Consolidates public consultation results, citizen feedback sentiment analysis, and committee findings and recommendations for a specific ordinance. Required for Second Reading."
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Filter by Term</label>
              <select className={selectCls + " w-full"} value={filterTermOrdinance} onChange={e => setFilterTermOrdinance(e.target.value)}>
                <option value="">All Terms</option>
                {terms.map(t => <option key={t._id} value={t._id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Select Ordinance</label>
              <OrdOptions ords={ords} terms={terms} value={selectedOrd} onChange={e => setSelectedOrd(e.target.value)} termFilter={filterTermOrdinance} />
            </div>
            <button className={btnCls} onClick={() => handleDownload('committee')} disabled={dlState.loading && dlState.type === 'committee'}>
              <Download size={13} /> {dlState.loading && dlState.type === 'committee' ? 'Generating…' : 'Download PDF'}
            </button>
          </div>
        </ReportCard>

        {/* Session Minutes Report */}
        <ReportCard
          icon={<FileText size={26} className="text-indigo-600" />}
          iconBg="bg-indigo-50"
          title="Session Minutes Report"
          description="Generate and download the official minutes of any recorded plenary session, including roll call attendance, all agenda items, and linked ordinances discussed during the session."
        >
          {sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No sessions recorded yet. Create a session from the Sessions &amp; Minutes page first.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              <div>
                <label htmlFor="minutes-term-filter" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Filter by Term</label>
                <select id="minutes-term-filter" className={selectCls + " w-full"} value={filterTermSession} onChange={e => { setFilterTermSession(e.target.value); setSelectedSession(''); }}>
                  <option value="">All Terms</option>
                  {terms.map(t => <option key={t._id} value={t._id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="minutes-session-search" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Search Sessions</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input id="minutes-session-search" className={selectCls + " w-full pl-8"} value={searchSession} onChange={e => { setSearchSession(e.target.value); setSelectedSession(''); }} placeholder="Title, number, or date..." />
                </div>
              </div>
              <div>
                <label htmlFor="minutes-session-select" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Select Session</label>
                <SessionOptions id="minutes-session-select" sessions={sessions} terms={terms} value={selectedSession} onChange={e => setSelectedSession(e.target.value)} termFilter={filterTermSession} search={searchSession} />
              </div>
              <button className={btnCls} onClick={() => handleDownload('minutes')} disabled={!selectedSession || (dlState.loading && dlState.type === 'minutes')}>
                <Download size={13} /> {dlState.loading && dlState.type === 'minutes' ? 'Generating…' : 'Download PDF'}
              </button>
            </div>
          )}
        </ReportCard>
      </div>

      {/* Timeline Stage Selection Modal */}
      <Modal isOpen={showTimelineModal} onClose={() => setShowTimelineModal(false)} title="Select Stages to Print">
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">Choose which legislative stages to include in the timeline printout. By default, all stages are selected.</p>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {STAGES.map(s => {
              const checked = selectedStages.includes(s);
              return (
                <label key={s} className="flex items-center gap-3 p-2.5 rounded-lg bg-background border border-border cursor-pointer hover:bg-muted/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      if (checked) setSelectedStages(p => p.filter(x => x !== s));
                      else setSelectedStages(p => [...p, s]);
                    }}
                    className="accent-primary"
                  />
                  <span className="text-xs font-medium text-foreground">{s}</span>
                </label>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button type="button" onClick={() => setSelectedStages(STAGES.every(stage => selectedStages.includes(stage)) ? [] : STAGES)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
              {STAGES.every(stage => selectedStages.includes(stage)) ? 'Unselect All' : 'Select All'}
            </button>
            <button
              type="button"
              onClick={() => handleDownload('timeline')}
              disabled={selectedStages.length === 0 || dlState.loading}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground font-semibold text-xs rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              <Download size={13} /> {dlState.loading ? 'Generating…' : 'Download PDF'}
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
