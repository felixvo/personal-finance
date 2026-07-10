import Link from "next/link";
import { notFound } from "next/navigation";
import { requireHousehold } from "@/lib/session";
import { formatMoney, formatPercent } from "@/lib/format";

const CATEGORY_LABELS: Record<string, string> = {
  ACTIVE_INCOME: "Active income",
  PASSIVE_INCOME: "Passive income",
  EXPENSE: "Expense",
  INVESTMENT_CONTRIBUTION: "Investment contribution",
};

export default async function SnapshotDetailPage({
  params,
}: {
  params: Promise<{ snapshotId: string }>;
}) {
  const { snapshotId } = await params;
  const { caller, member } = await requireHousehold();
  const cur = member.household.baseCurrency;

  const snap = await caller.snapshot.getById({ snapshotId }).catch(() => null);
  if (!snap) notFound();

  const money = (v: string | null) => (v != null ? formatMoney(Number(v), cur) : "—");
  const tiles = [
    { label: "Net Worth", value: money(snap.netWorth) },
    { label: "Investable", value: money(snap.investable) },
    { label: "Cash", value: money(snap.cash) },
    { label: "Passive Income", value: money(snap.passive) },
    {
      label: "Savings Rate",
      value: snap.savingsRate != null ? formatPercent(Number(snap.savingsRate)) : "—",
    },
  ];

  return (
    <main style={{ maxWidth: "44rem", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <p className="eyebrow">
          Check-in · {snap.periodMonth}
          {snap.edited ? " · edited" : ""}
        </p>
        <Link href="/timeline" className="muted" style={{ fontSize: "0.85rem" }}>
          Timeline
        </Link>
      </div>
      <h1 className="title" style={{ marginTop: "0.4rem" }}>
        {snap.periodMonth}
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(8.5rem, 1fr))",
          gap: "0.75rem",
          marginBottom: "1.5rem",
        }}
      >
        {tiles.map((t) => (
          <div key={t.label} style={{ border: "1px solid var(--border)", borderRadius: "12px", padding: "0.85rem 0.95rem", background: "var(--surface)" }}>
            <p className="muted" style={{ margin: 0, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {t.label}
            </p>
            <p style={{ margin: "0.3rem 0 0", fontSize: "1.1rem", fontWeight: 700 }}>{t.value}</p>
          </div>
        ))}
      </div>

      <section className="card" style={{ maxWidth: "none", marginBottom: "1.25rem" }}>
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.05rem" }}>Holdings</h2>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {snap.holdings.map((h) => (
            <li key={h.holdingId} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", fontSize: "0.9rem" }}>
              <span>
                {h.name}{" "}
                <span className="muted">
                  · {h.typeLabel}
                  {h.classification === "LIABILITY" ? " (liability)" : ""}
                </span>
              </span>
              <span style={{ fontWeight: 600 }}>
                {h.classification === "LIABILITY" ? "−" : ""}
                {formatMoney(Number(h.valueBase), cur)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {snap.cashFlows.length > 0 && (
        <section className="card" style={{ maxWidth: "none" }}>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.05rem" }}>Income &amp; Expenses</h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {snap.cashFlows.map((cf) => (
              <li key={cf.id} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", fontSize: "0.9rem" }}>
                <span>
                  {cf.label} <span className="muted">· {CATEGORY_LABELS[cf.category] ?? cf.category}</span>
                </span>
                <span style={{ fontWeight: 600 }}>{formatMoney(Number(cf.amount), cur)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {snap.notes && (
        <p className="muted" style={{ marginTop: "1.25rem", fontSize: "0.9rem" }}>
          {snap.notes}
        </p>
      )}
    </main>
  );
}
