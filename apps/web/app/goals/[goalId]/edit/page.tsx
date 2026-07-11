import Link from "next/link";
import { notFound } from "next/navigation";
import { requireHousehold } from "@/lib/session";
import { EditGoalForm } from "./EditGoalForm";

export default async function EditGoalPage({ params }: { params: Promise<{ goalId: string }> }) {
  const { goalId } = await params;
  const { caller, member } = await requireHousehold();

  const g = await caller.goal.get({ goalId }).catch(() => null);
  if (!g) notFound();

  return (
    <main className="center-shell">
      <div className="card" style={{ maxWidth: "30rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <p className="eyebrow">Edit goal</p>
          <Link href={`/goals/${goalId}`} className="muted" style={{ fontSize: "0.85rem" }}>
            Cancel
          </Link>
        </div>
        <h1 className="title">{g.name}</h1>
        <EditGoalForm
          goalId={goalId}
          baseCurrency={member.household.baseCurrency}
          initial={{
            type: g.type,
            name: g.name,
            targetAmount: g.target,
            targetDate: g.targetDate ?? undefined,
            trackingMode: g.trackingMode,
            holdingIds: g.holdingIds,
          }}
        />
      </div>
    </main>
  );
}
