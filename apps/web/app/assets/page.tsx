import Link from "next/link";
import { requireHousehold } from "@/lib/session";
import { formatMoney } from "@/lib/format";
import { typeColor, currencyColor } from "@/lib/chart-colors";
import { AllocationBar } from "./AllocationBar";
import { AssetTrends } from "@/components/AssetTrends";

export default async function AssetsPage() {
  const { caller, member } = await requireHousehold();
  const cur = member.household.baseCurrency;
  const data = await caller.assets.get();
  const trends = await caller.snapshot.trends();

  if (!data) {
    return (
      <main className="center-shell">
        <div className="card">
          <p className="eyebrow">Assets</p>
          <h1 className="title">Nothing here yet</h1>
          <p className="muted" style={{ marginTop: 0 }}>
            Complete a check-in first. <Link href="/">Back to Home</Link>
          </p>
        </div>
      </main>
    );
  }

  const typeItems = data.assetAllocation.map((a) => ({
    label: a.label,
    value: Number(a.value),
    color: typeColor(a.slug),
  }));
  const currencyItems = data.currencyAllocation.map((c) => ({
    label: c.currency,
    value: Number(c.value),
    color: currencyColor(c.currency),
  }));

  return (
    <main style={{ maxWidth: "44rem", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <p className="eyebrow">Assets · {data.periodMonth}</p>
        <Link href="/" className="muted" style={{ fontSize: "0.85rem" }}>
          Home
        </Link>
      </div>
      <h1 className="title" style={{ marginTop: "0.4rem" }}>
        Where your money is
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))", gap: "1rem" }}>
        <section className="card" style={{ maxWidth: "none" }}>
          <h2 style={{ margin: "0 0 0.9rem", fontSize: "0.95rem" }}>Allocation by type</h2>
          <AllocationBar items={typeItems} currency={cur} />
        </section>
        <section className="card" style={{ maxWidth: "none" }}>
          <h2 style={{ margin: "0 0 0.9rem", fontSize: "0.95rem" }}>Allocation by currency</h2>
          <AllocationBar items={currencyItems} currency={cur} />
        </section>
      </div>

      <section className="card" style={{ maxWidth: "none", marginTop: "1rem" }}>
        <h2 style={{ margin: "0 0 0.2rem", fontSize: "0.95rem" }}>How each asset changes over time</h2>
        <p className="muted" style={{ margin: "0 0 1rem", fontSize: "0.8rem" }}>
          Across your last {trends.periods.length} check-in{trends.periods.length === 1 ? "" : "s"} — “By asset” gives
          each holding its own scale; “Stacked total” shows how they compose your assets.
        </p>
        <AssetTrends periods={trends.periods} assets={trends.assets} baseCurrency={cur} />
      </section>

      {data.groups.map((g) => (
        <section key={g.slug} className="card" style={{ maxWidth: "none", marginTop: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.6rem" }}>
            <h2 style={{ margin: 0, fontSize: "0.95rem", display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
              <span
                aria-hidden
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: g.classification === "ASSET" ? typeColor(g.slug) : "var(--muted)",
                }}
              />
              {g.typeLabel}
              {g.classification === "LIABILITY" && (
                <span className="muted" style={{ fontWeight: 400, fontSize: "0.8rem" }}>
                  liability
                </span>
              )}
            </h2>
            <span style={{ fontWeight: 700 }}>
              {g.classification === "LIABILITY" ? "−" : ""}
              {formatMoney(Number(g.total), cur)}
            </span>
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {g.holdings.map((h, idx) => (
              <li key={idx} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", fontSize: "0.88rem" }}>
                <span>
                  {h.name} <span className="muted">· {h.currency}</span>
                </span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatMoney(Number(h.valueBase), cur)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
