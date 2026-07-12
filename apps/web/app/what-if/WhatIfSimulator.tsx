"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { futureValue, solveMonths, mortgage } from "@atlas/calc-engine";
import { formatMoney } from "@/lib/format";
import { WhatIfChart } from "./WhatIfChart";

type SimType = "future-value" | "compound" | "retirement" | "goal" | "mortgage";

const TABS: { value: SimType; label: string }[] = [
  { value: "future-value", label: "Future value" },
  { value: "compound", label: "Compound" },
  { value: "retirement", label: "Retirement" },
  { value: "goal", label: "Goal projection" },
  { value: "mortgage", label: "Mortgage" },
];

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

export function WhatIfSimulator({
  baseCurrency,
  defaultCurrent,
}: {
  baseCurrency: string;
  defaultCurrent: string;
}) {
  const [type, setType] = useState<SimType>("future-value");
  const [current, setCurrent] = useState(defaultCurrent || "0");
  const [monthly, setMonthly] = useState("10000000");
  const [ret, setRet] = useState("8");
  const [years, setYears] = useState("15");
  const [target, setTarget] = useState("3000000000");
  const [withdrawal, setWithdrawal] = useState("4");
  const [loan, setLoan] = useState("2000000000");
  const [rate, setRate] = useState("9.5");
  const [term, setTerm] = useState("20");

  const money = (n: number) => formatMoney(n, baseCurrency);

  const result = useMemo(() => {
    const r = num(ret) / 100;
    switch (type) {
      case "future-value": {
        const n = Math.max(1, Math.round(num(years) * 12));
        const series = Array.from({ length: n + 1 }, (_, m) => futureValue(num(current), num(monthly), r, m).toNumber());
        const fv = series[series.length - 1]!;
        const contributed = num(current) + num(monthly) * n;
        return {
          series,
          stats: [
            { label: "Future value", value: money(fv) },
            { label: "Total contributed", value: money(contributed) },
            { label: "Growth", value: money(fv - contributed) },
          ],
        };
      }
      case "compound": {
        const n = Math.max(1, Math.round(num(years) * 12));
        const series = Array.from({ length: n + 1 }, (_, m) => futureValue(num(current), 0, r, m).toNumber());
        const fv = series[series.length - 1]!;
        return {
          series,
          stats: [
            { label: "Future value", value: money(fv) },
            { label: "Growth", value: money(fv - num(current)) },
          ],
        };
      }
      case "retirement": {
        const n = Math.max(1, Math.round(num(years) * 12));
        const series = Array.from({ length: n + 1 }, (_, m) => futureValue(num(current), num(monthly), r, m).toNumber());
        const nest = series[series.length - 1]!;
        const income = (nest * num(withdrawal)) / 100;
        return {
          series,
          stats: [
            { label: "Nest egg", value: money(nest) },
            { label: `Income at ${withdrawal || "0"}%/yr`, value: money(income) },
            { label: "Per month", value: money(income / 12) },
          ],
        };
      }
      case "goal": {
        const months = solveMonths(num(current), num(monthly), r, num(target));
        if (!Number.isFinite(months)) {
          return {
            series: [],
            stats: [{ label: "Time to target", value: "Not reachable" }],
            note: "The target can't be reached with these inputs — raise the monthly contribution or the return.",
          };
        }
        const totalMonths = Math.max(1, Math.ceil(months));
        const series = Array.from({ length: totalMonths + 1 }, (_, m) => futureValue(num(current), num(monthly), r, m).toNumber());
        const yrs = Math.floor(totalMonths / 12);
        const mos = totalMonths % 12;
        const date = new Date();
        date.setMonth(date.getMonth() + totalMonths);
        return {
          series,
          stats: [
            { label: "Time to target", value: `${yrs}y ${mos}m` },
            { label: "Target date", value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` },
          ],
        };
      }
      case "mortgage": {
        const m = mortgage(num(loan), num(rate) / 100, Math.max(1, num(term)));
        return {
          series: m.balances.map((b) => b.toNumber()),
          stats: [
            { label: "Monthly payment", value: money(m.payment.toNumber()) },
            { label: "Total interest", value: money(m.totalInterest.toNumber()) },
            { label: "Total paid", value: money(m.totalPaid.toNumber()) },
          ],
        };
      }
    }
  }, [type, current, monthly, ret, years, target, withdrawal, loan, rate, term, baseCurrency]);

  const field = (id: string, label: string, value: string, set: (v: string) => void, suffix?: string) => (
    <div className="field" key={id}>
      <label htmlFor={id}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <input id={id} className="input" inputMode="decimal" value={value} onChange={(e) => set(e.target.value)} />
        {suffix && <span className="muted" style={{ fontSize: "0.85rem" }}>{suffix}</span>}
      </div>
    </div>
  );

  const inputs: Record<SimType, React.ReactNode> = {
    "future-value": (
      <>
        {field("wf-current", "Current amount", current, setCurrent, baseCurrency)}
        {field("wf-monthly", "Monthly contribution", monthly, setMonthly, baseCurrency)}
        {field("wf-ret", "Expected annual return", ret, setRet, "%")}
        {field("wf-years", "Years", years, setYears)}
      </>
    ),
    compound: (
      <>
        {field("wf-current", "Principal", current, setCurrent, baseCurrency)}
        {field("wf-ret", "Expected annual return", ret, setRet, "%")}
        {field("wf-years", "Years", years, setYears)}
      </>
    ),
    retirement: (
      <>
        {field("wf-current", "Current savings", current, setCurrent, baseCurrency)}
        {field("wf-monthly", "Monthly contribution", monthly, setMonthly, baseCurrency)}
        {field("wf-ret", "Expected annual return", ret, setRet, "%")}
        {field("wf-years", "Years to retirement", years, setYears)}
        {field("wf-wd", "Safe withdrawal rate", withdrawal, setWithdrawal, "%")}
      </>
    ),
    goal: (
      <>
        {field("wf-current", "Current amount", current, setCurrent, baseCurrency)}
        {field("wf-monthly", "Monthly contribution", monthly, setMonthly, baseCurrency)}
        {field("wf-ret", "Expected annual return", ret, setRet, "%")}
        {field("wf-target", "Target amount", target, setTarget, baseCurrency)}
      </>
    ),
    mortgage: (
      <>
        {field("wf-loan", "Loan amount", loan, setLoan, baseCurrency)}
        {field("wf-rate", "Annual interest rate", rate, setRate, "%")}
        {field("wf-term", "Term", term, setTerm, "years")}
      </>
    ),
  };

  return (
    <main style={{ maxWidth: "44rem", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <p className="eyebrow">What If</p>
        <Link href="/" className="muted" style={{ fontSize: "0.85rem" }}>
          Home
        </Link>
      </div>
      <h1 className="title" style={{ marginTop: "0.4rem" }}>
        Play out a scenario
      </h1>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1.25rem" }}>
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            aria-pressed={t.value === type}
            onClick={() => setType(t.value)}
            className={t.value === type ? "btn" : "btn-ghost"}
            style={{ width: "auto", padding: "0.4rem 0.9rem", fontSize: "0.85rem" }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(15rem, 1fr))", gap: "1rem", alignItems: "start" }}>
        <section className="card" style={{ maxWidth: "none" }}>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>Inputs</h2>
          {inputs[type]}
          <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.72rem" }}>
            Returns compound monthly at rate ÷ 12; contributions at month-end.
          </p>
        </section>

        <section className="card" style={{ maxWidth: "none" }}>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>Result</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
            {result.stats.map((s) => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem" }}>
                <span className="muted" style={{ fontSize: "0.85rem" }}>{s.label}</span>
                <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{s.value}</span>
              </div>
            ))}
          </div>
          {"note" in result && result.note ? (
            <p className="muted" style={{ margin: 0, fontSize: "0.82rem" }}>{result.note}</p>
          ) : (
            <WhatIfChart series={result.series} formatValue={money} />
          )}
        </section>
      </div>

      <p className="muted" style={{ marginTop: "1.25rem", fontSize: "0.78rem" }}>
        Scenarios are ephemeral — nothing here is saved.
      </p>
    </main>
  );
}
