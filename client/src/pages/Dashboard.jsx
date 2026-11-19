import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { normalizeArray } from '../utils/normalizeResponse';
import { useApiQuery } from '../hooks/useApi';
import PageSkeleton from '../components/ui/PageSkeleton';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  FileText, CheckCircle, Clock, MessageSquare,
  Users, ChevronRight, XCircle,
  Calendar, Landmark, BarChart2
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Badge } from '@ibosys/ui';
import TypeBadge from '../components/features/TypeBadge';
import { normalizeStatus, STAGES as ALL_STATUSES } from '../constants/stages';
import { StatCard, SectionHeader } from '@ibosys/ui';

const COMMITTEE_BAR_COLOR = 'var(--ibosys-primary-500)';
const COMMITTEE_TOP_COLOR = 'var(--ibosys-primary-700)';
const CHAIRPERSON_COLORS = [
  'var(--ibosys-primary-500)', 'var(--ibosys-primary-700)', 'var(--ibosys-accent-500)', 'var(--ibosys-accent-700)',
  'var(--ibosys-danger-500)', 'var(--ibosys-warning-600)', '#06b6d4', '#8b5cf6'
];

const ALL_COMMITTEES = [
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

const QUICK_FILTERS = [
  { label: 'Approved', status: 'Approved', committee: '' },
  { label: 'Public Consultation', status: 'Public Consultation', committee: '' },
  { label: 'Appropriation', status: '', committee: 'Committee on Appropriation, Infrastructure and Power and Energy' },
  { label: 'Health', status: '', committee: 'Committee on Health, Livelihood and Civil Society Organizations' },
  { label: 'Education', status: '', committee: 'Committee on Education, Culture and Arts, Legal Matters, House Rules, Ordinances, Technical and Vocational Education, Good Governance, Public Ethics and Accountability' },
  { label: 'Environment', status: '', committee: 'Committee on Environment, Grievances, Human Rights, Cooperative, Market and Economic Enterprise' },
  { label: 'Agriculture', status: '', committee: 'Committee on Agriculture and Games and Amusement' },
  { label: 'Tourism', status: '', committee: 'Committee on Tourism, Transportation, Peace and Order and Beautification' },
];

// Custom recharts tooltip
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const displayName = payload[0]?.payload?.fullTerm || label;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-md text-xs">
      <div className="font-semibold text-foreground mb-0.5">{displayName}</div>
      <div className="text-primary font-bold">{payload[0].value} legislative measure{payload[0].value !== 1 ? 's' : ''}</div>
    </div>
  );
};

const buildOutcomeSeries = (stats) => {
  const rows = Array.isArray(stats?.byProponentOutcomes) ? stats.byProponentOutcomes : [];
  return rows.map(row => ({
    name: row?.name || 'Unknown',
    approved: Number(row?.approved) || 0,
    rejected: Number(row?.rejected) || 0,
  }));
};

const OutcomeTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-md text-xs">
      <div className="font-semibold text-foreground mb-1.5">{label}</div>
      <div className="space-y-1">
        {payload.map(entry => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: entry.color }} />
              {entry.dataKey === 'approved' ? 'Approved' : 'Rejected'}
            </span>
            <span className="font-bold tabular-nums text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CommitteeTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { fullName, count } = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-md text-xs">
      <div className="font-semibold text-foreground mb-0.5">{fullName}</div>
      <div className="text-primary font-bold">{count} legislative measure{count !== 1 ? 's' : ''}</div>
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allOrds, setAllOrds] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [committeePage, setCommitteePage] = useState(1);
  const COMMITTEE_PER_PAGE = 6;

  const [filterCommittee, setFilterCommittee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filteredOrds, setFilteredOrds] = useState([]);
  const [ordPage, setOrdPage] = useState(1);
  const ORD_PER_PAGE = 6;

  const reduce = useReducedMotion();

  const today = new Date().toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const firstName = user?.name?.trim().split(/\s+/)[0];
  const greetingName = firstName && firstName.toLowerCase() !== 'system' ? firstName : null;

  const { data: stats, isLoading: loading } = useApiQuery(
    'stats',
    () => api.getStats(),
    { staleTime: 5 * 60 * 1000 }
  );
  const { data: ordsRes } = useApiQuery(
    ['ordinances', 'dashboard'],
    () => api.getOrdinances('limit=50&page=1'),
    { staleTime: 5 * 60 * 1000 }
  );
  const { data: commsRes } = useApiQuery(
    ['committees', 'dashboard'],
    () => api.getCommittees('limit=0'),
    { staleTime: 5 * 60 * 1000 }
  );

  useEffect(() => {
    if (!ordsRes) return;
    const list = normalizeArray(ordsRes);
    setAllOrds(list);
    setFilteredOrds(list);
  }, [ordsRes]);

  useEffect(() => {
    if (!commsRes) return;
    setCommittees(normalizeArray(commsRes));
  }, [commsRes]);

  useEffect(() => {
    let result = allOrds;
    if (filterCommittee) result = result.filter(o => o.committee === filterCommittee);
    if (filterStatus) result = result.filter(o => o.status === filterStatus);
    setFilteredOrds(result);
    setOrdPage(1);
  }, [filterCommittee, filterStatus, allOrds]);

  if (loading) return <PageSkeleton variant="dashboard" />;

  const byTermData = (stats?.byTerm && stats.byTerm.length > 0)
    ? stats.byTerm.map(t => ({
        term: String(t._id).replace(/ Term$/i, ''),
        fullTerm: String(t._id),
        count: t.count
      }))
    : (stats?.byYear || []).map(y => ({
        term: String(y._id),
        fullTerm: String(y._id),
        count: y.count
      }));
  const byCommitteeData = (stats?.byCommittee || []).slice(0, 8).map(c => ({
    name: c._id ? (c._id.replace('Committee on ', '').split(',')[0]) : 'Unassigned',
    fullName: c._id || 'Unassigned',
    count: c.count
  }));
  const outcomeData = buildOutcomeSeries(stats);
  const topChartsHeight = Math.max(240, byTermData.length * 36 + 40, outcomeData.length * 36 + 40);
  const committeeChartHeight = Math.max(260, byCommitteeData.length * 34 + 40);
  const hasTermMeasures = byTermData.some(term => term.count > 0);

  const withChair = committees.filter(c => c.chairperson);
  const totalCommitteePages = Math.ceil(withChair.length / COMMITTEE_PER_PAGE);
  const paginatedCommittees = withChair.slice((committeePage - 1) * COMMITTEE_PER_PAGE, committeePage * COMMITTEE_PER_PAGE);

  const totalOrdPages = Math.ceil(filteredOrds.length / ORD_PER_PAGE);
  const paginatedOrds = filteredOrds.slice((ordPage - 1) * ORD_PER_PAGE, ordPage * ORD_PER_PAGE);

  return (
    <motion.div
      initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 10 }}
      animate={{ opacity: reduce ? 1 : 1, y: reduce ? 0 : 0 }}
      transition={{ duration: reduce ? 0 : 0.35, ease: reduce ? 'linear' : 'easeOut' }}
      className="w-full space-y-6 min-w-0"
    >

      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-border">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1">
            Sangguniang Bayan ng Bongabong
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}{greetingName ? `, ${greetingName}` : ''}.
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{today}</p>
        </div>
        <div className="hidden lg:flex items-center gap-2 text-[11px] text-muted-foreground pt-1 shrink-0">
          <Calendar size={13} className="text-primary" />
          <span className="font-medium">Legislative Session Platform</span>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-4">
        <StatCard className="flex-col items-stretch" delay={0.04} icon={FileText}      iconVariant="primary"     value={stats?.totalOrdinances ?? 0}  label="Total Ordinances" />
        <StatCard className="flex-col items-stretch" delay={0.08} icon={FileText}      iconVariant="info"        value={stats?.totalResolutions ?? 0} label="Resolutions" />
        <StatCard className="flex-col items-stretch" delay={0.12} icon={CheckCircle}   iconVariant="success"     value={stats?.approved ?? 0}       label="Approved Measures" />
        <StatCard className="flex-col items-stretch" delay={0.16} icon={XCircle}       iconVariant="danger"      value={stats?.rejected ?? 0}       label="Rejected Measures" />
        <StatCard className="flex-col items-stretch" delay={0.18} icon={Clock}         iconVariant="warning"     value={stats?.inProgress ?? 0}       label="In Progress" />
        <StatCard className="flex-col items-stretch" delay={0.20} icon={FileText}      iconVariant="info"        value={stats?.drafts ?? 0}          label="Drafts" />
        <StatCard className="flex-col items-stretch" delay={0.22} icon={MessageSquare} iconVariant="info"        value={stats?.consultation ?? 0}     label="Open Consultations" />
      </div>

      {/* ── Main Content ─────────────────────────────────── */}
      <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] gap-5 min-w-0">

        {/* Left column */}
        <div className="space-y-5 min-w-0">

          {/* Ordinance Quick Access */}
<motion.div
              initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 16 }}
              animate={{ opacity: reduce ? 1 : 1, y: reduce ? 0 : 0 }}
              transition={{ delay: reduce ? 0 : 0.25, duration: reduce ? 0 : 0.35 }}
              className="bg-card border border-border rounded-xl shadow-xs overflow-hidden"
            >
            <div className="px-6 pt-5 pb-4 border-b border-border">
              <SectionHeader
                icon={FileText}
                title="Ordinance Quick Access"
                subtitle="Filter and browse legislative items instantly"
                action="View all"
                onAction={() => navigate('/ordinances')}
              />

              {/* Filters */}
              <div className="flex gap-2.5 flex-wrap mb-3">
                <select
                  className="flex-1 min-w-[180px] px-3 py-2 bg-background border border-input rounded-md text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                  value={filterCommittee}
                  onChange={e => setFilterCommittee(e.target.value)}
                >
                  <option value="">All Committees</option>
                  {ALL_COMMITTEES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  className="flex-1 min-w-[160px] px-3 py-2 bg-background border border-input rounded-md text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                >
                  <option value="">All Stages</option>
                  {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {(filterCommittee || filterStatus) && (
                  <button
                    onClick={() => { setFilterCommittee(''); setFilterStatus(''); }}
                    className="px-3 py-2 text-xs font-medium text-muted-foreground border border-border rounded-md hover:bg-muted/60 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Quick filter chips */}
              <div className="flex gap-1.5 flex-wrap">
                {QUICK_FILTERS.map(chip => {
                  const isActive = filterStatus === chip.status && filterCommittee === chip.committee && (chip.status || chip.committee);
                  return (
                    <button
                      key={chip.label}
                      onClick={() => { setFilterStatus(chip.status); setFilterCommittee(chip.committee); }}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors border ${
                        isActive
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:border-primary/60 hover:text-primary'
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ordinance list */}
            <div className="divide-y divide-border">
              {paginatedOrds.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <FileText size={32} className="text-muted-foreground/30 mb-2" />
                  <div className="text-sm font-semibold text-foreground">No ordinances found</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Try adjusting the filters above.</div>
                </div>
              ) : (
                paginatedOrds.map(o => (
                  <a
                    key={o._id}
                    href={`/ordinances/${o._id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="min-w-0 flex-1 basis-56">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <TypeBadge type={o.type} size="xs" />
                        <span className="inline-block whitespace-nowrap font-mono text-[10px] font-bold text-primary bg-primary/8 border border-primary/20 px-1.5 py-0.5 rounded shrink-0 leading-none">
                          {o.number}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors leading-snug">{o.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{o.committee?.replace('Committee on ', '')}</div>
                    </div>
                    <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                      <Badge variant="status" status={normalizeStatus(o.status)} dot size="sm" className="shrink-0 whitespace-nowrap">
                        {o.status || 'Draft'}
                      </Badge>
                      <ChevronRight size={13} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </div>
                  </a>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalOrdPages > 1 && (
              <div className="px-6 py-3 border-t border-border flex items-center justify-between bg-muted/20">
                <span className="text-xs text-muted-foreground">
                  Showing {((ordPage - 1) * ORD_PER_PAGE) + 1}–{Math.min(ordPage * ORD_PER_PAGE, filteredOrds.length)} of {filteredOrds.length}
                </span>
                <div className="flex gap-1.5">
                  <button
                    disabled={ordPage === 1}
                    onClick={() => setOrdPage(p => p - 1)}
                    className="px-2.5 py-1 text-xs font-medium border border-border rounded-md bg-background hover:bg-muted/60 disabled:opacity-40 transition-colors"
                  >← Prev</button>
                  <button
                    disabled={ordPage === totalOrdPages}
                    onClick={() => setOrdPage(p => p + 1)}
                    className="px-2.5 py-1 text-xs font-medium border border-border rounded-md bg-background hover:bg-muted/60 disabled:opacity-40 transition-colors"
                  >Next →</button>
                </div>
              </div>
            )}
          </motion.div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <motion.div
              initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 16 }}
              animate={{ opacity: reduce ? 1 : 1, y: reduce ? 0 : 0 }}
              transition={{ delay: reduce ? 0 : 0.3, duration: reduce ? 0 : 0.35 }}
              className="bg-card border border-border rounded-xl p-5 shadow-xs"
            >
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={15} className="text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Legislative Measures per Term</span>
              </div>
              {!hasTermMeasures ? (
                <div className="flex items-center justify-center text-center text-xs text-muted-foreground" style={{ height: topChartsHeight }}>
                  No legislative measures recorded yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={topChartsHeight}>
                  <BarChart data={byTermData} layout="vertical" margin={{ top: 4, right: 30, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--ibosys-border-light)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: 'var(--ibosys-text-muted)', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      tickMargin={6}
                    />
                    <YAxis
                      type="category"
                      dataKey="term"
                      width={88}
                      tick={{ fill: 'var(--ibosys-text-secondary)', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--ibosys-border-light)', opacity: 0.35 }} />
                    <Bar dataKey="count" fill="var(--ibosys-primary-500)" radius={[0, 4, 4, 0]} barSize={16} maxBarSize={18}>
                      <LabelList dataKey="count" position="right" fill="var(--ibosys-text-primary)" fontSize={11} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 16 }}
              animate={{ opacity: reduce ? 1 : 1, y: reduce ? 0 : 0 }}
              transition={{ delay: reduce ? 0 : 0.36, duration: reduce ? 0 : 0.35 }}
              data-testid="proponent-outcomes-card"
              className="bg-card border border-border rounded-xl p-5 shadow-xs"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BarChart2 size={15} className="text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Proponent Outcomes</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" /> Approved
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-destructive" aria-hidden="true" /> Rejected
                  </span>
                </div>
              </div>
              {outcomeData.length === 0 ? (
                <div className="flex h-[220px] items-center justify-center px-6 text-center text-xs text-muted-foreground">
                  No approved or rejected measures recorded yet.
                </div>
              ) : (
                <div className="-ml-3">
                  <ResponsiveContainer width="100%" height={topChartsHeight}>
                    <BarChart data={outcomeData} layout="vertical" margin={{ top: 4, right: 30, left: 0, bottom: 4 }} barGap={3}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--ibosys-border-light)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: 'var(--ibosys-text-muted)', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      tickMargin={6}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={104}
                      tick={{ fill: 'var(--ibosys-text-secondary)', fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      tickMargin={3}
                      tickFormatter={v => (v.length > 22 ? `${v.slice(0, 20)}…` : v)}
                    />
                    <Tooltip content={<OutcomeTooltip />} cursor={{ fill: 'var(--ibosys-border-light)', opacity: 0.35 }} />
                    <Bar dataKey="approved" name="Approved" fill="var(--ibosys-primary-500)" radius={[0, 3, 3, 0]} barSize={10} maxBarSize={12}>
                      <LabelList dataKey="approved" position="right" fill="var(--ibosys-text-primary)" fontSize={10} formatter={value => Number(value) > 0 ? value : ''} />
                    </Bar>
                    <Bar dataKey="rejected" name="Rejected" fill="var(--ibosys-danger-500)" radius={[0, 3, 3, 0]} barSize={10} maxBarSize={12}>
                      <LabelList dataKey="rejected" position="right" fill="var(--ibosys-text-primary)" fontSize={10} formatter={value => Number(value) > 0 ? value : ''} />
                    </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </motion.div>
          </div>

          {/* Legislative measures per committee — horizontal bar */}
          <motion.div
            initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduce ? 0 : 0.2, duration: reduce ? 0 : 0.24 }}
            className="bg-card border border-border rounded-xl p-5 shadow-xs"
          >
            <div className="flex items-center gap-2 mb-4">
              <Landmark size={15} className="text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Top Committees by Legislative Measures</span>
            </div>
            {byCommitteeData.length === 0 ? (
              <div className="flex items-center justify-center text-center text-xs text-muted-foreground" style={{ height: committeeChartHeight }}>
                No committee measures recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={committeeChartHeight}>
                <BarChart data={byCommitteeData} layout="vertical" margin={{ top: 4, right: 34, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--ibosys-border-light)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--ibosys-text-muted)', fontSize: 10 }} allowDecimals={false} axisLine={false} tickLine={false} tickMargin={6} />
                  <YAxis
                    type="category" dataKey="name"
                    width={150}
                    tick={{ fill: 'var(--ibosys-text-secondary)', fontSize: 10 }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => v.length > 23 ? `${v.slice(0, 21)}…` : v}
                  />
                  <Tooltip content={<CommitteeTooltip />} cursor={{ fill: 'var(--ibosys-border-light)', opacity: 0.35 }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16} maxBarSize={18}>
                    {byCommitteeData.map((_, i) => <Cell key={i} fill={i === 0 ? COMMITTEE_TOP_COLOR : COMMITTEE_BAR_COLOR} />)}
                    <LabelList dataKey="count" position="right" fill="var(--ibosys-text-primary)" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        </div>

        {/* Right column — Committee Chairpersons */}
        {withChair.length > 0 && (
          <motion.div
            initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 16 }}
            animate={{ opacity: reduce ? 1 : 1, y: reduce ? 0 : 0 }}
            transition={{ delay: reduce ? 0 : 0.28, duration: reduce ? 0 : 0.35 }}
            className="bg-card border border-border rounded-xl shadow-xs overflow-hidden self-start"
          >
            <div className="px-5 pt-5 pb-4 border-b border-border">
              <SectionHeader
                icon={Users}
                title="Committee Chairpersons"
                subtitle={`${withChair.length} active committees`}
                action="Manage"
                onAction={() => navigate('/committees')}
              />
            </div>

            <div className="divide-y divide-border">
              {paginatedCommittees.map((c, idx) => {
                const globalIdx = (committeePage - 1) * COMMITTEE_PER_PAGE + idx;
                const color = CHAIRPERSON_COLORS[globalIdx % CHAIRPERSON_COLORS.length];
                return (
                  <div key={c._id} className="px-5 py-3.5 hover:bg-muted/20 transition-colors">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center text-white shrink-0 text-[10px] font-bold mt-0.5"
                        style={{ backgroundColor: color }}
                      >
                        {globalIdx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-semibold text-foreground/70 leading-snug line-clamp-2 mb-1.5">{c.name}</div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-primary mb-0.5">Chairperson</div>
                          <div className="text-xs font-bold text-foreground">{c.chairperson}</div>
                        </div>
                        {c.viceChairperson && (
                          <div className="mt-1.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Vice-Chair</div>
                            <div className="text-xs text-muted-foreground font-medium">{c.viceChairperson}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalCommitteePages > 1 && (
              <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Page {committeePage} of {totalCommitteePages}</span>
                <div className="flex gap-1.5">
                  <button
                    disabled={committeePage === 1}
                    onClick={() => setCommitteePage(p => p - 1)}
                    className="px-2 py-1 text-[10px] font-medium border border-border rounded bg-background hover:bg-muted/60 disabled:opacity-40 transition-colors"
                  >← Prev</button>
                  <button
                    disabled={committeePage === totalCommitteePages}
                    onClick={() => setCommitteePage(p => p + 1)}
                    className="px-2 py-1 text-[10px] font-medium border border-border rounded bg-background hover:bg-muted/60 disabled:opacity-40 transition-colors"
                  >Next →</button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
