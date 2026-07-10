"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/trpc/react";
import { formatMoney } from "@/lib/format";

const CATEGORY_LABELS: Record<string, string> = {
  ACTIVE_INCOME: "Active income",
  PASSIVE_INCOME: "Passive income",
  EXPENSE: "Expense",
  INVESTMENT_CONTRIBUTION: "Investment contribution",
};
const CATEGORY_OPTIONS = Object.keys(CATEGORY_LABELS);

export function CheckInWizard({ baseCurrency }: { baseCurrency: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const draftQ = trpc.checkIn.getDraft.useQuery();
  const typesQ = trpc.holding.listTypes.useQuery();

  const invalidate = () => utils.checkIn.getDraft.invalidate();
  const createHolding = trpc.holding.create.useMutation({ onSuccess: invalidate });
  const addCashFlow = trpc.checkIn.addCashFlow.useMutation({ onSuccess: invalidate });
  const removeCashFlow = trpc.checkIn.removeCashFlow.useMutation({ onSuccess: invalidate });
  const complete = trpc.checkIn.complete.useMutation();

  // holding form
  const [hName, setHName] = useState("");
  const [hType, setHType] = useState("");
  const [hInst, setHInst] = useState("");
  const [hCurrency, setHCurrency] = useState(baseCurrency);
  const [hValue, setHValue] = useState("");
  const [hFx, setHFx] = useState("");
  const [hErr, setHErr] = useState<string | null>(null);

  // cash-flow form
  const [cCat, setCCat] = useState("ACTIVE_INCOME");
  const [cLabel, setCLabel] = useState("");
  const [cAmount, setCAmount] = useState("");
  const [cErr, setCErr] = useState<string | null>(null);

  const [completeErr, setCompleteErr] = useState<string | null>(null);

  const draft = draftQ.data;
  const needsFx = hCurrency.trim().toUpperCase() !== baseCurrency;

  const netWorthPreview = (draft?.holdings ?? []).reduce(
    (sum, h) => sum + (h.classification === "ASSET" ? Number(h.valueBase) : -Number(h.valueBase)),
    0,
  );

  async function onAddHolding(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setHErr(null);
    try {
      await createHolding.mutateAsync({
        name: hName,
        holdingTypeId: hType,
        institution: hInst.trim() || undefined,
        currency: hCurrency,
        value: hValue,
        fxRateToBase: needsFx ? hFx : undefined,
      });
      setHName("");
      setHInst("");
      setHValue("");
      setHFx("");
    } catch (err) {
      setHErr(err instanceof Error ? err.message : "Could not add holding.");
    }
  }

  async function onAddCashFlow(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCErr(null);
    if (!draft) return;
    try {
      await addCashFlow.mutateAsync({
        snapshotId: draft.id,
        category: cCat as "ACTIVE_INCOME" | "PASSIVE_INCOME" | "EXPENSE" | "INVESTMENT_CONTRIBUTION",
        label: cLabel,
        amount: cAmount,
      });
      setCLabel("");
      setCAmount("");
    } catch (err) {
      setCErr(err instanceof Error ? err.message : "Could not add line.");
    }
  }

  async function onComplete() {
    if (!draft) return;
    setCompleteErr(null);
    try {
      await complete.mutateAsync({ snapshotId: draft.id });
      router.push("/");
      router.refresh();
    } catch (err) {
      setCompleteErr(err instanceof Error ? err.message : "Could not complete the check-in.");
    }
  }

  if (draftQ.isPending) {
    return (
      <main className="center-shell">
        <p className="muted">Loading your check-in…</p>
      </main>
    );
  }
  if (!draft) {
    return (
      <main className="center-shell">
        <div className="card">
          <p className="muted">No open check-in.</p>
          <Link href="/">Back to Home</Link>
        </div>
      </main>
    );
  }

  const assets = typesQ.data?.filter((t) => t.classification === "ASSET") ?? [];
  const liabilities = typesQ.data?.filter((t) => t.classification === "LIABILITY") ?? [];

  return (
    <main style={{ maxWidth: "48rem", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <p className="eyebrow">Financial Check-in</p>
        <Link href="/" className="muted" style={{ fontSize: "0.85rem" }}>
          Save &amp; exit
        </Link>
      </div>
      <h1 className="title" style={{ marginTop: "0.4rem" }}>
        Record where you stand
      </h1>
      <p className="muted" style={{ marginTop: 0, fontSize: "0.85rem" }}>
        Your progress saves automatically — you can leave and resume anytime.
      </p>

      {/* ---- Holdings ---- */}
      <section className="card" style={{ maxWidth: "none", marginTop: "1.25rem" }}>
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.05rem" }}>Holdings</h2>

        {draft.holdings.length === 0 ? (
          <p className="muted" style={{ fontSize: "0.9rem" }}>No holdings yet. Add your accounts, investments, property, and debts below.</p>
        ) : (
          <ul style={{ listStyle: "none", margin: "0 0 1rem", padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {draft.holdings.map((h) => (
              <HoldingRow
                key={h.holdingId}
                h={h}
                baseCurrency={baseCurrency}
                snapshotId={draft.id}
                onChanged={invalidate}
              />
            ))}
          </ul>
        )}

        <form onSubmit={onAddHolding} style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
          {hErr && <p className="error">{hErr}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="field">
              <label htmlFor="h-name">Name</label>
              <input id="h-name" className="input" required value={hName} onChange={(e) => setHName(e.target.value)} placeholder="Vietcombank checking" />
            </div>
            <div className="field">
              <label htmlFor="h-type">Type</label>
              <select id="h-type" className="select" required value={hType} onChange={(e) => setHType(e.target.value)}>
                <option value="" disabled>
                  Choose a type…
                </option>
                <optgroup label="Assets">
                  {assets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Liabilities">
                  {liabilities.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div className="field">
              <label htmlFor="h-inst">Institution (optional)</label>
              <input id="h-inst" className="input" value={hInst} onChange={(e) => setHInst(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="h-cur">Currency</label>
              <input
                id="h-cur"
                className="input"
                required
                value={hCurrency}
                onChange={(e) => setHCurrency(e.target.value.toUpperCase())}
                placeholder={baseCurrency}
              />
            </div>
            <div className="field">
              <label htmlFor="h-val">{needsFx ? "Amount (native units)" : "Value"}</label>
              <input id="h-val" className="input" inputMode="decimal" required value={hValue} onChange={(e) => setHValue(e.target.value)} placeholder="0" />
            </div>
            {needsFx && (
              <div className="field">
                <label htmlFor="h-fx">Price of 1 {hCurrency.trim().toUpperCase()} in {baseCurrency}</label>
                <input id="h-fx" className="input" inputMode="decimal" required value={hFx} onChange={(e) => setHFx(e.target.value)} placeholder="0" />
              </div>
            )}
          </div>
          <button className="btn" type="submit" disabled={createHolding.isPending} style={{ width: "auto", padding: "0.55rem 1.1rem" }}>
            {createHolding.isPending ? "Adding…" : "Add holding"}
          </button>
        </form>
      </section>

      {/* ---- Income & Expenses ---- */}
      <section className="card" style={{ maxWidth: "none", marginTop: "1.25rem" }}>
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.05rem" }}>Income &amp; Expenses</h2>

        {draft.cashFlows.length > 0 && (
          <ul style={{ listStyle: "none", margin: "0 0 1rem", padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {draft.cashFlows.map((cf) => (
              <li
                key={cf.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "0.5rem 0.8rem",
                }}
              >
                <div style={{ fontSize: "0.9rem" }}>
                  {cf.label}{" "}
                  <span className="muted">· {CATEGORY_LABELS[cf.category] ?? cf.category}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{formatMoney(Number(cf.amount), baseCurrency)}</span>
                  <button className="btn-ghost" type="button" onClick={() => removeCashFlow.mutate({ id: cf.id })}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={onAddCashFlow} style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
          {cErr && <p className="error">{cErr}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
            <div className="field">
              <label htmlFor="c-cat">Category</label>
              <select id="c-cat" className="select" value={cCat} onChange={(e) => setCCat(e.target.value)}>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="c-label">Label</label>
              <input id="c-label" className="input" required value={cLabel} onChange={(e) => setCLabel(e.target.value)} placeholder="Salary" />
            </div>
            <div className="field">
              <label htmlFor="c-amt">Amount ({baseCurrency})</label>
              <input id="c-amt" className="input" inputMode="decimal" required value={cAmount} onChange={(e) => setCAmount(e.target.value)} placeholder="0" />
            </div>
          </div>
          <button className="btn" type="submit" disabled={addCashFlow.isPending} style={{ width: "auto", padding: "0.55rem 1.1rem" }}>
            {addCashFlow.isPending ? "Adding…" : "Add line"}
          </button>
        </form>
      </section>

      {/* ---- Review & Complete ---- */}
      <section className="card" style={{ maxWidth: "none", marginTop: "1.25rem" }}>
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.05rem" }}>Review &amp; Complete</h2>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" }}>
          <span className="muted">Net worth (preview)</span>
          <span style={{ fontSize: "1.4rem", fontWeight: 700 }}>{formatMoney(netWorthPreview, baseCurrency)}</span>
        </div>
        {completeErr && <p className="error">{completeErr}</p>}
        <button
          className="btn"
          type="button"
          onClick={onComplete}
          disabled={complete.isPending || draft.holdings.length === 0}
        >
          {complete.isPending ? "Completing…" : "Complete check-in"}
        </button>
        {draft.holdings.length === 0 && (
          <p className="muted" style={{ margin: "0.6rem 0 0", fontSize: "0.8rem", textAlign: "center" }}>
            Add at least one holding to complete.
          </p>
        )}
      </section>
    </main>
  );
}

type DraftHolding = {
  holdingId: string;
  name: string;
  typeLabel: string;
  classification: string;
  currency: string;
  value: string;
  fxRateToBase: string;
  valueBase: string;
};

function HoldingRow({
  h,
  baseCurrency,
  snapshotId,
  onChanged,
}: {
  h: DraftHolding;
  baseCurrency: string;
  snapshotId: string;
  onChanged: () => void;
}) {
  const update = trpc.checkIn.updateHoldingValue.useMutation({ onSuccess: onChanged });
  const remove = trpc.holding.removeFromDraft.useMutation({ onSuccess: onChanged });
  const [value, setValue] = useState(h.value);
  const [fx, setFx] = useState(h.fxRateToBase);
  const foreign = h.currency !== baseCurrency;

  function commit() {
    const changed = value !== h.value || (foreign && fx !== h.fxRateToBase);
    if (changed && value.trim()) {
      update.mutate({ snapshotId, holdingId: h.holdingId, value, fxRateToBase: foreign ? fx : undefined });
    }
  }

  return (
    <li
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "1rem",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "0.55rem 0.8rem",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>
          {h.name}{" "}
          <span className="muted" style={{ fontWeight: 400 }}>
            · {h.typeLabel}
            {h.classification === "LIABILITY" ? " (liability)" : ""}
          </span>
        </div>
        <div className="muted" style={{ fontSize: "0.78rem" }}>
          → {formatMoney(Number(h.valueBase), baseCurrency)}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <input
          className="input"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          aria-label={`${h.name} value`}
          style={{ width: "7.5rem", padding: "0.35rem 0.5rem" }}
        />
        <span className="muted" style={{ fontSize: "0.8rem" }}>
          {h.currency}
        </span>
        {foreign && (
          <input
            className="input"
            inputMode="decimal"
            value={fx}
            onChange={(e) => setFx(e.target.value)}
            onBlur={commit}
            title={`Price of 1 ${h.currency} in ${baseCurrency}`}
            aria-label={`${h.name} rate`}
            style={{ width: "8.5rem", padding: "0.35rem 0.5rem" }}
          />
        )}
        <button className="btn-ghost" type="button" onClick={() => remove.mutate({ holdingId: h.holdingId })}>
          Remove
        </button>
      </div>
    </li>
  );
}
