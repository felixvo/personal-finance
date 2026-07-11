import Link from "next/link";
import { formatMoney } from "@/lib/format";
import type { RouterOutputs } from "@/trpc/react";

export const TYPE_LABELS: Record<string, string> = {
  FIRE: "FIRE",
  NET_WORTH: "Net worth",
  HOUSE_FUND: "House fund",
  EDUCATION_FUND: "Education fund",
  CUSTOM: "Custom",
};

type GoalListItem = RouterOutputs["goal"]["list"][number];
type Projection = GoalListItem["projection"];

export function ProgressBar({ pct }: { pct: number | null }) {
  const clamped = pct == null ? 0 : Math.max(0, Math.min(1, pct));
  return (
    <div style={{ height: 8, borderRadius: 999, background: "var(--plane)", overflow: "hidden" }}>
      <div style={{ width: `${clamped * 100}%`, height: "100%", background: "var(--accent)" }} />
    </div>
  );
}

export function PaceBadge({ status }: { status: "good" | "warning" | null | undefined }) {
  if (!status) return null;
  const good = status === "good";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        fontSize: "0.78rem",
        fontWeight: 600,
        color: good ? "var(--status-good)" : "var(--status-warning)",
      }}
    >
      <span aria-hidden>{good ? "✓" : "!"}</span> {good ? "On track" : "Behind pace"}
    </span>
  );
}

export function projectionText(p: Projection): string {
  switch (p.status) {
    case "insufficient-data":
      return "Not enough history yet — needs two check-ins.";
    case "achieved":
      return "Achieved 🎉";
    case "not-on-pace":
      return "Not on pace — the tracked value isn't growing.";
    case "projected":
      return `On pace for ${p.estimatedDate} (${p.monthsRemaining} mo)`;
    default:
      return "";
  }
}

export function paceStatusOf(p: Projection): "good" | "warning" | null {
  return p.status === "projected" ? p.paceStatus : null;
}

export function GoalCard({ g, cur }: { g: GoalListItem; cur: string }) {
  return (
    <Link
      href={`/goals/${g.id}`}
      className="card"
      style={{ maxWidth: "none", display: "block", textDecoration: "none", color: "inherit" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontWeight: 600 }}>
          {g.name}{" "}
          <span className="muted" style={{ fontWeight: 400, fontSize: "0.8rem" }}>
            · {TYPE_LABELS[g.type] ?? g.type}
          </span>
        </div>
        <div style={{ fontWeight: 700 }}>{g.rawPct != null ? `${Math.round(g.rawPct * 100)}%` : "—"}</div>
      </div>
      <div className="muted" style={{ fontSize: "0.8rem", margin: "0.2rem 0 0.6rem" }}>
        {formatMoney(Number(g.tracked), cur)} of {formatMoney(Number(g.target), cur)}
      </div>
      <ProgressBar pct={g.pct} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.6rem" }}>
        <span className="muted" style={{ fontSize: "0.8rem" }}>
          {projectionText(g.projection)}
        </span>
        <PaceBadge status={paceStatusOf(g.projection)} />
      </div>
    </Link>
  );
}

/** Minimal tracked-value history line with a dashed target reference. */
export function GoalSparkline({
  history,
  target,
}: {
  history: { periodMonth: string; value: string }[];
  target: number;
}) {
  if (history.length < 2) {
    return <p className="muted" style={{ fontSize: "0.85rem" }}>Two check-ins will chart your progress here.</p>;
  }
  const W = 600;
  const H = 120;
  const pad = 6;
  const values = history.map((h) => Number(h.value));
  const max = Math.max(target, ...values) * 1.05 || 1;
  const min = Math.min(0, ...values);
  const x = (i: number) => pad + (i / (history.length - 1)) * (W - 2 * pad);
  const y = (v: number) => H - pad - ((v - min) / (max - min || 1)) * (H - 2 * pad);
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const targetY = y(target).toFixed(1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Tracked value over time">
      <line x1={pad} y1={targetY} x2={W - pad} y2={targetY} stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="4 4" />
      <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1]!)} r="4" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
    </svg>
  );
}
