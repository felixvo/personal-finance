# 08 — API Design & Tech Stack

---

## 1. Stack recommendation

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js (App Router) + TypeScript** | Single deployable for a desktop-first web app (per platform decision in `00`); server components suit data-heavy dashboard screens (Home, Timeline) well |
| API layer | **tRPC**, mounted on Next.js Route Handlers | This is a single first-party web client with no third-party API consumers in v1 — end-to-end type inference from the Prisma models straight through the [calculation engine](07-calculation-engine.md) to the UI removes an entire class of contract-drift bugs, at far less boilerplate than hand-written REST + OpenAPI. Revisit only if a public API or mobile client becomes a real requirement (see `09-roadmap.md`) |
| ORM / DB | **Prisma + PostgreSQL** | Matches `03-database-design.md` exactly; Prisma Migrate is the migration tool named there |
| Auth | **Auth.js (NextAuth)** | Email/magic-link + password, session cookie, owns its own `User`/`Session` tables per `03-database-design.md` §1; `Member` is the app-level profile linked 1:1 |
| Money math | **decimal.js** | Required by `07-calculation-engine.md` §0 — never native `number` for currency |
| Charts | **Recharts** (or **visx** if the [design system](06-design-system.md)'s mark specs — 2px lines, 4px rounded bar ends, custom stacked-bar gaps — turn out easier to hit with a lower-level library) | Both support the custom SVG control the `dataviz`-derived spec needs; final pick is an implementation detail, not a product decision |
| Hosting | **Vercel** (app) + **Neon or Supabase** (Postgres) | Low-ops, matches Next.js natively, generous free tier appropriate for a single-household v1 |
| Email (reminders) | **Resend** | Simple transactional email API, used only for Flow 3 (`04-user-flows.md`) monthly reminders |
| Scheduled jobs | **Vercel Cron** → daily job implementing Flow 3's reminder check | No separate worker infra needed at this scale |

---

## 2. Conventions

- Every procedure is **household-scoped implicitly** via session: the tRPC context resolves `member → household` from the auth session once, and every resolver filters by that `householdId` server-side. No procedure accepts a client-supplied `householdId` — this is the application-layer isolation approach chosen in `03-database-design.md` §6.
- Mutations that touch a `DRAFT` snapshot are idempotent where practical (re-submitting the same holding value twice is a no-op, not a duplicate row) — supports the wizard's "Save & Exit / resume" flow without special-casing retries.
- All monetary inputs/outputs are serialized as strings (not JS `number`) across the wire, parsed into `Decimal` on both ends — avoids silent float coercion at the JSON boundary.
- Errors use tRPC's typed error codes (`NOT_FOUND`, `FORBIDDEN`, `BAD_REQUEST`, `CONFLICT`) — e.g. deleting a `Holding` with snapshot history returns `CONFLICT` with a message pointing at "archive instead" (domain invariant 7).

---

## 3. Routers

### 3.1 `household`

| Procedure | Type | Input | Output | Notes |
|---|---|---|---|---|
| `get` | query | — | `Household` | Current session's household |
| `update` | mutation | `{ name?, checkInDay? }` | `Household` | Base currency intentionally **not** editable here — deferred to v2 (`00`, §4) |

### 3.2 `member`

| Procedure | Type | Input | Output | Notes |
|---|---|---|---|---|
| `list` | query | — | `Member[]` | |
| `invite` | mutation | `{ email }` | `Member` | v1.1 per `01` §3.1 |
| `remove` | mutation | `{ memberId }` | `void` | v1.1; cannot remove last `OWNER` |

### 3.3 `holding`

| Procedure | Type | Input | Output | Notes |
|---|---|---|---|---|
| `list` | query | `{ status?: 'ACTIVE' \| 'ARCHIVED' }` | `Holding[]` | Powers `/assets` |
| `getHistory` | query | `{ holdingId }` | `{ snapshot: {periodMonth, value, valueBase} }[]` | Powers holding detail sparkline/table |
| `create` | mutation | `{ name, holdingTypeId, institution?, currency, initialValue }` | `Holding` | Implements Flow 4; also writes a `SnapshotHolding` into the open `DRAFT` if one exists |
| `archive` | mutation | `{ holdingId, finalValue? }` | `Holding` | Implements Flow 5 |
| `delete` | mutation | `{ holdingId }` | `void` | Rejects with `CONFLICT` unless zero `SnapshotHolding` rows exist (invariant 7) |
| `listTypes` | query | — | `HoldingType[]` | Seeded + household custom types |
| `createType` | mutation | `{ label, classification, isInvestable, isCash }` | `HoldingType` | Settings → Holding Types |

### 3.4 `checkIn`

The stateful wizard flow (Flow 2/3 in `04-user-flows.md`), kept as its own router rather than folded into a generic `snapshot` CRUD router because its operations are inherently sequenced, not arbitrary reads/writes.

| Procedure | Type | Input | Output | Notes |
|---|---|---|---|---|
| `getStatus` | query | — | `{ state: 'no-draft' \| 'draft' \| 'completed-this-month', snapshot? }` | Drives Home's two states (`01` §3.3) |
| `start` | mutation | — | `MonthlySnapshot` (DRAFT) | Creates draft + copy-forward (domain invariant 9); no-ops (returns existing) if a draft already exists |
| `updateHoldingValue` | mutation | `{ snapshotId, holdingId, value }` | `SnapshotHolding` | Step 2 |
| `updateCashFlow` | mutation | `{ snapshotId, category, label, amount }` upsert | `SnapshotCashFlow` | Step 4 |
| `discardDraft` | mutation | `{ snapshotId }` | `void` | Hard delete, per `03-database-design.md` §5 |
| `complete` | mutation | `{ snapshotId, notes? }` | `MonthlySnapshot` (COMPLETED) | Step 5; runs the full [calculation engine](07-calculation-engine.md) §1 and caches the results |

### 3.5 `snapshot` (read + edit of completed history)

| Procedure | Type | Input | Output | Notes |
|---|---|---|---|---|
| `getLatest` | query | — | `MonthlySnapshot \| null` | Home dashboard state B |
| `listTimeline` | query | `{ cursor?, limit? }` | `MonthlySnapshot[]` | Paginated, reverse-chronological |
| `getByPeriod` | query | `{ periodMonth }` | `MonthlySnapshot` (with holdings + cash flow) | Timeline/snapshot detail |
| `edit` | mutation | `{ snapshotId, holdings?: [...], cashFlow?: [...], notes? }` | `MonthlySnapshot` | Implements Flow 8: mutates in place, `version += 1`, recomputes cached metrics |

### 3.6 `goal`

| Procedure | Type | Input | Output | Notes |
|---|---|---|---|---|
| `list` | query | — | `(Goal & { progress })[]` | `progress` computed via `07-calculation-engine.md` §2 at read time, not stored |
| `get` | query | `{ goalId }` | `Goal & { progress, history }` | `history` = tracked value per snapshot, for the detail chart |
| `create` | mutation | `{ type, name, targetAmount, targetDate?, trackingMode, holdingIds? }` | `Goal` | Implements Flow 6 |
| `update` | mutation | `{ goalId, ...partial }` | `Goal` | |
| `archive` | mutation | `{ goalId }` | `Goal` | |

### 3.7 What-If — no router

Per `07-calculation-engine.md` §3 and Open Question 9, What-If simulations run entirely client-side against the shared `calc-engine` package. The only server dependency is `snapshot.getLatest`, reused to pre-fill "Current Amount" — no dedicated `whatIf` procedures exist in v1.

### 3.8 `export`

| Procedure | Type | Input | Output | Notes |
|---|---|---|---|---|
| `household` | query | `{ format: 'csv' \| 'json' }` | file stream | All snapshots, holdings, cash flow, goals for the household |

---

## 4. Scheduled job — check-in reminder

Not a client-invocable procedure; a cron-triggered server function (Flow 3):

```
daily @ 09:00 household-local (v1 simplification: 09:00 UTC+7, since first household is Vietnam-based; per-household timezone is a v2 refinement):
  for each household where checkInDay <= today.day
    and no COMPLETED or DRAFT snapshot exists for current periodMonth
    and no reminder sent yet this period:
      send "reminder" email (Resend) → mark reminderSentAt
  for each household where reminder sent 7+ days ago
    and still no snapshot for current periodMonth
    and no follow-up sent yet:
      send "follow-up" email → mark followUpSentAt
```

`reminderSentAt` / `followUpSentAt` live on `monthly_snapshot`... except the snapshot may not exist yet at reminder time (that's the point). These two timestamps need their own small table (`checkin_reminder_state`, keyed on `householdId` + `periodMonth`) rather than being bolted onto `monthly_snapshot` — flagging this as a one-table gap in `03-database-design.md` to add when the reminder feature is actually built (not included in the initial schema since it's additive and non-blocking for core check-in functionality).

---

## 5. Out of scope for v1 API surface

Consistent with Non-Goals in `00-product-vision.md`:

- No public/external API or API keys — single first-party client only.
- No webhook system.
- No bank/brokerage sync endpoints (Plaid-style) — manual entry only.
- No bulk-import endpoint beyond what `export` reverses — CSV *import* is a plausible v2 quality-of-life add (see `09-roadmap.md`), not v1.
