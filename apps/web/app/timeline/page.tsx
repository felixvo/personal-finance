import Link from "next/link";
import { requireHousehold } from "@/lib/session";
import { formatMoney, formatPercent } from "@/lib/format";

function HabitTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "12px", padding: "0.7rem 0.8rem", background: "var(--plane)" }}>
      <p className="muted" style={{ margin: 0, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </p>
      <p style={{ margin: "0.25rem 0 0", fontSize: "1.05rem", fontWeight: 700 }}>{value}</p>
    </div>
  );
}

export default async function TimelinePage() {
  const { caller, member } = await requireHousehold();
  const cur = member.household.baseCurrency;
  const [snaps, habit] = await Promise.all([caller.snapshot.listTimeline(), caller.metrics.checkinHabit()]);

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

      {habit.completedCount > 0 && (
        <section className="card" style={{ maxWidth: "none", margin: "0 0 1rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>Your check-in habit</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(7rem, 1fr))", gap: "0.6rem" }}>
            <HabitTile label="Current streak" value={`${habit.currentStreak} mo`} />
            {habit.completionRate != null && (
              <HabitTile label="Months covered" value={`${Math.round(habit.completionRate * 100)}%`} />
            )}
            {habit.avgCompletionMinutes != null && (
              <HabitTile
                label="Avg. time"
                value={habit.avgCompletionMinutes < 1 ? "<1 min" : `${Math.round(habit.avgCompletionMinutes)} min`}
              />
            )}
            {habit.daysToFirstCheckin != null && (
              <HabitTile label="Time to first" value={`${habit.daysToFirstCheckin}d`} />
            )}
          </div>
        </section>
      )}

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
