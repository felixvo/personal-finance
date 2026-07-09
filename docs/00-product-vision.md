# Atlas — Product Vision

## Personal Financial Operating System

**Version:** 1.1
**Status:** Product Vision (baselined from `Project_Atlas_PRD_v1_EN.md`)

---

# Why Atlas Exists

Modern families manage their finances across many different places:

- Banks
- Brokerage accounts
- Crypto wallets
- Google Sheets
- Excel
- Personal notes

Each tool only shows part of the picture.

Atlas does not replace those systems. Atlas becomes the single place that answers the five most important questions about a family's financial life.

---

# Vision

Atlas is a **Personal Financial Operating System**.

It is **not**:

- An investing app
- A trading platform
- A financial advisor

Atlas records the financial state of a family over time and helps visualize future outcomes using data.

---

# Mission

Help families understand where they are today and see the future through numbers.

Atlas never tells users what they should do. Atlas never judges financial decisions. Atlas simply reflects the current state and simulates the impact of future decisions.

---

# Product Philosophy

## Financial Mirror

Atlas reflects financial reality. It never recommends Buy / Sell / Invest / Hold. It only presents facts, trends and projections.

## Monthly Financial Ritual

Atlas is designed to be opened **once per month**. The goal is to complete a Financial Check-in in less than **5 minutes**.

## State-based, not Transaction-based

Users do not record every transaction. Instead, they update the current value of each holding.

```
July     MSB Bank = 100,000,000 VND
   ↓
August   MSB Bank = 115,000,000 VND
```

Atlas stores monthly snapshots instead of individual transactions.

## Numbers over Opinions

Atlas provides Numbers, Charts, Simulations, Historical snapshots. It does not provide financial advice.

---

# Five Core Questions

## 1. How much money do we have today? — **Today**

Displays: Net Worth · Investable Assets · Cash Position · Passive Income · Change since last month.

## 2. Where is our money? — **Assets**

Displays: Holdings · Asset Allocation · Currency Allocation · Every place where money is stored (e.g. MSB, VCB, IBKR, OKX, Fmarket, Real Estate, Personal Loans).

## 3. Did we stay on track this month? — **Financial Check-in**

During each monthly check-in users can: update account balances, add new holdings, edit existing holdings, archive or delete holdings, update income, update expenses, update monthly investments. After completion, Atlas creates a new Monthly Snapshot.

## 4. How long until we reach our goals? — **Goals**

Track goals such as FIRE, Net Worth, House Fund, Education Fund, Custom Goals. Atlas displays Progress, Estimated completion date, Current pace.

## 5. What if we do this? — **What If...**

A financial simulation engine covering Future Value, Compound Interest, Mortgage, Retirement Projection, Goal Projection.

Input: Target Amount · Current Amount · Monthly Contribution · Expected Annual Return.
Output: Estimated Time · Target Date · Growth Chart.

Atlas never recommends a decision. It only shows the outcome.

---

# Home Experience

Atlas has two primary states.

## A. Check-in Pending

Home displays: Welcome back · Last Snapshot · Start Financial Check-in. This is the default entry point.

## B. Check-in Completed

After the check-in is complete, Home becomes the dashboard, displaying: Latest Snapshot · Net Worth · Asset Allocation · Goal Progress · Passive Income.

---

# Financial Check-in Flow

1. Copy last month's data.
2. Update holdings.
3. Add / Edit / Delete / Archive holdings.
4. Update income and expenses.
5. Complete the check-in.
6. Atlas creates a Monthly Snapshot.

Target completion time: under 5 minutes.

---

# Monthly Snapshot

Each completed check-in creates a historical snapshot containing: Net Worth · Asset Allocation · Holdings · Income · Expenses · Passive Income · Goal Progress.

Snapshots remain editable if mistakes are found. Atlas records Last Updated and Version (see [02-domain-model.md](02-domain-model.md) for how edits are versioned).

---

# Timeline

Every Monthly Snapshot becomes a timeline entry.

```
July 2026
Net Worth: 13.24B VND
Savings Rate: 42%
Passive Income: 45M VND
Notes: Returned to Vietnam
```

The timeline becomes the family's financial journal.

---

# Holdings

Holdings represent the current financial state.

| Name         | Type        |   Value |
| ------------ | ----------- | ------: |
| MSB          | Cash        |    115M |
| IBKR         | Brokerage   |    320M |
| Celesta Rise | Real Estate |      6B |

During every monthly check-in, previous month's holdings are copied automatically; users only edit what has changed.

---

# Non-Goals (v1)

Explicit out-of-scope items, so later docs don't quietly grow scope:

- **No automatic bank/brokerage sync** (Plaid, MX, open banking APIs). Manual entry only. State-based design makes this tractable — it's the point, not a gap.
- **No multi-household / advisor-facing product.** Atlas is single-household per account in v1. No client management, no B2B.
- **No budgeting/envelope system.** Income and expenses are entered as monthly totals during check-in, not itemized transactions.
- **No tax filing, tax-loss harvesting, or brokerage execution.** Read-only reflection of state, never a transacting system.
- **No real-time market pricing.** Holding values are user-entered at check-in time, not pulled live (see Open Question 3 below for a possible v2 exception).

---

# Assumptions & Open Questions

The original PRD is a strong vision doc but leaves some product decisions implicit. Recorded here as explicit assumptions carried into `01`–`09`; flag any you'd like changed before implementation starts.

| # | Question | Assumption made for this doc set | Impact if wrong |
|---|----------|-----------------------------------|------------------|
| 1 | Is Atlas single-user or multi-member per household? | **Multi-member household**: one account = one family; multiple members can log in and share one set of holdings/snapshots (no per-member permission tiers in v1). | Changes auth model and domain model (`Household` → `Member`) |
| 2 | How is multi-currency Net Worth computed? | Household sets one **base currency** (e.g. VND). Each holding stores its native currency + value; Net Worth is converted at snapshot time using a stored FX rate (manually entered or fetched), not recalculated retroactively. | Changes DB schema and calculation engine significantly |
| 3 | Are FX/market rates ever fetched automatically? | v1: manual entry only, consistent with the state-based philosophy. v2 candidate: optional read-only price/FX feed to reduce check-in friction, still user-confirmed, never auto-applied silently. | Affects roadmap phasing, not core model |
| 4 | Are liabilities (loans, mortgages, credit card debt) first-class? | Yes — a Holding can be `ASSET` or `LIABILITY`. Net Worth = Σ assets − Σ liabilities. "Personal Loans" in the PRD is treated as a liability-type holding. | Net Worth formula and schema both depend on this |
| 5 | What does "editable snapshot" mean precisely? | Editing a past snapshot **mutates that snapshot in place** and bumps its `version` + `updatedAt`; it does not fork a new timeline entry. Full field-level audit trail is out of scope for v1 (version counter only). | Changes DB design (audit table vs. version counter) |
| 6 | Archive vs. delete for holdings — what's the difference? | **Archive**: holding stops appearing in the active check-in flow but its historical value remains in past snapshots (e.g., closed account). **Delete**: only allowed if the holding has never been included in a completed snapshot; otherwise force archive instead. | Domain model + UX for check-in step 3 |
| 7 | How are Goals computed from snapshots? | Goal progress is derived by comparing a chosen metric (e.g. Net Worth) across snapshots to project pace (linear regression over trailing N months) toward a target. Not manually updated by the user. | Calculation engine design |
| 8 | Is there a reminder/nudge for the monthly ritual? | v1 needs at least email (or push, if PWA) reminder around a household-configured "check-in day." Not in the original PRD but required for the ritual to actually happen. | Adds a small notification concern to roadmap |
| 9 | Is a "What If" simulation ever saved, or always ephemeral? | v1: ephemeral, recomputed client-side each time, not persisted. v2 candidate: allow saving a named scenario. | Affects API design (`08`) and DB scope |

---

# Definition of Success

Atlas succeeds if, once a month, a family can open the app and immediately answer:

1. How much do we own today?
2. Where is our money?
3. Are we on track this month?
4. How long until we reach our goals?
5. What happens if we make this decision?

Atlas does not help users make decisions. Atlas helps users understand the impact of their decisions through data.

## Product-level success metrics (added)

The above is the user-facing definition of success. To know whether Atlas is *actually* achieving it, track:

- **Check-in completion time** — target median under 5 minutes (from PRD).
- **Check-in completion rate** — % of households that complete a check-in within their configured window each month.
- **Streak retention** — % of households with 3+ consecutive monthly check-ins (the ritual only has value if it repeats).
- **Time-to-first-check-in** — onboarding friction, from signup to first completed snapshot.
