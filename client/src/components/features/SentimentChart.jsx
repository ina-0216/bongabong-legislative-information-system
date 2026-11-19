import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SENTIMENT_COLORS = {
  Agree: 'var(--ibosys-success-500)',
  Disagree: 'var(--ibosys-danger-500)',
  Neutral: 'var(--ibosys-text-tertiary)',
};

const SENTIMENT_LABELS = {
  Agree: 'Agree',
  Disagree: 'Disagree',
  Neutral: 'Neutral',
};

export default function SentimentChart({ tally, total }) {
  const data = [
    { name: 'Agree', value: tally?.Agree || 0, label: SENTIMENT_LABELS.Agree },
    { name: 'Disagree', value: tally?.Disagree || 0, label: SENTIMENT_LABELS.Disagree },
    { name: 'Neutral', value: tally?.Neutral || 0, label: SENTIMENT_LABELS.Neutral },
  ].filter(d => d.value > 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        No votes cast yet
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map(entry => (
              <Cell key={entry.name} fill={SENTIMENT_COLORS[entry.name]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'var(--ibosys-surface-primary)',
              border: '1px solid var(--ibosys-border-default)',
              borderRadius: 'var(--ibosys-radius-md)',
              fontSize: 12,
            }}
            formatter={val => [`${val} (${((val / total) * 100).toFixed(1)}%)`, '']}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex gap-1 mt-2 h-1.5 rounded-full overflow-hidden">
        {(tally?.Agree || 0) > 0 && (
          <div className="bg-success-500" style={{ flex: tally.Agree }} />
        )}
        {(tally?.Disagree || 0) > 0 && (
          <div className="bg-danger-500" style={{ flex: tally.Disagree }} />
        )}
        {(tally?.Neutral || 0) > 0 && (
          <div className="bg-text-tertiary" style={{ flex: tally.Neutral }} />
        )}
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        {total} total {total === 1 ? 'vote' : 'votes'}
      </p>
    </div>
  );
}