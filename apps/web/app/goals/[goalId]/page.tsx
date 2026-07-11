import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { requireHousehold } from "@/lib/session";
import { serverCaller } from "@/server/caller";
import { formatMoney } from "@/lib/format";
import { ProgressBar, PaceBadge, projectionText, paceStatusOf, TYPE_LABELS, GoalSparkline } from "../GoalViews";

export default async function GoalDetailPage({ params }: { params: Promise<{ goalId: string }> }) {
  const { goalId } = await params;
  const { caller, member } = await requireHousehold();
  const cur = member.household.baseCurrency;

  const g = await caller.goal.get({ goalId }).catch(() => null);
  if (!g) notFound();

  async function archiveGoal() {
    "use server";
    const c = await serverCaller();
    await c.goal.archive({ goalId });
    redirect("/goals");
  }

  return (
    <main style={{ maxWidth: "40rem", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <p className="eyebrow">Goal · {TYPE_LABELS[g.type] ?? g.type}</p>
        <Link href="/goals" className="muted" style={{ fontSize: "0.85rem" }}>
          Goals
        </Link>
      </div>
      <h1 className="title" style={{ marginTop: "0.4rem" }}>
        {g.name}
      </h1>

      <div className="card" style={{ maxWidth: "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            {formatMoney(Number(g.tracked), cur)} of {formatMoney(Number(g.target), cur)}
          </span>
          <span style={{ fontSize: "1.4rem", fontWeight: 700 }}>
            {g.rawPct != null ? `${Math.round(g.rawPct * 100)}%` : "—"}
          </span>
        </div>
        <ProgressBar pct={g.pct} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem" }}>
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            {projectionText(g.projection)}
            {g.targetDate ? ` · target ${g.targetDate}` : ""}
          </span>
          <PaceBadge status={paceStatusOf(g.projection)} />
        </div>
      </div>

      <section className="card" style={{ maxWidth: "none", marginTop: "1rem" }}>
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>Progress over time</h2>
        <GoalSparkline history={g.history} target={Number(g.target)} />
        <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.78rem" }}>
          Tracking{" "}
          {g.trackingMode === "NET_WORTH" ? "whole net worth" : "selected holdings"}. Dashed line is the target.
        </p>
      </section>

      <div style={{ display: "flex", gap: "0.6rem", marginTop: "1.25rem", alignItems: "center" }}>
        <Link
          href={`/goals/${goalId}/edit`}
          className="btn"
          style={{ width: "auto", padding: "0.5rem 1rem", textDecoration: "none" }}
        >
          Edit goal
        </Link>
        <form action={archiveGoal}>
          <button className="btn-ghost" type="submit">
            Archive goal
          </button>
        </form>
      </div>
    </main>
  );
}
