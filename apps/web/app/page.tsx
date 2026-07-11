import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { serverCaller } from "@/server/caller";
import { formatMoney, formatPercent } from "@/lib/format";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const caller = await serverCaller();
  const me = await caller.me.get();
  if (!me.member) redirect("/onboarding");
  const household = me.member.household;

  const status = await caller.checkIn.getStatus();

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }
  async function startCheckin() {
    "use server";
    const c = await serverCaller();
    await c.checkIn.start();
    redirect("/check-in");
  }

  const header = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: "1rem",
        marginBottom: "0.25rem",
      }}
    >
      <p className="eyebrow">{household.name}</p>
      <form action={doSignOut}>
        <button className="btn-ghost" type="submit">
          Sign out
        </button>
      </form>
    </div>
  );

  // ---- State B: dashboard (a COMPLETED snapshot exists for this period) ----
  if (status.state === "completed-this-month") {
    const { latest, previous } = await caller.snapshot.getDashboard();
    const delta =
      latest?.netWorth != null && previous?.netWorth != null
        ? Number(latest.netWorth) - Number(previous.netWorth)
        : null;
    const cur = household.baseCurrency;
    const money = (v: string | null) => (v != null ? formatMoney(Number(v), cur) : "—");

    const tiles: { label: string; value: string }[] = [
      { label: "Net Worth", value: money(latest?.netWorth ?? null) },
      { label: "Investable", value: money(latest?.investable ?? null) },
      { label: "Cash", value: money(latest?.cash ?? null) },
      { label: "Passive Income", value: money(latest?.passive ?? null) },
      {
        label: "Savings Rate",
        value: latest?.savingsRate != null ? formatPercent(Number(latest.savingsRate)) : "—",
      },
    ];

    return (
      <main className="center-shell">
        <div className="card" style={{ maxWidth: "42rem" }}>
          {header}
          <h1 className="title">Where {household.name} stands</h1>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(8.5rem, 1fr))",
              gap: "0.75rem",
            }}
          >
            {tiles.map((t) => (
              <div
                key={t.label}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "0.85rem 0.95rem",
                  background: "var(--plane)",
                }}
              >
                <p className="muted" style={{ margin: 0, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {t.label}
                </p>
                <p style={{ margin: "0.3rem 0 0", fontSize: "1.15rem", fontWeight: 700 }}>{t.value}</p>
              </div>
            ))}
          </div>
          {delta != null && (
            <p className="muted" style={{ margin: "1.4rem 0 0", fontSize: "0.85rem" }}>
              {delta >= 0 ? "+" : "−"}
              {formatMoney(Math.abs(delta), cur)} since {previous?.periodMonth}
            </p>
          )}
          <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.8rem" }}>
            Checked in for {latest?.periodMonth}. <Link href="/assets">Assets</Link> ·{" "}
            <Link href="/timeline">Timeline</Link>
          </p>
        </div>
      </main>
    );
  }

  // ---- State A / A′: check-in pending or in progress ----
  const isDraft = status.state === "draft";
  return (
    <main className="center-shell">
      <div className="card" style={{ maxWidth: "34rem" }}>
        {header}
        <h1 className="title">
          {isDraft ? "Your check-in is in progress" : "You haven’t done a check-in yet"}
        </h1>
        <p className="muted" style={{ margin: "0 0 1.5rem", lineHeight: 1.6 }}>
          A check-in is the monthly ritual at the heart of Atlas — a few minutes to record where{" "}
          {household.name} stands. It takes under five minutes.
        </p>

        {isDraft ? (
          <Link
            href="/check-in"
            className="btn"
            style={{ display: "block", textAlign: "center", textDecoration: "none" }}
          >
            Resume Check-in
          </Link>
        ) : (
          <form action={startCheckin}>
            <button className="btn" type="submit">
              Start Financial Check-in
            </button>
          </form>
        )}

        <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "1.5rem 0 1rem" }} />
        <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
          Signed in as {session.user.email} · base currency {household.baseCurrency} · check-in day{" "}
          {household.checkInDay}
        </p>
      </div>
    </main>
  );
}
