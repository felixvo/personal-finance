# 07 — Calculation Engine

All formulas behind the metrics in [00-product-vision.md](00-product-vision.md) and the invariants in [02-domain-model.md](02-domain-model.md). This is the spec for a pure, framework-free TypeScript module — no I/O, no side effects — so it can run identically on the server (authoritative, writes cached snapshot metrics) and in the browser (live What-If recalculation on every keystroke).

**Precision rule, non-negotiable:** every function in this module takes and returns `Decimal` (via `decimal.js`), never `number`, for any monetary value. Floating-point arithmetic on money is a correctness bug, not a style preference — this is why `03-database-design.md` uses `NUMERIC`, not `FLOAT`, throughout.

---

## 1. Snapshot metrics

These run once per snapshot completion/edit and populate the cached columns on `monthly_snapshot` (§2.5 of `02-domain-model.md`).

### 1.1 Net Worth

```
netWorthBase = Σ SnapshotHolding.valueBase where Holding.type.classification = ASSET
             − Σ SnapshotHolding.valueBase where Holding.type.classification = LIABILITY
```

### 1.2 Investable Assets

```
investableAssetsBase = Σ SnapshotHolding.valueBase where Holding.type.isInvestable = true
```

### 1.3 Cash Position

```
cashPositionBase = Σ SnapshotHolding.valueBase where Holding.type.isCash = true
```

### 1.4 Passive Income

```
passiveIncomeBase = Σ SnapshotCashFlow.amount where category = PASSIVE_INCOME
```

### 1.5 Savings Rate

```
totalIncome   = Σ amount where category ∈ {ACTIVE_INCOME, PASSIVE_INCOME}
totalExpenses = Σ amount where category = EXPENSE

savingsRate = totalIncome == 0
  ? null                                    // undefined, not zero — render as "—"
  : (totalIncome − totalExpenses) / totalIncome
```

Stored as a decimal fraction (`0.42`), formatted as a percentage at render time only (design-system concern, not this module's).

### 1.6 FX conversion

Resolves Open Question 2 from `00-product-vision.md`. At the moment a `SnapshotHolding` is written (check-in step 2, or ad hoc holding add):

```
valueBase = value × fxRateToBase
```

`fxRateToBase` is either:
- `1`, if `Holding.currency == Household.baseCurrency`, or
- a manually entered rate (v1), or
- a fetched reference rate the user confirms before saving (v2 candidate per `00`, Open Question 3 — never applied silently).

The rate is **frozen at write time** and stored on the row (`03-database-design.md` §2). Recomputing historical `valueBase` when today's FX rate changes is explicitly not done — domain invariant 8.

---

## 2. Goal pace & projection

Resolves Open Question 7. Two distinct engines exist and must not be confused:

- **Goal pace** (this section) — backward-looking, derived from actual `MonthlySnapshot` history. Powers the Goals screens (`01` §3.5).
- **What-If projection** (§3 below) — forward-looking, derived from hypothetical user inputs. Powers `/what-if` and never touches stored snapshot data except to pre-fill a starting value.

### 2.1 Tracked value

```
trackedValue(snapshot, goal) =
  goal.trackingMode == NET_WORTH
    ? snapshot.netWorthBase
    : Σ SnapshotHolding.valueBase in `snapshot` where holdingId ∈ goal.linkedHoldings
```

### 2.2 Pace

v1 uses a **trailing simple moving average of month-over-month deltas** — chosen over full linear regression because it's directly explainable in the UI ("based on your average monthly change over the last 6 months") and robust enough with the small sample sizes (a few months to a couple years) this product actually has. Full OLS regression is a documented v2 candidate if pace turns out noisy in practice.

```
window = last min(6, N−1) deltas between consecutive COMPLETED snapshots, N = total completed snapshots

pace = window.length == 0
  ? null                          // fewer than 2 completed snapshots — no pace yet
  : average(window)                // currency/month
```

### 2.3 Projected completion date

```
remaining = goal.targetAmount − trackedValue(latestSnapshot, goal)

projection =
  pace == null           → { status: "insufficient-data" }
  remaining <= 0          → { status: "achieved" }
  pace <= 0               → { status: "not-on-pace" }     // shrinking or flat — no forward projection rendered
  otherwise               → {
      status: "projected",
      monthsRemaining: ceil(remaining / pace),
      estimatedDate: latestSnapshot.periodMonth + monthsRemaining
  }
```

### 2.4 On-track / behind (only when `goal.targetDate` is set)

```
paceStatus =
  projection.status != "projected"     → none                          // nothing to compare
  projection.estimatedDate <= goal.targetDate  → "good"    (design system §4.4)
  otherwise                                     → "warning" (design system §4.4)
```

Framed in the UI as "behind pace," never "off track" or "failing" — consistent with the non-judgmental tone in `06-design-system.md` §4.3.

---

## 3. What-If simulations

Ephemeral, client-side, per Open Question 9. All five types in the vision doc's Core Question 5 share one accumulation formula except Mortgage, which is amortization (a different shape of math) and therefore takes a different input set — flagged explicitly below since the vision doc's generic 4-input list doesn't actually fit it.

### 3.1 Shared accumulation formula (Future Value, Compound Interest, Retirement Projection, Goal Projection)

Ordinary annuity (contributions at **end** of each month — the standard convention; flag clearly in the UI copy since it under-counts by one month of growth vs. annuity-due, a deliberate, documented choice for simplicity):

```
inputs:
  PV   = Current Amount
  PMT  = Monthly Contribution
  rAnnual = Expected Annual Return (as decimal, e.g. 0.08)
  r    = rAnnual / 12                          // nominal monthly rate; see note below
  n    = number of months

FV(n) = PV × (1 + r)^n  +  PMT × (((1 + r)^n − 1) / r)          // r ≠ 0
FV(n) = PV + PMT × n                                             // r == 0 edge case
```

> **Rate convention note:** `r = rAnnual / 12` (nominal/simple division) rather than the compounded-equivalent `(1+rAnnual)^(1/12) − 1`. This matches how most retail finance calculators present "expected annual return" and is what users will intuitively expect their number to mean. Document this choice in the What-If UI (e.g. a tooltip) so it's never a silent assumption.

### 3.2 Solving for time (Goal Projection input mode: "how long until Target Amount?")

Closed-form inversion of §3.1 — no iteration needed:

```
x = (FV_target + PMT/r) / (PV + PMT/r)         // r ≠ 0, and (PV + PMT/r) ≠ 0
n = ln(x) / ln(1 + r)                            months

// r == 0 edge case:
n = (FV_target − PV) / PMT
```

Output: `Estimated Time` (n, formatted as years+months), `Target Date` (today + n months), `Growth Chart` (plot `FV(0..n)` at monthly resolution).

**Guard rails:** if `PMT <= 0` and `PV >= FV_target` already, `n = 0`. If `PMT <= 0`, `r <= 0`, and `PV < FV_target`, the target is mathematically unreachable — surface as "not reachable with current inputs," not an error or an infinite/negative chart.

### 3.3 Retirement Projection — built on §3.1/§3.2, not a separate engine

Retirement Projection is the shared accumulation formula with one optional convenience layer: deriving `FV_target` from a desired retirement income instead of the user supplying a raw target amount, using a safe withdrawal rate:

```
FV_target = (desiredAnnualRetirementSpend) / withdrawalRate      // default withdrawalRate = 0.04, user-editable
```

This also gives Atlas's FIRE goal type a natural default target when a household defines it from desired passive income rather than a lump sum — ties directly back to the Passive Income metric in Core Question 1.

### 3.4 Mortgage — amortization, different input shape

**Flagged deviation:** the vision doc's generic What-If inputs (Target Amount, Current Amount, Monthly Contribution, Expected Annual Return) describe an accumulation simulation and don't map onto a loan. Mortgage needs its own input set:

```
inputs:
  P = Loan Amount (principal)
  rAnnual = Annual Interest Rate
  r = rAnnual / 12
  n = Loan Term in months

Monthly Payment:
  M = P × (r × (1+r)^n) / ((1+r)^n − 1)         // r ≠ 0
  M = P / n                                       // r == 0 edge case

Amortization schedule (per month i = 1..n):
  interest_i  = balance_(i-1) × r
  principal_i = M − interest_i
  balance_i   = balance_(i-1) − principal_i

Total Interest Paid = Σ interest_i = (M × n) − P
```

Output: `Monthly Payment`, `Total Interest Paid`, and a chart of `balance_i` over time (principal paydown curve) — replaces the generic "Growth Chart" for this simulation type only.

---

## 4. Rounding & display

- All internal computation stays in `Decimal` at full precision; rounding happens only at render time.
- Currency values display auto-compact per the stat-tile figure contract in `06-design-system.md` (`1,284` / `12.9K` / `4.2M` / `13.24B`).
- Percentages (Savings Rate, Goal progress) round to 1 decimal place for display; stored unrounded.
- Dates for projections round **up** to the nearest whole month (`ceil`) — never promise a date earlier than the math actually supports.

---

## 5. Module boundary

```
packages/calc-engine/
  snapshot-metrics.ts     // §1 — netWorth, investableAssets, cashPosition, passiveIncome, savingsRate
  fx.ts                   // §1.6
  goal-pace.ts            // §2
  what-if/
    accumulation.ts       // §3.1, §3.2, §3.3
    mortgage.ts           // §3.4
  index.ts
```

Framework-free by design (per the module header above) so it can be unit-tested exhaustively in isolation — this is the highest-leverage part of the codebase to have strong test coverage on, since every number on every screen ultimately traces back to it. Consumed identically by the API layer (`08-api-design.md`) for authoritative snapshot writes and by the What-If UI for live client-side recalculation.
