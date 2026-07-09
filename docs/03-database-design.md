# 03 — Database Design

PostgreSQL schema implementing [02-domain-model.md](02-domain-model.md). Managed via Prisma Migrate (see [08-api-design.md](08-api-design.md) for stack rationale); this file is the source-of-truth DDL that the Prisma schema should match.

---

## 1. Design decisions

- **`NUMERIC(24,8)` for all money values**, not `FLOAT`/`DOUBLE` — financial values must never lose precision to floating-point rounding. 8 decimal places covers crypto **coin quantities** (satoshi granularity); 24 total digits comfortably covers VND amounts in the billions. Per-unit price (`fx_rate_to_base`) also uses `NUMERIC(24,8)` so a coin priced in the billions of VND still fits with headroom.
- **`value` is a native-unit amount, `fx_rate_to_base` is a per-unit price.** Following the native-coin-quantity decision, a `snapshot_holding` row stores *quantity* (fiat balance or coin count) × *unit price* (FX rate or coin price) = `value_base`. One code path for fiat and crypto.
- **`TIMESTAMPTZ` everywhere.** Households may check in from different timezones; store UTC, format client-side.
- **Soft-status, not soft-delete, for Holdings.** `status = ARCHIVED` instead of a `deleted_at` flag, because archived holdings still need to render correctly in historical snapshots.
- **Snapshots mutate in place.** No separate audit/history table in v1 — `version` + `updated_at` on `monthly_snapshot` is the only change signal, per the domain model's versioning rule.
- **Auth tables are not modeled here.** Recommended stack uses NextAuth/Auth.js, which manages its own `User` / `Account` / `Session` / `VerificationToken` tables via its Prisma adapter. `member` below is the application-level profile row, linked 1:1 to the Auth.js `User` via `member.user_id`.
- **`holding_type` is dual-scope:** global seed rows (`household_id IS NULL`) plus per-household custom rows. A surrogate UUID PK (not the slug) lets two households reuse a slug without collision.
- **UUID primary keys** (`gen_random_uuid()`, via `pgcrypto`) — avoids leaking row counts, safe for client-generated optimistic IDs later if needed.

---

## 2. Schema (DDL)

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ============ Enums ============

CREATE TYPE member_role          AS ENUM ('OWNER', 'MEMBER');
CREATE TYPE holding_classification AS ENUM ('ASSET', 'LIABILITY');
CREATE TYPE holding_status       AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE snapshot_status      AS ENUM ('DRAFT', 'COMPLETED');
CREATE TYPE cash_flow_category   AS ENUM ('ACTIVE_INCOME', 'PASSIVE_INCOME', 'EXPENSE', 'INVESTMENT_CONTRIBUTION');
CREATE TYPE goal_type            AS ENUM ('FIRE', 'NET_WORTH', 'HOUSE_FUND', 'EDUCATION_FUND', 'CUSTOM');
CREATE TYPE goal_tracking_mode   AS ENUM ('NET_WORTH', 'HOLDING_SUBSET');
CREATE TYPE goal_status          AS ENUM ('ACTIVE', 'ACHIEVED', 'ARCHIVED');

-- ============ Household & Members ============

CREATE TABLE household (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  base_currency  CHAR(3) NOT NULL,
  check_in_day   SMALLINT NOT NULL DEFAULT 1 CHECK (check_in_day BETWEEN 1 AND 28),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE member (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id   UUID NOT NULL REFERENCES household(id) ON DELETE CASCADE,
  user_id        TEXT NOT NULL UNIQUE,          -- = Auth.js User.id (1:1); Auth tables managed by the adapter
  name           TEXT NOT NULL,
  email          CITEXT NOT NULL UNIQUE,        -- denormalized from the Auth.js user
  role           member_role NOT NULL DEFAULT 'MEMBER',   -- onboarding sets the first member to 'OWNER'
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_member_household ON member(household_id);

-- ============ Holdings ============

CREATE TABLE holding_type (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id   UUID REFERENCES household(id) ON DELETE CASCADE,  -- NULL = global seed type
  slug           TEXT NOT NULL,               -- 'cash', 'brokerage', ... (not globally unique)
  label          TEXT NOT NULL,
  classification holding_classification NOT NULL,
  is_investable  BOOLEAN NOT NULL DEFAULT false,
  is_cash        BOOLEAN NOT NULL DEFAULT false
);

-- Slug is unique among global seeds, and unique per household among custom types — enforced
-- with two partial unique indexes since one plain UNIQUE can't express the NULL-scoped split.
CREATE UNIQUE INDEX uq_holding_type_global ON holding_type(slug)              WHERE household_id IS NULL;
CREATE UNIQUE INDEX uq_holding_type_custom ON holding_type(household_id, slug) WHERE household_id IS NOT NULL;
CREATE INDEX idx_holding_type_household ON holding_type(household_id) WHERE household_id IS NOT NULL;

CREATE TABLE holding (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL REFERENCES household(id) ON DELETE CASCADE,
  holding_type_id UUID NOT NULL REFERENCES holding_type(id),
  name            TEXT NOT NULL,
  institution     TEXT,
  currency        VARCHAR(12) NOT NULL,        -- denomination: ISO-4217 fiat code OR crypto ticker (BTC, USDT, ...)
  status          holding_status NOT NULL DEFAULT 'ACTIVE',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at     TIMESTAMPTZ
);

CREATE INDEX idx_holding_household_active ON holding(household_id) WHERE status = 'ACTIVE';

-- ============ Monthly Snapshots ============

CREATE TABLE monthly_snapshot (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id            UUID NOT NULL REFERENCES household(id) ON DELETE CASCADE,
  period_month            DATE NOT NULL,   -- normalized to first-of-month
  status                  snapshot_status NOT NULL DEFAULT 'DRAFT',
  notes                   TEXT,
  version                 INT NOT NULL DEFAULT 1,

  -- cached calculation-engine outputs (recomputed on every write)
  net_worth_base          NUMERIC(24,8),
  investable_assets_base  NUMERIC(24,8),
  cash_position_base      NUMERIC(24,8),
  passive_income_base     NUMERIC(24,8),
  savings_rate            NUMERIC(9,4),   -- signed fraction; wide enough for negative rates (expenses >> income)

  completed_at            TIMESTAMPTZ,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (household_id, period_month),
  CONSTRAINT period_month_is_first_of_month
    CHECK (date_trunc('month', period_month) = period_month)
);

CREATE INDEX idx_snapshot_household_period ON monthly_snapshot(household_id, period_month DESC);

CREATE TABLE snapshot_holding (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id     UUID NOT NULL REFERENCES monthly_snapshot(id) ON DELETE CASCADE,
  holding_id      UUID NOT NULL REFERENCES holding(id) ON DELETE CASCADE,
  value           NUMERIC(24,8) NOT NULL,      -- native-unit amount: fiat balance OR coin quantity
  fx_rate_to_base NUMERIC(24,8) NOT NULL DEFAULT 1,  -- price of ONE native unit in base currency
  value_base      NUMERIC(24,8) NOT NULL,      -- value * fx_rate_to_base

  UNIQUE (snapshot_id, holding_id)
);

-- NOTE: holding_id is ON DELETE CASCADE (not RESTRICT). Domain invariant 7 — "a holding with
-- snapshot history can't be hard-deleted" — is enforced in the API layer (holding.delete returns
-- CONFLICT), NOT via this FK. RESTRICT here would deadlock the household-deletion cascade (holding
-- and monthly_snapshot both cascade from household, and RESTRICT can't be deferred), so a household
-- could never be deleted. CASCADE keeps the danger-zone "Delete household" flow working.

CREATE INDEX idx_snapshot_holding_snapshot ON snapshot_holding(snapshot_id);
CREATE INDEX idx_snapshot_holding_holding  ON snapshot_holding(holding_id);

CREATE TABLE snapshot_cash_flow (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id  UUID NOT NULL REFERENCES monthly_snapshot(id) ON DELETE CASCADE,
  category     cash_flow_category NOT NULL,
  label        TEXT NOT NULL,
  amount       NUMERIC(24,8) NOT NULL
);

CREATE INDEX idx_cash_flow_snapshot ON snapshot_cash_flow(snapshot_id);

-- ============ Goals ============

CREATE TABLE goal (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id   UUID NOT NULL REFERENCES household(id) ON DELETE CASCADE,
  type           goal_type NOT NULL,
  name           TEXT NOT NULL,
  target_amount  NUMERIC(24,8) NOT NULL,
  target_date    DATE,
  tracking_mode  goal_tracking_mode NOT NULL DEFAULT 'NET_WORTH',
  status         goal_status NOT NULL DEFAULT 'ACTIVE',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_goal_household ON goal(household_id);

CREATE TABLE goal_holding (
  goal_id     UUID NOT NULL REFERENCES goal(id) ON DELETE CASCADE,
  holding_id  UUID NOT NULL REFERENCES holding(id) ON DELETE CASCADE,
  PRIMARY KEY (goal_id, holding_id)
);

-- ============ Reminder state ============
-- Tracks reminder/follow-up emails per household per period. Lives in its own table because at
-- reminder time the monthly_snapshot for that period usually does NOT exist yet (that's the point
-- of the nudge) — so these timestamps can't hang off monthly_snapshot. See 08-api-design.md §4.

CREATE TABLE checkin_reminder_state (
  household_id     UUID NOT NULL REFERENCES household(id) ON DELETE CASCADE,
  period_month     DATE NOT NULL,              -- normalized to first-of-month
  reminder_sent_at TIMESTAMPTZ,
  follow_up_sent_at TIMESTAMPTZ,
  PRIMARY KEY (household_id, period_month),
  CONSTRAINT reminder_period_is_first_of_month
    CHECK (date_trunc('month', period_month) = period_month)
);
```

---

## 3. Seed data — `holding_type`

Loaded once via migration seed script as **global** rows (`household_id = NULL`). Households add their own rows through Settings → Holding Types (with `household_id` set and `classification` chosen by the user); those are covered by the API, not this seed.

```sql
INSERT INTO holding_type (household_id, slug, label, classification, is_investable, is_cash) VALUES
  (NULL, 'cash',            'Cash',            'ASSET',     false, true),
  (NULL, 'brokerage',       'Brokerage',       'ASSET',     true,  false),
  (NULL, 'crypto',          'Crypto',          'ASSET',     true,  false),
  (NULL, 'real_estate',     'Real Estate',     'ASSET',     false, false),
  (NULL, 'retirement',      'Retirement',      'ASSET',     true,  false),
  (NULL, 'other_asset',     'Other Asset',     'ASSET',     false, false),
  (NULL, 'loan',            'Loan',            'LIABILITY', false, false),
  (NULL, 'credit_card',     'Credit Card',     'LIABILITY', false, false),
  (NULL, 'other_liability', 'Other Liability', 'LIABILITY', false, false);
```

`id` is auto-generated (`gen_random_uuid()`); application code resolves seed types by `slug` where `household_id IS NULL`.

---

## 4. Query patterns the schema optimizes for

| Access pattern | Index used |
|---|---|
| "Latest snapshot for household" (Home dashboard) | `idx_snapshot_household_period` (`ORDER BY period_month DESC LIMIT 1`) |
| "All active holdings for household" (Check-in step 1 copy-forward, Assets page) | `idx_holding_household_active` (partial index — excludes archived rows) |
| "Value history for one holding" (Holding detail sparkline) | `idx_snapshot_holding_holding` |
| "All line items in a snapshot" (Snapshot detail, check-in review) | `idx_snapshot_holding_snapshot`, `idx_cash_flow_snapshot` |
| "One snapshot per household per month" | `UNIQUE (household_id, period_month)` — also prevents duplicate check-ins for the same period at the DB layer, not just app logic |

---

## 5. Lifecycle notes

- **Starting a check-in** inserts a `DRAFT` `monthly_snapshot` row immediately, plus `snapshot_holding` / `snapshot_cash_flow` rows copy-forwarded from the latest `COMPLETED` snapshot for the household (see domain model invariant 9). This means a draft always exists as a real row from the moment the wizard opens — resuming later is just re-fetching it.
- **Discarding a draft** (user exits and chooses "discard" rather than "save for later") is a hard `DELETE` on the `monthly_snapshot` row — cascades remove its `snapshot_holding` / `snapshot_cash_flow` children. Safe because `status = DRAFT` rows are never referenced by Goals or Timeline.
- **Completing a check-in** sets `status = COMPLETED`, `completed_at = now()`, and computes+stores the cached metrics.
- **Editing a completed snapshot** (from Timeline) updates rows in place, increments `version`, bumps `updated_at`, and recomputes cached metrics. No new row is created.
- **Archiving a holding** sets `status = ARCHIVED`, `archived_at = now()`. It's excluded from the next check-in's copy-forward step (invariant 9 only copies `ACTIVE` holdings) but its existing `snapshot_holding` rows in past snapshots are untouched.

---

## 6. Multi-tenancy / isolation

All tenant-scoped tables key off `household_id` (directly or transitively via `snapshot_id`/`holding_id`/`goal_id`). The one deliberate exception is `holding_type`, which is **dual-scope**: rows with `household_id IS NULL` are global seeds shared by every household, while rows with `household_id` set are private custom types. Queries that list a household's types must therefore filter `household_id = :hh OR household_id IS NULL` — the only place a tenant query intentionally reaches outside its own `household_id`.

Two viable enforcement layers, either is acceptable for v1:

1. **Application-layer scoping** — every query filters by the authenticated member's `household_id`. Simpler, matches a Prisma-based API layer.
2. **Postgres Row-Level Security (RLS)** — defense-in-depth if using Supabase or exposing the DB more directly. Recommended if v2 ever adds direct client-to-DB access (e.g. Supabase client SDK); not required if all access goes through the API layer in `08-api-design.md`.

v1 recommendation: application-layer scoping only, revisit RLS if the API layer is ever bypassed.

---

## 7. Migration tooling

Prisma Migrate, with this SQL as the reviewed source of truth for the initial migration (write the Prisma schema to generate equivalent DDL, don't hand-diverge). Seed script loads §3 data. Future schema changes go through `prisma migrate dev` in development and `prisma migrate deploy` in CI/CD.
