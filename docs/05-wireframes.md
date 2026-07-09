# 05 — Wireframes

Low-fidelity layout for every screen in [01-information-architecture.md](01-information-architecture.md). Desktop-first (≥1024px); layout notes call out the mobile fallback where it isn't a simple reflow. Visual styling (color, type, spacing) is defined separately in [06-design-system.md](06-design-system.md) — these are structure-only.

Chart forms below (allocation bars, meters, stat tiles) are picked by data job, not aesthetics — see `06-design-system.md` §3 for the reasoning. Notably: allocation charts use a horizontal stacked bar, not a donut/pie.

---

## 1. Home — Check-in Pending

```
┌──────────────────────────────────────────────────────────────────┐
│  Atlas                                          [Household ▾]    │
├───────────┬──────────────────────────────────────────────────────┤
│ ▸ Home    │                                                      │
│   Assets  │        Welcome back, The Nguyễn Family               │
│   Goals   │                                                      │
│   What If │   ┌────────────────────────────────────────────┐     │
│   Timeline│   │  Last Snapshot — June 2026                  │     │
│           │   │  Net Worth: 13.10B VND                      │     │
│   Settings│   │  Completed 34 days ago                       │     │
│           │   └────────────────────────────────────────────┘     │
│ [Start    │                                                      │
│  Check-in]│        ┌──────────────────────────────┐              │
│           │        │   Start Financial Check-in     │  ← primary │
│           │        └──────────────────────────────┘              │
│           │        Takes about 5 minutes                         │
└───────────┴──────────────────────────────────────────────────────┘
```

- Single focal CTA — this screen has one job: get the household into the wizard.
- Last Snapshot card is a compressed preview, not the full dashboard (that only appears post-completion, reinforcing "the ritual isn't done yet").

---

## 2. Home — Dashboard (Check-in Completed)

```
┌──────────────────────────────────────────────────────────────────┐
│  Atlas                                          [Household ▾]    │
├───────────┬──────────────────────────────────────────────────────┤
│ ▸ Home    │  July 2026                              [Edit ⋯]     │
│   Assets  │                                                      │
│   Goals   │  ┌─────────────────────┐  ┌─────────────────────┐    │
│   What If │  │  Net Worth           │  │  Passive Income      │    │
│   Timeline│  │  13.24B VND           │  │  45M VND / mo        │    │
│           │  │  ▲ +140M vs last mo  │  │  ▲ +3M vs last mo    │    │
│   Settings│  └─────────────────────┘  └─────────────────────┘    │
│           │                                                      │
│ [Start    │  ┌─────────────────────┐  ┌─────────────────────┐    │
│  Check-in]│  │  Asset Allocation     │  │  Goal Progress        │    │
│           │  │  [▓▓▓▓▓▓▒▒▒▒░░░░░░]   │  │  FIRE ████████░░ 78% │    │
│           │  │  ■Cash 8% ■Brokerage 22%│ │  House Fund ███░ 40% │    │
│           │  │  ■Real Estate 65% ...  │  │                       │    │
│           │  └─────────────────────┘  └─────────────────────┘    │
└───────────┴──────────────────────────────────────────────────────┘
```

- Four-card grid: Net Worth, Passive Income, Asset Allocation, Goal Progress — directly the four things the vision doc says Home should show (plus "change since last month" as a delta badge on the relevant cards, not a separate card).
- Mobile: cards stack single-column in the same top-to-bottom order.

---

## 3. Check-in Wizard — shared chrome

```
┌──────────────────────────────────────────────────────────────────┐
│  Financial Check-in — July 2026                          [Save & │
│                                                             Exit] │
│  ●───●───○───○───○                                               │
│  Review  Holdings  Add/Archive  Income  Review                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│                     <step content, see below>                    │
│                                                                    │
├──────────────────────────────────────────────────────────────────┤
│                                          [Back]   [Continue →]    │
└──────────────────────────────────────────────────────────────────┘
```

Full-screen takeover (no sidebar) — removes navigation temptation mid-flow, reinforces the single-task ritual framing. Progress dots persist across all 5 steps; "Save & Exit" is always available (writes to the `DRAFT` row already in the DB per Flow 2 in `04-user-flows.md`).

### 3a. Step 2 — Update Holdings

```
┌──────────────────────────────────────────────────────────────────┐
│  Update your holdings                                            │
│                                                                    │
│  Cash                                                             │
│  ┌────────────────────────────────────────────────────────┐      │
│  │ MSB                              115,000,000 VND   [__]│      │
│  │ VCB                                45,000,000 VND   [__]│      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                    │
│  Brokerage                                                        │
│  ┌────────────────────────────────────────────────────────┐      │
│  │ IBKR                                   12,400 USD   [__]│      │
│  │ Fmarket                            320,000,000 VND  [__]│      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                    │
│  Real Estate                                                      │
│  ┌────────────────────────────────────────────────────────┐      │
│  │ Celesta Rise                         6,000,000,000  [__]│      │
│  └────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
```

- Grouped by `HoldingType`, previous value shown as the pre-filled editable field (copy-forward), not a separate "old vs new" pair of inputs — minimizes friction per the 5-minute target.
- Each row's value field is the *only* required interaction if nothing changed; user can Continue without touching anything.

### 3b. Step 5 — Review & Complete

```
┌──────────────────────────────────────────────────────────────────┐
│  Review July 2026                                                 │
│                                                                    │
│  Net Worth        13.24B VND        ▲ +140M  (+1.1%)             │
│  Cash Position      160M VND        ▼  −5M                       │
│  Investable Assets  9.8B VND        ▲ +90M                       │
│  Passive Income      45M VND        ▲  +3M                       │
│  Savings Rate         42%           ▲  +2pp                      │
│                                                                    │
│  Notes (optional)                                                 │
│  ┌────────────────────────────────────────────────────────┐      │
│  │ Returned to Vietnam                                      │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                    │
│                                    [Complete Check-in ✓]           │
└──────────────────────────────────────────────────────────────────┘
```

- Every figure shown as current value + delta — this is the screen that answers "did we stay on track this month?" per the vision doc's Core Question 3.

---

## 4. Assets

```
┌──────────────────────────────────────────────────────────────────┐
│  Assets                                          [+ Add Holding] │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────┐                │
│  │ Asset Allocation      │  │ Currency Allocation  │                │
│  │ [horizontal stacked   │  │ [horizontal stacked  │                │
│  │  bar + legend]        │  │  bar + legend]       │                │
│  └─────────────────────┘  └─────────────────────┘                │
│                                                                    │
│  Cash                                                    160M     │
│  ┌────────────────────────────────────────────────────────┐      │
│  │ MSB          Cash        115,000,000 VND      [Archive]│      │
│  │ VCB          Cash         45,000,000 VND      [Archive]│      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                    │
│  Brokerage                                               9.4B     │
│  ┌────────────────────────────────────────────────────────┐      │
│  │ IBKR         Brokerage        12,400 USD      [Archive]│      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                    │
│  Liabilities                                            −180M     │
│  ┌────────────────────────────────────────────────────────┐      │
│  │ Home Loan    Loan           180,000,000 VND   [Archive]│      │
│  └────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
```

- Liabilities render as a visually distinct group (negative, different accent) rather than mixed into assets — makes the "assets minus liabilities" Net Worth math legible at a glance.
- Clicking a row → Holding detail (`/assets/[holdingId]`): value history sparkline + table across snapshots.

---

## 5. Goals

```
┌──────────────────────────────────────────────────────────────────┐
│  Goals                                              [+ New Goal] │
├──────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐      │
│  │ FIRE                                                     │      │
│  │ ████████████████████████████░░░░░░░░  78%                │      │
│  │ 13.24B / 17B VND · Est. completion: Mar 2029              │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                    │
│  ┌────────────────────────────────────────────────────────┐      │
│  │ House Fund                                                │      │
│  │ ████████████░░░░░░░░░░░░░░░░░░░░░░░░  40%                │      │
│  │ 800M / 2B VND · Est. completion: Nov 2027                 │      │
│  └────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
```

Goal detail (`/goals/[goalId]`) below the fold on click:

```
┌──────────────────────────────────────────────────────────────────┐
│  FIRE                                              [Edit Goal]   │
│                                                                    │
│  Target: 17B VND        Current: 13.24B VND        Pace: on track│
│                                                                    │
│  [ growth-over-time chart: actual line + projected line to target]│
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 6. What If

```
┌──────────────────────────────────────────────────────────────────┐
│  What If                                                          │
│  [Future Value] [Compound Interest] [Mortgage] [Retirement]       │
│  [Goal Projection]                                                │
├──────────────────────────────────────────────────────────────────┤
│  Inputs                          │  Output                        │
│  ┌─────────────────────────┐     │  Estimated Time: 4y 2mo         │
│  │ Current Amount    [___] │     │  Target Date: Sep 2030          │
│  │ Monthly Contrib.  [___] │     │                                  │
│  │ Expected Return % [___] │     │  [growth chart, current path    │
│  │ Target Amount     [___] │     │   vs. target line]              │
│  └─────────────────────────┘     │                                  │
└──────────────────────────────────────────────────────────────────┘
```

- Type selector as tabs, not a dropdown — encourages exploring multiple what-ifs in one sitting.
- Output recalculates on every keystroke (debounced), no "Calculate" button — reinforces that this is exploration, not a form submission.

---

## 7. Timeline

```
┌──────────────────────────────────────────────────────────────────┐
│  Timeline                                                         │
├──────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐      │
│  │ July 2026                                                 │      │
│  │ Net Worth 13.24B · Savings Rate 42% · Passive 45M         │      │
│  │ "Returned to Vietnam"                                      │      │
│  └────────────────────────────────────────────────────────┘      │
│  ┌────────────────────────────────────────────────────────┐      │
│  │ June 2026                                                 │      │
│  │ Net Worth 13.10B · Savings Rate 40% · Passive 42M          │      │
│  └────────────────────────────────────────────────────────┘      │
│  ┌────────────────────────────────────────────────────────┐      │
│  │ May 2026                                     (edited)     │      │
│  │ Net Worth 12.95B · Savings Rate 38% · Passive 40M          │      │
│  └────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
```

- Reverse-chronological card feed — deliberately styled as a journal (per vision doc: "the timeline becomes the family's financial journal"), not a data table.
- `(edited)` badge appears when `version > 1`, per Flow 8 in `04-user-flows.md`. Click → snapshot detail, editable.

---

## 8. Responsive notes

- Sidebar collapses to a bottom tab bar (Home / Assets / Goals / What If / Timeline) below 768px; Settings moves into an overflow menu.
- Check-in wizard remains full-screen on mobile but step content stacks single-column; grouped holding tables become card lists instead of table rows.
- Charts (allocation bar, growth line) resize to full-width single-column on mobile; legends move below the chart instead of beside it.
