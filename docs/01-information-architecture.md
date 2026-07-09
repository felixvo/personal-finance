# 01 — Information Architecture

Defines the app's navigation structure, screen inventory, and how the Five Core Questions from [00-product-vision.md](00-product-vision.md) map to concrete destinations.

---

## 1. Structural principles

- **Desktop-first, sidebar navigation.** Monthly check-ins happen at a desk, not on the go (per vision doc). Layout targets ≥1024px; mobile is a responsive fallback, not the primary design target, for v1.
- **Check-in is a flow, not a destination.** It doesn't get a permanent nav tab — it's a wizard launched from Home and from a persistent "Check-in" action, because the product philosophy treats it as a ritual/event, not a page you browse.
- **Five tabs map directly to the Five Core Questions.** No extra top-level sections in v1 — resist the urge to add "Transactions," "Budgets," etc. (see Non-Goals in `00`).
- **One household, one workspace.** No workspace switcher in v1 — a logged-in member sees exactly one household's data.

---

## 2. Top-level navigation

```
┌─────────────────────────────────────────────────────────┐
│  Atlas                                    [Household ▾]  │
├───────────┬─────────────────────────────────────────────┤
│  Home     │                                               │
│  Assets   │                                               │
│  Goals    │              <page content>                  │
│  What If  │                                               │
│  Timeline │                                               │
│           │                                               │
│  Settings │                                               │
│           │                                               │
│  [Start Check-in]  ← persistent primary action, always visible
└───────────┴─────────────────────────────────────────────┘
```

| Nav item | Answers | Primary route |
|---|---|---|
| Home | "How much do we have today?" (entry point) | `/` |
| Assets | "Where is our money?" | `/assets` |
| Goals | "How long until we reach our goals?" | `/goals` |
| What If | "What if we do this?" | `/what-if` |
| Timeline | "Did we stay on track?" (historical view) | `/timeline` |
| Settings | household/account config | `/settings` |

---

## 3. Screen inventory

### 3.1 Pre-app (unauthenticated)

| Screen | Route | Purpose |
|---|---|---|
| Sign in | `/login` | Email/password or magic link |
| Sign up + household creation | `/signup` | Creates `Household` + first `Member`, sets base currency |
| Invite member (optional, v1.1) | `/settings/members/invite` | Adds a second `Member` to existing household |

### 3.2 Onboarding (household exists, zero snapshots)

| Screen | Route | Purpose |
|---|---|---|
| Welcome / first check-in prompt | `/` (empty state) | Explains the ritual, CTA into first Check-in |
| Guided first Check-in | `/check-in` | Same wizard as monthly check-in, but Step 1 ("copy last month") is skipped since there's no prior snapshot |

### 3.3 Home — `/`

The vision doc names two states, but a check-in is resumable, so there are **three** derived states on this one route (matching `checkIn.getStatus` in [08-api-design.md](08-api-design.md) §3.4):

- **A. Check-in Pending (no draft)** — Welcome message, last snapshot summary card, "Start Financial Check-in" CTA.
- **A′. Check-in In Progress (draft exists)** — same layout as A, but the CTA reads "Resume Check-in" and deep-links to the draft's last step.
- **B. Check-in Completed (this month)** — Dashboard: Net Worth headline, change vs. last month, Asset Allocation chart, Goal Progress summary, Passive Income.

State is derived, not stored, and keys off the **`COMPLETED`** snapshot for the current period — *not* mere existence of a row, since a `DRAFT` is also a snapshot for the current month:
- no snapshot this period → **A**
- a `DRAFT` this period → **A′**
- a `COMPLETED` snapshot this period → **B**

### 3.4 Assets — `/assets`

| Screen | Route | Purpose |
|---|---|---|
| Holdings overview | `/assets` | List of all active holdings (from latest snapshot), grouped by type; Asset Allocation + Currency Allocation charts |
| Holding detail | `/assets/[holdingId]` | Value history for one holding across snapshots (sparkline + table) |

Assets is a **read view** of the latest snapshot. Users don't edit values here — that happens inside Check-in — but they can:
- Add a new holding "for next check-in" (staged, `active` but not yet in any snapshot)
- Archive a holding (effective immediately, excludes it from the next check-in's copy-forward step)

### 3.5 Goals — `/goals`

| Screen | Route | Purpose |
|---|---|---|
| Goals list | `/goals` | Cards per goal: progress bar, estimated completion date, current pace |
| Goal detail | `/goals/[goalId]` | Full progress chart over time, projection line, edit target/inputs |
| Create goal | `/goals/new` | Choose goal type (FIRE, Net Worth, House Fund, Education Fund, Custom), set target amount + optional target date |

### 3.6 What If — `/what-if`

| Screen | Route | Purpose |
|---|---|---|
| Simulator hub | `/what-if` | Choose simulation type: Future Value, Compound Interest, Mortgage, Retirement Projection, Goal Projection |
| Simulation workspace | `/what-if/[type]` | Input form (Target Amount, Current Amount, Monthly Contribution, Expected Annual Return) + live output chart. Ephemeral — not persisted in v1 (see `00`, Open Question 9) |

### 3.7 Timeline — `/timeline`

| Screen | Route | Purpose |
|---|---|---|
| Timeline feed | `/timeline` | Reverse-chronological list of Monthly Snapshots — the "financial journal" |
| Snapshot detail | `/timeline/[snapshotId]` | Full snapshot: net worth, allocation, holdings, income/expenses, notes. Editable (mutates in place, bumps version — see `00`, Open Question 5) |

### 3.8 Check-in wizard — `/check-in`

Not a nav tab; entered via CTA from Home or Settings. Full-screen, step-based:

| Step | Purpose |
|---|---|
| 1. Review | Copy last month's holdings + income/expenses as starting point (skipped on first-ever check-in) |
| 2. Update Holdings | Edit current value for each existing holding |
| 3. Add / Archive | Add new holdings, archive/delete ones no longer held |
| 4. Income & Expenses | Update monthly income, expenses, monthly investment contribution |
| 5. Review & Complete | Summary diff vs. last month → confirm → creates `MonthlySnapshot` |

Exiting mid-wizard saves a draft (`DRAFT` snapshot state) so a household can resume later without losing progress — necessary to reliably hit the "under 5 minutes" target across interruptions.

### 3.9 Settings — `/settings`

| Screen | Route | Purpose |
|---|---|---|
| Household profile | `/settings/household` | Name, base currency, check-in reminder day |
| Members | `/settings/members` | List/invite/remove members (v1.1) |
| Holding types | `/settings/holding-types` | Manage custom holding categories beyond defaults (household-scoped — see `02` §2.3) |
| Notifications | `/settings/notifications` | Check-in reminder timing (email in v1; push is a later addition once a PWA/native surface exists) |
| Data export | `/settings/export` | Export snapshots as CSV/JSON |
| Danger zone | `/settings/danger` | Delete household, delete account |

---

## 4. Navigation map

```
                              ┌──────────┐
                    ┌─────────│   Home   │─────────┐
                    │         └────┬─────┘         │
                    │  (pending)   │ (completed)    │
                    ▼              │                ▼
             ┌─────────────┐       │         ┌─────────────┐
             │  Check-in   │       │         │  Dashboard  │
             │   Wizard    │───────┘         │   widgets   │
             └─────────────┘                 └─────────────┘

  Sidebar (always available once authenticated):
  Home · Assets · Goals · What If · Timeline · Settings

  Assets ──▶ Holding detail
  Goals ──▶ Goal detail / Create goal
  What If ──▶ Simulation workspace (per type)
  Timeline ──▶ Snapshot detail (editable)
```

---

## 5. Open items carried to later docs

- Exact holding grouping taxonomy (by institution vs. by type) → resolved in [02-domain-model.md](02-domain-model.md).
- Wizard step layout and copy → [05-wireframes.md](05-wireframes.md).
- Draft snapshot state machine → [02-domain-model.md](02-domain-model.md) and [08-api-design.md](08-api-design.md).
