import Link from "next/link";
import { requireHousehold } from "@/lib/session";
import { GoalCard } from "./GoalViews";

export default async function GoalsPage() {
  const { caller, member } = await requireHousehold();
  const cur = member.household.baseCurrency;
  const goals = await caller.goal.list();

  return (
    <main style={{ maxWidth: "44rem", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <p className="eyebrow">Goals</p>
        <Link href="/" className="muted" style={{ fontSize: "0.85rem" }}>
          Home
        </Link>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        <h1 className="title" style={{ marginTop: "0.4rem" }}>
          How long until your goals
        </h1>
        <Link
          href="/goals/new"
          className="btn"
          style={{ width: "auto", padding: "0.5rem 1rem", textDecoration: "none", whiteSpace: "nowrap" }}
        >
          New goal
        </Link>
      </div>

      {goals.length === 0 ? (
        <p className="muted">No goals yet. Create one to track progress and pace.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {goals.map((g) => (
            <GoalCard key={g.id} g={g} cur={cur} />
          ))}
        </div>
      )}
    </main>
  );
}
