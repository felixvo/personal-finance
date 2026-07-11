"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/react";

type GoalType = "FIRE" | "NET_WORTH" | "HOUSE_FUND" | "EDUCATION_FUND" | "CUSTOM";
type Mode = "NET_WORTH" | "HOLDING_SUBSET";

const TYPE_OPTIONS: { value: GoalType; label: string; defaultMode: Mode }[] = [
  { value: "FIRE", label: "FIRE", defaultMode: "NET_WORTH" },
  { value: "NET_WORTH", label: "Net worth", defaultMode: "NET_WORTH" },
  { value: "HOUSE_FUND", label: "House fund", defaultMode: "HOLDING_SUBSET" },
  { value: "EDUCATION_FUND", label: "Education fund", defaultMode: "HOLDING_SUBSET" },
  { value: "CUSTOM", label: "Custom", defaultMode: "NET_WORTH" },
];

export function NewGoalForm({ baseCurrency }: { baseCurrency: string }) {
  const router = useRouter();
  const create = trpc.goal.create.useMutation();
  const holdingsQ = trpc.holding.list.useQuery();

  const [type, setType] = useState<GoalType>("NET_WORTH");
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [mode, setMode] = useState<Mode>("NET_WORTH");
  const [holdingIds, setHoldingIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function onTypeChange(next: GoalType) {
    setType(next);
    setMode(TYPE_OPTIONS.find((t) => t.value === next)!.defaultMode);
  }
  function toggleHolding(id: string) {
    setHoldingIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    try {
      await create.mutateAsync({
        type,
        name,
        targetAmount: target,
        targetDate: targetDate || undefined,
        trackingMode: mode,
        holdingIds: mode === "HOLDING_SUBSET" ? holdingIds : undefined,
      });
      router.push("/goals");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the goal.");
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <p className="error">{error}</p>}
      <div className="field">
        <label htmlFor="g-type">Goal type</label>
        <select id="g-type" className="select" value={type} onChange={(e) => onTypeChange(e.target.value as GoalType)}>
          {TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="g-name">Name</label>
        <input id="g-name" className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Financial independence" />
      </div>
      <div className="field">
        <label htmlFor="g-target">Target amount ({baseCurrency})</label>
        <input id="g-target" className="input" inputMode="decimal" required value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0" />
      </div>
      <div className="field">
        <label htmlFor="g-date">Target date (optional)</label>
        <input id="g-date" className="input" type="month" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
      </div>

      <div className="field">
        <label>What to track</label>
        <div style={{ display: "flex", gap: "1rem", fontSize: "0.9rem" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontWeight: 400 }}>
            <input type="radio" name="mode" checked={mode === "NET_WORTH"} onChange={() => setMode("NET_WORTH")} /> Whole net worth
          </label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontWeight: 400 }}>
            <input type="radio" name="mode" checked={mode === "HOLDING_SUBSET"} onChange={() => setMode("HOLDING_SUBSET")} /> Specific holdings
          </label>
        </div>
      </div>

      {mode === "HOLDING_SUBSET" && (
        <div className="field">
          <label>Holdings to track</label>
          {holdingsQ.data && holdingsQ.data.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {holdingsQ.data.map((h) => (
                <label key={h.id} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontWeight: 400, fontSize: "0.9rem" }}>
                  <input type="checkbox" checked={holdingIds.includes(h.id)} onChange={() => toggleHolding(h.id)} />
                  {h.name} <span className="muted">· {h.currency}</span>
                </label>
              ))}
            </div>
          ) : (
            <span className="muted" style={{ fontSize: "0.8rem" }}>
              No holdings yet — add some in a check-in first, or track whole net worth.
            </span>
          )}
        </div>
      )}

      <button className="btn" type="submit" disabled={create.isPending}>
        {create.isPending ? "Creating…" : "Create goal"}
      </button>
    </form>
  );
}
