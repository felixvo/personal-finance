"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";
import { formatMoney } from "@/lib/format";

const CATEGORY_LABELS: Record<string, string> = {
  ACTIVE_INCOME: "Active income",
  PASSIVE_INCOME: "Passive income",
  EXPENSE: "Expense",
  INVESTMENT_CONTRIBUTION: "Investment contribution",
};
const CATEGORY_OPTIONS = Object.keys(CATEGORY_LABELS);

type Snapshot = RouterOutputs["snapshot"]["getById"];
type CashCat = "ACTIVE_INCOME" | "PASSIVE_INCOME" | "EXPENSE" | "INVESTMENT_CONTRIBUTION";

export function SnapshotEditForm({
  snapshot,
  baseCurrency,
}: {
  snapshot: Snapshot;
  baseCurrency: string;
}) {
  const router = useRouter();
  const edit = trpc.snapshot.edit.useMutation();

  const [holdings, setHoldings] = useState(
    snapshot.holdings.map((h) => ({
      holdingId: h.holdingId,
      name: h.name,
      currency: h.currency,
      typeLabel: h.typeLabel,
      classification: h.classification,
      isBase: h.currency === baseCurrency,
      value: h.value,
      fxRateToBase: h.fxRateToBase,
    })),
  );
  const [cashRows, setCashRows] = useState(
    snapshot.cashFlows.map((cf, i) => ({
      key: i,
      category: cf.category as string,
      label: cf.label,
      amount: cf.amount,
    })),
  );
  const [nextKey, setNextKey] = useState(snapshot.cashFlows.length);
  const [err, setErr] = useState<string | null>(null);

  const setHolding = (id: string, patch: Partial<{ value: string; fxRateToBase: string }>) =>
    setHoldings((prev) => prev.map((h) => (h.holdingId === id ? { ...h, ...patch } : h)));
  const setCash = (key: number, patch: Partial<{ category: string; label: string; amount: string }>) =>
    setCashRows((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  const removeCash = (key: number) => setCashRows((prev) => prev.filter((c) => c.key !== key));
  const addCash = () => {
    setCashRows((prev) => [...prev, { key: nextKey, category: "ACTIVE_INCOME", label: "", amount: "" }]);
    setNextKey((k) => k + 1);
  };

  // Live net-worth preview, mirroring the calc-engine's asset/liability signing.
  const preview = useMemo(
    () =>
      holdings.reduce((sum, h) => {
        const base = Number(h.value) * (h.isBase ? 1 : Number(h.fxRateToBase) || 0);
        const signed = h.classification === "ASSET" ? base : -base;
        return sum + (Number.isFinite(signed) ? signed : 0);
      }, 0),
    [holdings],
  );

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await edit.mutateAsync({
        snapshotId: snapshot.id,
        holdings: holdings.map((h) => ({
          holdingId: h.holdingId,
          value: h.value,
          fxRateToBase: h.isBase ? undefined : h.fxRateToBase,
        })),
        cashFlows: cashRows.map((c) => ({
          category: c.category as CashCat,
          label: c.label,
          amount: c.amount,
        })),
      });
      router.push(`/timeline/${snapshot.id}`);
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not save changes.");
    }
  }

  const row: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "0.75rem",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    padding: "0.55rem 0.8rem",
  };

  return (
    <form onSubmit={onSave} style={{ maxWidth: "48rem", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <p className="eyebrow">Edit check-in · {snapshot.periodMonth}</p>
        <Link href={`/timeline/${snapshot.id}`} className="muted" style={{ fontSize: "0.85rem" }}>
          Cancel
        </Link>
      </div>
      <h1 className="title" style={{ marginTop: "0.4rem" }}>
        Correct {snapshot.periodMonth}
      </h1>
      <p className="muted" style={{ marginTop: 0, fontSize: "0.85rem" }}>
        Fix a recorded value or income/expense line. Saving recomputes this month&rsquo;s figures and
        marks it edited.
      </p>

      {/* ---- Holdings ---- */}
      <section className="card" style={{ maxWidth: "none", marginTop: "1.25rem" }}>
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.05rem" }}>Holdings</h2>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {holdings.map((h) => (
            <li key={h.holdingId} style={row}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>
                  {h.name}{" "}
                  <span className="muted" style={{ fontWeight: 400 }}>
                    · {h.typeLabel}
                    {h.classification === "LIABILITY" ? " (liability)" : ""}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <input
                  className="input"
                  inputMode="decimal"
                  value={h.value}
                  onChange={(e) => setHolding(h.holdingId, { value: e.target.value })}
                  aria-label={`${h.name} value`}
                  style={{ width: "7.5rem", padding: "0.35rem 0.5rem" }}
                />
                <span className="muted" style={{ fontSize: "0.8rem" }}>
                  {h.currency}
                </span>
                {!h.isBase && (
                  <input
                    className="input"
                    inputMode="decimal"
                    value={h.fxRateToBase}
                    onChange={(e) => setHolding(h.holdingId, { fxRateToBase: e.target.value })}
                    title={`Price of 1 ${h.currency} in ${baseCurrency}`}
                    aria-label={`${h.name} rate`}
                    style={{ width: "8.5rem", padding: "0.35rem 0.5rem" }}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- Income & Expenses ---- */}
      <section className="card" style={{ maxWidth: "none", marginTop: "1.25rem" }}>
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.05rem" }}>Income &amp; Expenses</h2>
        {cashRows.length > 0 ? (
          <ul style={{ listStyle: "none", margin: "0 0 0.75rem", padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {cashRows.map((c) => (
              <li key={c.key} style={{ ...row, flexWrap: "wrap" }}>
                <select
                  className="select"
                  value={c.category}
                  onChange={(e) => setCash(c.key, { category: e.target.value })}
                  aria-label="Category"
                  style={{ width: "auto", flex: "0 0 auto" }}
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  value={c.label}
                  onChange={(e) => setCash(c.key, { label: e.target.value })}
                  placeholder="Salary"
                  aria-label="Label"
                  style={{ flex: "1 1 7rem", minWidth: "6rem" }}
                />
                <input
                  className="input"
                  inputMode="decimal"
                  value={c.amount}
                  onChange={(e) => setCash(c.key, { amount: e.target.value })}
                  placeholder="0"
                  aria-label="Amount"
                  style={{ width: "7.5rem", flex: "0 0 auto" }}
                />
                <button className="btn-ghost" type="button" onClick={() => removeCash(c.key)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted" style={{ fontSize: "0.9rem" }}>
            No income or expense lines.
          </p>
        )}
        <button className="btn-ghost" type="button" onClick={addCash}>
          + Add line
        </button>
      </section>

      {/* ---- Save ---- */}
      <section className="card" style={{ maxWidth: "none", marginTop: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" }}>
          <span className="muted">Net worth (preview)</span>
          <span style={{ fontSize: "1.4rem", fontWeight: 700 }}>{formatMoney(preview, baseCurrency)}</span>
        </div>
        {err && <p className="error">{err}</p>}
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <button className="btn" type="submit" disabled={edit.isPending} style={{ width: "auto", padding: "0.55rem 1.1rem" }}>
            {edit.isPending ? "Saving…" : "Save changes"}
          </button>
          <Link href={`/timeline/${snapshot.id}`} className="btn-ghost" style={{ textDecoration: "none" }}>
            Cancel
          </Link>
        </div>
      </section>
    </form>
  );
}
