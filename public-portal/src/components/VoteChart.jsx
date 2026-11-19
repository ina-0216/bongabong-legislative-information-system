import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useLanguage } from '../context/LanguageContext.jsx';

/**
 * Fills and text colours are separate on purpose.
 *
 * The slice fills are non-text graphics, so they are held to the 3:1 figure for
 * graphical objects. The legend renders the series name as text, which has to
 * clear 4.5:1, and the -500 steps do not: gold #d4a72c sat at 2.19:1 and red
 * #ef4444 at 3.68:1 against the paper surface. Each text colour is a darker step
 * of its own hue rather than a generic grey, so the legend still reads as three
 * related colours instead of three unrelated ones.
 */
const COLORS = {
  Agree: 'var(--ibosys-primary-500)',
  Neutral: 'var(--ibosys-accent-500)',
  Disagree: 'var(--ibosys-danger-500)',
};

const TEXT_COLORS = {
  Agree: 'var(--ibosys-primary-700)',
  Neutral: 'var(--ibosys-accent-800)',
  Disagree: 'var(--ibosys-danger-700)',
};

export default function VoteChart({ tally }) {
  const { t } = useLanguage();
  // `key` is the API tally key and never translated; `name` is the label shown to
  // the visitor. Indexing the colour maps by `name` breaks the moment the
  // interface is not English, because the translated label no longer matches the
  // tally key.
  const data = [
    { key: 'Agree', name: t('voteAgree'), value: tally.Agree },
    { key: 'Neutral', name: t('voteNeutral'), value: tally.Neutral },
    { key: 'Disagree', name: t('voteDisagree'), value: tally.Disagree }
  ].filter(d => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-[var(--ibosys-text-tertiary)]">
        {t('noVotesRecorded')}
      </div>
    );
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.key]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--ibosys-surface-primary)',
              border: '1px solid var(--ibosys-border-default)',
              borderRadius: 'var(--ibosys-radius-md)',
            }}
            labelStyle={{ color: 'var(--ibosys-text-primary)' }}
            itemStyle={{ color: 'var(--ibosys-text-primary)' }}
          />
          <Legend
            // Recharts colours legend text with the series colour by default,
            // which is what put the gold and red labels below 4.5:1.
            formatter={(value, entry) => (
              <span style={{ color: TEXT_COLORS[entry.dataKey] ?? 'var(--ibosys-text-primary)' }}>
                {value}
              </span>
            )}
            wrapperStyle={{ color: 'var(--ibosys-text-primary)' }}
            iconType="circle"
            iconSize={10}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}