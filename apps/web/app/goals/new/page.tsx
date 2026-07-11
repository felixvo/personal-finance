import Link from "next/link";
import { requireHousehold } from "@/lib/session";
import { NewGoalForm } from "./NewGoalForm";

export default async function NewGoalPage() {
  const { member } = await requireHousehold();

  return (
    <main className="center-shell">
      <div className="card" style={{ maxWidth: "30rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <p className="eyebrow">New goal</p>
          <Link href="/goals" className="muted" style={{ fontSize: "0.85rem" }}>
            Goals
          </Link>
        </div>
        <h1 className="title">Set a goal</h1>
        <NewGoalForm baseCurrency={member.household.baseCurrency} />
      </div>
    </main>
  );
}
