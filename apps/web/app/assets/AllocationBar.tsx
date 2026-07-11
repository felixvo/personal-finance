import { formatMoney } from "@/lib/format";

/**
 * Horizontal 100% stacked bar for part-to-whole allocation (dataviz form for
 * categorical magnitude; docs/06 §3 — a bar, not a donut). Segments are
 * separated by a 2px surface gap (secondary encoding) and each carries a native
 * hover tooltip; a legend below direct-labels identity + share (the relief rule,
 * since some validated slots sit below 3:1 on the light surface).
 */
export function AllocationBar({
  items,
  currency,
}: {
  items: { label: string; value: number; color: string }[];
  currency: string;
}) {
  const shown = items.filter((i) => i.value > 0);
  const total = shown.reduce((s, i) => s + i.value, 0) || 1;
  const pct = (v: number) => Math.round((v / total) * 100);

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "2px",
          height: "26px",
          borderRadius: "7px",
          overflow: "hidden",
          background: "var(--plane)",
        }}
      >
        {shown.map((i) => (
          <div
            key={i.label}
            title={`${i.label}: ${formatMoney(i.value, currency)} (${pct(i.value)}%)`}
            style={{ flexGrow: i.value, flexBasis: 0, background: i.color }}
          />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem 0.9rem", marginTop: "0.65rem" }}>
        {shown.map((i) => (
          <span key={i.label} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem" }}>
            <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: i.color, flexShrink: 0 }} />
            {i.label} <b style={{ fontVariantNumeric: "tabular-nums" }}>{pct(i.value)}%</b>
          </span>
        ))}
      </div>
    </div>
  );
}
