import { formatMoney, formatMonthShort, monthShort } from "@/lib/format";

/**
 * Net worth across the last check-ins — a single-series line chart, so no
 * legend (the card title names it). Auto-scales to the data range (with a small
 * pad for a flat series) so the trajectory is visible even when the absolute
 * numbers are large and close; the end value + period labels give the context.
 */
export function NetWorthTrend({
  periods,
  values,
  baseCurrency,
  ariaLabel = "Net worth over time",
}: {
  periods: string[];
  values: number[];
  baseCurrency: string;
  ariaLabel?: string;
}) {
  if (values.length < 2) {
    return (
      <p className="muted" style={{ fontSize: "0.82rem", margin: "0.4rem 0 0" }}>
        Two completed check-ins are needed to chart a trend.
      </p>
    );
  }

  const W = 600;
  const H = 190;
  const pl = 10;
  const pr = 10;
  const pt = 20;
  const pb = 24;
  let mn = Math.min(...values);
  let mx = Math.max(...values);
  if (mx === mn) {
    const pad = Math.abs(mx) * 0.05 || 1;
    mn -= pad;
    mx += pad;
  }
  const X = (i: number) => pl + (i / (values.length - 1)) * (W - pl - pr);
  const Y = (v: number) => pt + (1 - (v - mn) / (mx - mn)) * (H - pt - pb);

  const pts = values.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const area = `${X(0).toFixed(1)},${(H - pb).toFixed(1)} ${pts} ${X(values.length - 1).toFixed(1)},${(H - pb).toFixed(1)}`;
  const last = values[values.length - 1]!;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={ariaLabel}
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      {[0, 0.5, 1].map((f) => {
        const gy = pt + (H - pt - pb) * f;
        return <line key={f} x1={pl} y1={gy} x2={W - pr} y2={gy} stroke="var(--border)" strokeWidth={1} opacity={0.7} />;
      })}
      <polygon points={area} fill="var(--accent)" opacity={0.12} />
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {/* a marker at every month, the last one emphasised */}
      {values.map((v, i) => {
        const isLast = i === values.length - 1;
        return (
          <circle
            key={i}
            cx={X(i)}
            cy={Y(v)}
            r={isLast ? 4 : 2.4}
            fill="var(--accent)"
            stroke="var(--surface)"
            strokeWidth={isLast ? 2 : 1}
          />
        );
      })}

      <text x={W - pr} y={Math.max(13, Y(last) - 8)} textAnchor="end" fontSize={12} fontWeight={600} fill="var(--ink)">
        {formatMoney(last, baseCurrency)}
      </text>

      {/* per-month axis labels along the bottom; year shown at the first tick and each January */}
      {periods.map((p, i) => {
        const anchor = i === 0 ? "start" : i === periods.length - 1 ? "end" : "middle";
        const label = i === 0 || p.endsWith("-01") ? formatMonthShort(p) : monthShort(p);
        return (
          <text key={p} x={X(i)} y={H - 7} textAnchor={anchor} fontSize={10.5} fill="var(--muted)">
            {label}
          </text>
        );
      })}
    </svg>
  );
}
