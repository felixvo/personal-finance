import Link from "next/link";
import { requireHousehold } from "@/lib/session";
import { formatMoney, formatPercent } from "@/lib/format";

export default async function TimelinePage() {
  const { caller, member } = await requireHousehold();
  const cur = member.household.baseCurrency;
  const snaps = await caller.snapshot.listTimeline();

  return (
    <main style={{ maxWidth: "42rem", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <p className="eyebrow">Timeline</p>
        <Link href="/" className="muted" style={{ fontSize: "0.85rem" }}>
          Home
        </Link>
      </div>
      <h1 className="title" style={{ marginTop: "0.4rem" }}>
        Your financial journal
      </h1>

      {snaps.length === 0 ? (
        <p className="muted">No check-ins yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {snaps.map((s) => (
            <li key={s.id}>
              <Link
                href={`/timeline/${s.id}`}
                className="card"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  textDecoration: "none",
                  color: "inherit",
                  maxWidth: "none",
                  padding: "1rem 1.25rem",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {s.periodMonth}
                    {s.edited && (
                      <span className="muted" style={{ fontWeight: 400, fontSize: "0.75rem" }}>
                        {" "}
                        · edited
                      </span>
                    )}
                  </div>
                  <div className="muted" style={{ fontSize: "0.8rem" }}>
                    Savings rate {s.savingsRate != null ? formatPercent(Number(s.savingsRate)) : "—"}
                  </div>
                </div>
                <div style={{ fontWeight: 700 }}>
                  {s.netWorth != null ? formatMoney(Number(s.netWorth), cur) : "—"}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
