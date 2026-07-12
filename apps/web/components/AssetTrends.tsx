"use client";

import { useState, type ReactNode } from "react";
import { formatMoney, formatMonthShort } from "@/lib/format";
import { typeColor } from "@/lib/chart-colors";

type Asset = {
  holdingId: string;
  name: string;
  typeSlug: string;
  typeLabel: string;
  series: number[];
};

/**
 * "How each asset changes over time" (ported from the mockup). Two views:
 * "By asset" — small multiples, one mini line per holding on its OWN scale, so
 * a 44M holding and a 6B holding are both readable (a shared axis would flatten
 * the small ones). "Stacked total" — a stacked area by asset TYPE showing how
 * the composition of total assets shifts. Colour encodes type (categorical
 * palette); a 2px surface stroke separates the bands.
 */
export function AssetTrends({
  periods,
  assets,
  baseCurrency,
}: {
  periods: string[];
  assets: Asset[];
  baseCurrency: string;
}) {
  const [mode, setMode] = useState<"byasset" | "stacked">("byasset");

  if (periods.length < 2) {
    return (
      <p className="muted" style={{ fontSize: "0.88rem", margin: 0 }}>
        Need at least two completed check-ins to show a trend — you have {periods.length}. Complete another
        check-in to build history.
      </p>
    );
  }
  if (assets.length === 0) {
    return (
      <p className="muted" style={{ fontSize: "0.88rem", margin: 0 }}>
        No active asset holdings to trend yet.
      </p>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "inline-flex",
          gap: "0.25rem",
          marginBottom: "1rem",
          border: "1px solid var(--border)",
          borderRadius: 999,
          padding: 3,
        }}
      >
        {(["byasset", "stacked"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={mode === m ? "btn" : "btn-ghost"}
            style={{ width: "auto", padding: "0.3rem 0.85rem", fontSize: "0.8rem", borderRadius: 999 }}
          >
            {m === "byasset" ? "By asset" : "Stacked total"}
          </button>
        ))}
      </div>

      {mode === "stacked" ? (
        <StackedAreaChart periods={periods} assets={assets} baseCurrency={baseCurrency} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(13rem, 1fr))", gap: "0.75rem" }}>
          {assets.map((a) => (
            <TrendTile key={a.holdingId} asset={a} since={formatMonthShort(periods[0]!)} baseCurrency={baseCurrency} />
          ))}
        </div>
      )}
    </div>
  );
}

function TrendTile({ asset, since, baseCurrency }: { asset: Asset; since: string; baseCurrency: string }) {
  const first = asset.series[0] ?? 0;
  const last = asset.series[asset.series.length - 1] ?? 0;
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "0.75rem 0.85rem", background: "var(--surface)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {asset.name}
          </div>
          <div className="muted" style={{ fontSize: "0.72rem" }}>{asset.typeLabel}</div>
        </div>
        <span aria-hidden style={{ width: 9, height: 9, borderRadius: 2, background: typeColor(asset.typeSlug), marginTop: 4, flex: "none" }} />
      </div>
      <div style={{ fontWeight: 700, fontSize: "1rem", margin: "0.35rem 0 0.1rem", fontVariantNumeric: "tabular-nums" }}>
        {formatMoney(last, baseCurrency)}
      </div>
      <DeltaText delta={last - first} since={since} baseCurrency={baseCurrency} />
      <div style={{ marginTop: 6 }}>
        <MiniTrend series={asset.series} />
      </div>
    </div>
  );
}

function DeltaText({ delta, since, baseCurrency }: { delta: number; since: string; baseCurrency: string }) {
  const flat = Math.abs(delta) < 1;
  const color = flat ? "var(--muted)" : delta > 0 ? "var(--status-good)" : "var(--status-warning)";
  return (
    <div style={{ fontSize: "0.74rem", color, fontWeight: 600 }}>
      {flat ? "— no change" : `${delta > 0 ? "▲" : "▼"} ${formatMoney(Math.abs(delta), baseCurrency)}`}
      <span className="muted" style={{ fontWeight: 500 }}> since {since}</span>
    </div>
  );
}

function MiniTrend({ series }: { series: number[] }) {
  const W = 210;
  const H = 52;
  const pt = 8;
  const pb = 8;
  const pl = 3;
  const pr = 7;
  let mn = Math.min(...series);
  let mx = Math.max(...series);
  if (mx === mn) {
    const pad = Math.abs(mx) * 0.05 || 1;
    mn -= pad;
    mx += pad;
  }
  const X = (i: number) => pl + (series.length < 2 ? 0.5 : i / (series.length - 1)) * (W - pl - pr);
  const Y = (v: number) => pt + (1 - (v - mn) / (mx - mn)) * (H - pt - pb);
  const pts = series.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const area = `${X(0).toFixed(1)},${(H - pb).toFixed(1)} ${pts} ${X(series.length - 1).toFixed(1)},${(H - pb).toFixed(1)}`;
  const last = series[series.length - 1]!;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Value trend" style={{ width: "100%", height: "auto", display: "block" }}>
      <polygon points={area} fill="var(--accent)" opacity={0.12} />
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={X(series.length - 1)} cy={Y(last)} r={3.5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
    </svg>
  );
}

function StackedAreaChart({ periods, assets, baseCurrency }: { periods: string[]; assets: Asset[]; baseCurrency: string }) {
  // Aggregate holdings into their asset TYPE so each band is one categorical
  // colour (a per-holding stack would exceed the palette for a large household).
  const typeMap = new Map<string, { slug: string; label: string; series: number[] }>();
  for (const a of assets) {
    let t = typeMap.get(a.typeSlug);
    if (!t) {
      t = { slug: a.typeSlug, label: a.typeLabel, series: new Array<number>(periods.length).fill(0) };
      typeMap.set(a.typeSlug, t);
    }
    a.series.forEach((v, i) => {
      t!.series[i] += v;
    });
  }
  const lastOf = (s: number[]) => s[s.length - 1] ?? 0;
  const types = [...typeMap.values()].sort((x, y) => lastOf(y.series) - lastOf(x.series)); // biggest at bottom

  const W = 660;
  const H = 250;
  const pl = 8;
  const pr = 14;
  const pt = 16;
  const pb = 28;
  const totals = periods.map((_, i) => types.reduce((s, t) => s + t.series[i]!, 0));
  const mx = Math.max(...totals) || 1;
  const X = (i: number) => pl + (periods.length < 2 ? 0 : i / (periods.length - 1)) * (W - pl - pr);
  const Y = (v: number) => pt + (1 - v / mx) * (H - pt - pb);

  const bands: ReactNode[] = [];
  const cum = periods.map(() => 0);
  for (const t of types) {
    const lower = cum.slice();
    const upper = periods.map((_, i) => cum[i]! + t.series[i]!);
    let d = `M ${X(0).toFixed(1)} ${Y(upper[0]!).toFixed(1)}`;
    for (let i = 1; i < periods.length; i++) d += ` L ${X(i).toFixed(1)} ${Y(upper[i]!).toFixed(1)}`;
    for (let i = periods.length - 1; i >= 0; i--) d += ` L ${X(i).toFixed(1)} ${Y(lower[i]!).toFixed(1)}`;
    bands.push(
      <path key={t.slug} d={`${d} Z`} fill={typeColor(t.slug)} stroke="var(--surface)" strokeWidth={2} strokeLinejoin="round" />,
    );
    for (let i = 0; i < periods.length; i++) cum[i] = upper[i]!;
  }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Asset composition over time" style={{ width: "100%", height: "auto", display: "block" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const gy = pt + (H - pt - pb) * f;
          return <line key={f} x1={pl} y1={gy} x2={W - pr} y2={gy} stroke="var(--border)" strokeWidth={1} opacity={0.7} />;
        })}
        {bands}
        <text x={pl} y={H - 9} textAnchor="start" fontSize={11} fill="var(--muted)">{formatMonthShort(periods[0]!)}</text>
        <text x={W - pr} y={H - 9} textAnchor="end" fontSize={11} fill="var(--muted)">{formatMonthShort(periods[periods.length - 1]!)}</text>
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem 1rem", marginTop: "0.7rem" }}>
        {types.map((t) => (
          <div key={t.slug} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem" }}>
            <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: typeColor(t.slug) }} />
            {t.label}
            <span className="muted" style={{ fontVariantNumeric: "tabular-nums" }}>{formatMoney(lastOf(t.series), baseCurrency)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
