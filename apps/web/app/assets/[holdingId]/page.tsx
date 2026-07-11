import Link from "next/link";
import { notFound } from "next/navigation";
import { requireHousehold } from "@/lib/session";
import { formatMoney, formatMonthShort } from "@/lib/format";
import { NetWorthTrend } from "@/components/NetWorthTrend";

export default async function HoldingDetailPage({ params }: { params: Promise<{ holdingId: string }> }) {
  const { holdingId } = await params;
  const { caller, member } = await requireHousehold();
  const cur = member.household.baseCurrency;

  const h = await caller.holding.getDetail({ holdingId }).catch(() => null);
  if (!h) notFound();

  const periods = h.history.map((p) => p.periodMonth);
  const values = h.history.map((p) => Number(p.valueBase));
  const showNative = h.currency !== cur;

  return (
    <main style={{ maxWidth: "44rem", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <p className="eyebrow">Holding · {h.typeLabel}</p>
        <Link href="/assets" className="muted" style={{ fontSize: "0.85rem" }}>
          Assets
        </Link>
      </div>
      <h1 className="title" style={{ marginTop: "0.4rem" }}>
        {h.name}
      </h1>
      <p className="muted" style={{ marginTop: 0, fontSize: "0.9rem" }}>
        {h.currency}
        {h.institution ? ` · ${h.institution}` : ""}
        {h.classification === "LIABILITY" ? " · liability" : ""}
        {h.status === "ARCHIVED" ? " · archived" : ""}
      </p>

      <section className="card" style={{ maxWidth: "none", marginTop: "0.5rem" }}>
        <h2 style={{ margin: "0 0 0.2rem", fontSize: "0.95rem" }}>Value over time</h2>
        <p className="muted" style={{ margin: "0 0 0.8rem", fontSize: "0.8rem" }}>
          In {cur}, across your completed check-ins.
        </p>
        {h.history.length >= 2 ? (
          <NetWorthTrend periods={periods} values={values} baseCurrency={cur} ariaLabel={`${h.name} value over time`} />
        ) : (
          <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>
            {h.history.length === 1
              ? "Recorded in one check-in so far — two are needed to chart a trend."
              : "Not recorded in a completed check-in yet."}
          </p>
        )}
      </section>

      {h.history.length > 0 && (
        <section className="card" style={{ maxWidth: "none", marginTop: "1rem" }}>
          <h2 style={{ margin: "0 0 0.6rem", fontSize: "0.95rem" }}>History</h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {[...h.history].reverse().map((p) => (
              <li key={p.periodMonth} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", fontSize: "0.88rem" }}>
                <span className="muted">{formatMonthShort(p.periodMonth)}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatMoney(Number(p.valueBase), cur)}
                  {showNative && (
                    <span className="muted" style={{ fontSize: "0.8rem" }}>
                      {" · "}
                      {Number(p.value).toLocaleString("en-US", { maximumFractionDigits: 8 })} {h.currency}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
