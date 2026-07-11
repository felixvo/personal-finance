/** A simple filled line chart for a projected series (growth curve or paydown).
 *  Single series, so no legend — the surrounding copy names it. */
export function WhatIfChart({
  series,
  formatValue,
}: {
  series: number[];
  formatValue: (n: number) => string;
}) {
  if (series.length < 2) return null;

  const W = 600;
  const H = 190;
  const padL = 8;
  const padR = 8;
  const padT = 18;
  const padB = 20;
  const max = Math.max(...series) * 1.06 || 1;
  const x = (i: number) => padL + (i / (series.length - 1)) * (W - padL - padR);
  const y = (v: number) => H - padB - (v / max) * (H - padT - padB);

  const line = series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${x(0).toFixed(1)},${(H - padB).toFixed(1)} ${line} ${x(series.length - 1).toFixed(1)},${(H - padB).toFixed(1)}`;
  const last = series[series.length - 1]!;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Projection over time">
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="var(--border)" strokeWidth="1" />
      <polygon points={area} fill="var(--accent)" opacity="0.12" />
      <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(series.length - 1)} cy={y(last)} r="4" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
      <text x={W - padR} y={Math.max(12, y(last) - 8)} textAnchor="end" fontSize="12" fontWeight="600" fill="var(--ink)">
        {formatValue(last)}
      </text>
    </svg>
  );
}
