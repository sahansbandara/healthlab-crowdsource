import React from 'react';

const COLORS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#06b6d4'];

const formatDate = (value) => {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value || '');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return String(value || '');
  }
};

export const TrendChart = ({ data }) => {
  if (!data || data.length === 0) return <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">No trend data available</div>;

  const points = data.map((d) => ({
    date: d?.date,
    count: Number(d?.count ?? 0),
  })).filter((d) => d.date);

  const maxValue = Math.max(...points.map((p) => p.count), 1);
  const width = 720;
  const height = 260;
  const pad = 24;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const coords = points.map((p, i) => {
    const x = pad + (points.length <= 1 ? 0 : (i / (points.length - 1)) * innerW);
    const y = pad + innerH - (p.count / maxValue) * innerH;
    return { ...p, x, y };
  });

  const polyline = coords.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath = coords.length > 0
    ? `M ${coords[0].x} ${pad + innerH} L ${coords.map((p) => `${p.x} ${p.y}`).join(' L ')} L ${coords[coords.length - 1].x} ${pad + innerH} Z`
    : '';

  return (
    <div className="h-72 w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <line x1={pad} y1={pad + innerH} x2={pad + innerW} y2={pad + innerH} stroke="#cbd5e1" strokeWidth="1" />
        <line x1={pad} y1={pad} x2={pad} y2={pad + innerH} stroke="#cbd5e1" strokeWidth="1" />

        {areaPath ? <path d={areaPath} fill="url(#trendFill)" /> : null}
        {polyline ? <polyline fill="none" stroke="#6366f1" strokeWidth="2.5" points={polyline} /> : null}

        {coords.map((p, i) => (
          <g key={`${p.date}-${i}`}>
            <circle cx={p.x} cy={p.y} r="2.5" fill="#4f46e5" />
          </g>
        ))}
      </svg>

      <div className="mt-2 flex justify-between text-[10px] text-slate-500">
        <span>{formatDate(points[0]?.date)}</span>
        <span>{formatDate(points[Math.floor(points.length / 2)]?.date)}</span>
        <span>{formatDate(points[points.length - 1]?.date)}</span>
      </div>
      <div className="mt-1 text-[11px] text-slate-600">Peak registrations in period: {maxValue}</div>
    </div>
  );
};

export const DistributionChart = ({ data, variant = 'bars' }) => {
  if (!data || data.length === 0 || data.every(d => d.value === 0)) {
    return <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">No data to display</div>;
  }

  const cleanData = data.map((d) => ({
    name: d?.name || 'Unknown',
    value: Number(d?.value ?? 0),
  }));
  const total = cleanData.reduce((sum, d) => sum + d.value, 0);

  if (variant === 'pie') {
    const cx = 120;
    const cy = 120;
    const r = 70;
    const c = 2 * Math.PI * r;
    let offset = 0;

    return (
      <div className="h-72 w-full flex items-center gap-6">
        <svg viewBox="0 0 240 240" className="w-44 h-44 shrink-0">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="26" />
          {cleanData.map((entry, index) => {
            const segment = total > 0 ? (entry.value / total) * c : 0;
            const dashArray = `${segment} ${c - segment}`;
            const circle = (
              <circle
                key={`${entry.name}-${index}`}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={COLORS[index % COLORS.length]}
                strokeWidth="26"
                strokeDasharray={dashArray}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${cx} ${cy})`}
              />
            );
            offset += segment;
            return circle;
          })}
          <circle cx={cx} cy={cy} r="46" fill="white" />
          <text x={cx} y={cy - 2} textAnchor="middle" className="fill-slate-900 text-[20px] font-bold">{total}</text>
          <text x={cx} y={cy + 16} textAnchor="middle" className="fill-slate-500 text-[10px]">Total</text>
        </svg>

        <div className="flex-1 space-y-2">
          {cleanData.map((entry, index) => {
            const percent = total > 0 ? Math.round((entry.value / total) * 100) : 0;
            return (
              <div key={`${entry.name}-${index}`} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-slate-700 font-medium">{entry.name}</span>
                </div>
                <span className="text-slate-500">{entry.value} ({percent}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="h-72 w-full flex flex-col gap-3 justify-center">
      {cleanData.map((entry, index) => {
        const percent = total > 0 ? Math.round((entry.value / total) * 100) : 0;
        return (
          <div key={`${entry.name}-${index}`}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-slate-700">{entry.name}</span>
              <span className="text-slate-500">{entry.value} ({percent}%)</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${percent}%`, backgroundColor: COLORS[index % COLORS.length] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const QualificationChart = ({ data }) => {
  if (!data || data.length === 0) return <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">No qualification data</div>;

  const cleanData = data.map((d) => ({
    name: d?.name || 'Unspecified',
    count: Number(d?.count ?? 0),
  }));
  const max = Math.max(...cleanData.map((d) => d.count), 1);

  return (
    <div className="h-72 w-full overflow-y-auto pr-1 space-y-3">
      {cleanData.map((row, index) => {
        const pct = Math.round((row.count / max) * 100);
        return (
          <div key={`${row.name}-${index}`}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-700 font-medium truncate mr-3">{row.name}</span>
              <span className="text-slate-500">{row.count}</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
