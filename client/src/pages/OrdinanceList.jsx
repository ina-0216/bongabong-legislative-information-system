import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { normalizeArray, normalizePaginated } from '../utils/normalizeResponse';
import PageSkeleton from '../components/ui/PageSkeleton';
import { useAuth } from '../context/AuthContext';
import { Badge } from '@ibosys/ui';
import { normalizeStatus, STAGES as CANONICAL_STAGES } from '../constants/stages';
import CommitteeBadge from '../components/features/CommitteeBadge';
import TypeBadge from '../components/features/TypeBadge';
import OrdinanceCard from '../components/features/OrdinanceCard';
import { Pagination } from '@ibosys/ui';
import { Search, Plus, X, FileText, Scroll, LayoutGrid, Table2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

// Leading '' is the "All Stages" option slot for the filter dropdown.
const STAGES = ['', ...CANONICAL_STAGES, 'Rejected'];

const COMMITTEES = [
  '',
  'Committee on Appropriation, Infrastructure and Power and Energy',
  'Committee on Education, Culture and Arts, Legal Matters, House Rules, Ordinances, Technical and Vocational Education, Good Governance, Public Ethics and Accountability',
  'Committee on Health, Livelihood and Civil Society Organizations',
  'Committee on Environment, Grievances, Human Rights, Cooperative, Market and Economic Enterprise',
  'Committee on Agriculture and Games and Amusement',
  'Committee on Tourism, Transportation, Peace and Order and Beautification',
  'Committee on Social Welfare, Disaster Risk Reduction and Management and Community Driven Development',
  'Committee on Ways and Means, Trade and Industry, Land Use, Labor and Human Resource, Overseas Filipino Workers, Oversight and Sisterhood',
  'Committee on Youth and Sports Development, Science and Technology and Information and Communication Technology',
  'Committee on Barangay Affairs',
];



export default function OrdinanceList() {
  const { user } = useAuth();
  const [ords, setOrds] = useState([]);
  const [totalOrds, setTotalOrds] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [committee, setCommittee] = useState('');
  const [date, setDate] = useState('');
  const [term, setTerm] = useState('');
  const [terms, setTerms] = useState([]);
  const [typeTab, setTypeTab] = useState('All');
  const [view, setView] = useState('grid');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('limit', String(ITEMS_PER_PAGE));
    if (search) p.set('search', search);
    if (status) p.set('status', status);
    if (committee) p.set('committee', committee);
    if (term) p.set('termId', term);
    if (date) p.set('date', date);
    if (typeTab !== 'All') p.set('type', typeTab);
    api.getOrdinances(p.toString())
      .then(res => {
        const result = normalizePaginated(res);
        setOrds(result.docs);
        setTotalOrds(result.total);
        setTotalPages(result.pages);
        if (page > result.pages) setPage(result.pages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, status, committee, term, date, typeTab, page]);

  useEffect(() => {
    api.getTerms().then(data => {
      const list = normalizeArray(data);
      setTerms(list);
      const current = list.find(t => t.isCurrent);
      if (current) setTerm(current._id);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, status, committee, date, typeTab, term]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const canEncode = ['Secretary', 'System Admin'].includes(user?.role);
  const paginatedOrds = ords;

  const TABS = [
    { label: 'All', icon: null },
    { label: 'Ordinance', icon: <FileText size={13} /> },
    { label: 'Resolution', icon: <Scroll size={13} /> },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="space-y-6 min-w-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Ordinances &amp; Resolutions</h2>
          <p className="text-sm text-muted-foreground mt-1">{totalOrds} legislative document{totalOrds !== 1 ? 's' : ''} on record</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            <button
              onClick={() => setView('grid')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                view === 'grid' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid size={14} /> Grid
            </button>
            <button
              onClick={() => setView('table')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                view === 'table' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Table2 size={14} /> Table
            </button>
          </div>
          {canEncode && (
            <Link
              to="/ordinances/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-lg hover:bg-primary/90 shadow-xs transition-colors"
            >
              <Plus size={15} /> Propose New
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex gap-1 p-1 bg-card border border-border rounded-xl">
        {TABS.map(tab => {
          const active = typeTab === tab.label;
          return (
            <button
              key={tab.label}
              onClick={() => setTypeTab(tab.label)}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                active 
                  ? 'bg-primary text-primary-foreground shadow-xs' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              {tab.icon} {tab.label}
              {active && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-primary-foreground/20 text-primary-foreground text-[10px]">
                  {totalOrds}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-card border border-border rounded-xl shadow-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            placeholder="Search by title or ordinance number…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-background border border-input rounded-lg text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>
        <select
          className="px-3 py-2 bg-background border border-input rounded-lg text-xs text-foreground outline-none focus:border-primary min-w-[150px]"
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          {STAGES.map(s => <option key={s} value={s}>{s || 'All Stages'}</option>)}
        </select>
        <select
          className="px-3 py-2 bg-background border border-input rounded-lg text-xs text-foreground outline-none focus:border-primary min-w-[150px] max-w-[200px]"
          value={committee}
          onChange={e => setCommittee(e.target.value)}
        >
          {COMMITTEES.map(c => <option key={c} value={c}>{c ? c.slice(0, 24) + '…' : 'All Committees'}</option>)}
        </select>
        <select
          className="px-3 py-2 bg-background border border-input rounded-lg text-xs text-foreground outline-none focus:border-primary min-w-[130px]"
          value={term}
          onChange={e => setTerm(e.target.value)}
        >
          <option value="">All Terms</option>
          {terms.map(t => <option key={t._id} value={t._id}>{t.label}</option>)}
        </select>
        <input
          type="date"
          className="px-3 py-2 bg-background border border-input rounded-lg text-xs text-foreground outline-none focus:border-primary"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
        {(search || status || committee || date || term) && (
          <button
            type="button"
            onClick={() => { setSearch(''); setStatus(''); setCommittee(''); setTerm(''); setDate(''); }}
            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-background border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Main Content */}
      {loading ? (
        <PageSkeleton rows={6} />
      ) : ords.length === 0 ? (
        <div className="text-center py-16 px-4 bg-card border border-border rounded-xl">
          <FileText size={40} className="mx-auto text-muted-foreground mb-3 opacity-50" />
          <h4 className="text-base font-bold text-foreground">No {typeTab !== 'All' ? typeTab + 's' : 'documents'} found</h4>
          <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or propose a new document.</p>
        </div>
      ) : view === 'grid' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedOrds.map(o => <OrdinanceCard key={o._id} ord={o} />)}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b border-border text-xs uppercase font-bold text-muted-foreground tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Number</th>
                  <th className="px-6 py-3.5">Title</th>
                  <th className="px-6 py-3.5">Committee</th>
                  <th className="px-6 py-3.5">Stage</th>
                  <th className="px-6 py-3.5">Filed</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedOrds.map(o => (
                  <tr key={o._id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4"><TypeBadge type={o.type || 'Ordinance'} /></td>
                    <td className="px-6 py-4">
                      <span className="inline-block font-mono text-[10px] font-bold text-primary bg-primary/8 border border-primary/20 px-1.5 py-0.5 rounded shrink-0 leading-none">
                        {o.number}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="font-semibold text-foreground truncate">{o.title}</div>
                      {o.amendedByOrdinanceId && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 font-bold mt-1">
                          <AlertTriangle size={10} /> Amended
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4"><CommitteeBadge committee={o.committee} /></td>
                    <td className="px-6 py-4"><Badge variant="status" status={normalizeStatus(o.legacyRejection ? 'Rejected' : o.status)} dot size="sm">{o.legacyRejection ? 'Rejected' : o.status || 'Draft'}</Badge></td>
                    <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">{new Date(o.createdAt).toLocaleDateString('en-PH')}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/ordinances/${o._id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </motion.div>
  );
}
