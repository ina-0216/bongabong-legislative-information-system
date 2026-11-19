const COMMITTEE_STYLES = {
  'Committee on Appropriation, Infrastructure and Power and Energy': { bg: 'bg-primary-50 border-primary-100 text-primary-800', icon: '💰' },
  'Committee on Education, Culture and Arts, Legal Matters, House Rules, Ordinances, Technical and Vocational Education, Good Governance, Public Ethics and Accountability': { bg: 'bg-slate-100 border-slate-200 text-slate-700', icon: '🎓' },
  'Committee on Health, Livelihood and Civil Society Organizations': { bg: 'bg-rose-50 border-rose-200 text-rose-800', icon: '⚕️' },
  'Committee on Environment, Grievances, Human Rights, Cooperative, Market and Economic Enterprise': { bg: 'bg-teal-50 border-teal-200 text-teal-800', icon: '🌿' },
  'Committee on Agriculture and Games and Amusement': { bg: 'bg-amber-50 border-amber-200 text-amber-800', icon: '🌾' },
  'Committee on Tourism, Transportation, Peace and Order and Beautification': { bg: 'bg-indigo-50 border-indigo-200 text-indigo-800', icon: '🛡️' },
  'Committee on Social Welfare, Disaster Risk Reduction and Management and Community Driven Development': { bg: 'bg-pink-50 border-pink-200 text-pink-800', icon: '👨‍👩‍👧‍👦' },
  'Committee on Ways and Means, Trade and Industry, Land Use, Labor and Human Resource, Overseas Filipino Workers, Oversight and Sisterhood': { bg: 'bg-orange-50 border-orange-200 text-orange-800', icon: '📋' },
  'Committee on Youth and Sports Development, Science and Technology and Information and Communication Technology': { bg: 'bg-cyan-50 border-cyan-200 text-cyan-800', icon: '🏃' },
  'Committee on Barangay Affairs': { bg: 'bg-amber-50 border-amber-200 text-amber-800', icon: '🏘️' },
  'General': { bg: 'bg-slate-100 border-slate-200 text-slate-700', icon: '📄' }
};

export default function CommitteeBadge({ committee }) {
  const commName = (typeof committee === 'string' ? committee : committee?.name) || 'General';
  const c = COMMITTEE_STYLES[commName] || COMMITTEE_STYLES['General'];
  return (
    <span
      title={commName}
      className={`inline-flex min-w-0 max-w-full items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${c.bg}`}
    >
      <span className="text-xs shrink-0">{c.icon}</span>
      <span className="block min-w-0 truncate">
        {commName}
      </span>
    </span>
  );
}
