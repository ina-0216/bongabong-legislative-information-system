const STATUS_MAP = {
  'First Reading':        { bg: 'bg-slate-100 border-slate-300 text-slate-700', dot: 'bg-slate-500' },
  'Committee Assignment': { bg: 'bg-cyan-50 border-cyan-200 text-cyan-800',     dot: 'bg-cyan-600' },
  'Committee Hearing':    { bg: 'bg-purple-50 border-purple-200 text-purple-800', dot: 'bg-purple-600' },
  'Public Consultation':  { bg: 'bg-amber-50 border-amber-200 text-amber-800',   dot: 'bg-amber-600' },
  'Second Reading':       { bg: 'bg-orange-50 border-orange-200 text-orange-800', dot: 'bg-orange-600' },
  'Third Reading':        { bg: 'bg-yellow-50 border-yellow-300 text-yellow-900', dot: 'bg-yellow-600' },
  "For Mayor's Signature":{ bg: 'bg-violet-50 border-violet-200 text-violet-800', dot: 'bg-violet-600' },
  'For SP Review':        { bg: 'bg-blue-50 border-blue-200 text-blue-800',     dot: 'bg-blue-600' },
  'Approved':             { bg: 'bg-emerald-50 border-emerald-300 text-emerald-800', dot: 'bg-emerald-600' },
  'Pending':              { bg: 'bg-amber-50 border-amber-200 text-amber-800',   dot: 'bg-amber-600' },
  'Active':               { bg: 'bg-emerald-50 border-emerald-300 text-emerald-800', dot: 'bg-emerald-600' },
  'Deactivated':          { bg: 'bg-red-50 border-red-200 text-red-700',         dot: 'bg-red-600' },
  'Rejected':             { bg: 'bg-red-50 border-red-200 text-red-700',         dot: 'bg-red-600' },
  'Amended':              { bg: 'bg-rose-50 border-rose-200 text-rose-800',      dot: 'bg-rose-600' },
};

export default function StatusBadge({ status }) {
  const config = STATUS_MAP[status] || { bg: 'bg-slate-100 border-slate-200 text-slate-700', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${config.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {status}
    </span>
  );
}
