# 03 — Database Design

PostgreSQL schema implementing [02-domain-model.md](02-domain-model.md). Managed via Prisma Migrate (see [08-api-design.md](08-api-design.md) for stack rationale); this file is the source-of-truth DDL that the Prisma schema should match.

---

## 1. Design decisions

- **`NUMERIC(24,8)` for all money values**, not `FLOAT`/`DOUBLE` — financial values must never lose precision to floating-point rounding. 8 decimal places covers crypto holdings (e.g. BTC); 24 total digits comfortably covers VND amounts in the billions.
- **`TIMESTAMPTZ` everywhere.** Households may check in from different timezones; store UTC, format client-side.
- **Soft-status, not soft-delete, for Holdings.** `status = ARCHIVED` instead of a `deleted_at` flag, because archived holdings still need to render correctly in historical snapshots.
- **Snapshots mutate in place.** No separate audit/history table in v1 — `version` + `updated_at` on `monthly_snapshot` is the only change signal, per the domain model's versioning rule.
- **Auth tables are not modeled here.** Recommended stack uses NextAuth/Auth.js, which manages its own `Account` / `Session` / `VerificationToken` tables via its Prisma adapter. `member` below is the application-level profile row, linked 1:1 to the auth provider's user record.
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
  name           TEXT NOT NULL,
  email          CITEXT NOT NULL UNIQUE,
  role           member_role NOT NULL DEFAULT 'MEMBER',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_member_household ON member(household_id);

-- ============ Holdings ============

CREATE TABLE holding_type (
  id             TEXT PRIMARY KEY,           -- slug: 'cash', 'brokerage', ...
  label          TEXT NOT NULL,
  classification holding_classification NOT NULL,
  is_investable  BOOLEAN NOT NULL DEFAULT false,
  is_cash        BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE holding (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL REFERENCES household(id) ON DELETE CASCADE,
  holding_type_id TEXT NOT NULL REFERENCES holding_type(id),
  name            TEXT NOT NULL,
  institution     TEXT,
  currency        CHAR(3) NOT NULL,
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
  savings_rate            NUMERIC(6,4),

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
  holding_id      UUID NOT NULL REFERENCES holding(id) ON DELETE RESTRICT,
  value           NUMERIC(24,8) NOT NULL,
  fx_rate_to_base NUMERIC(18,8) NOT NULL DEFAULT 1,
  value_base      NUMERIC(24,8) NOT NULL,

  UNIQUE (snapshot_id, holding_id)
);

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
```

---

## 3. Seed data — `holding_type`

Loaded once via migration seed script, editable only through a future admin surface (not user-facing in v1 beyond Settings → Holding Types adding new rows with `classification` chosen by the user).

```sql
INSERT INTO holding_type (id, label, classification, is_investable, is_cash) VALUES
  ('cash',            'Cash',            'ASSET',     false, true),
  ('brokerage',       'Brokerage',       'ASSET',     true,  false),
  ('crypto',          'Crypto',          'ASSET',     true,  false),
  ('real_estate',     'Real Estate',     'ASSET',     false, false),
  ('retirement',      'Retirement',      'ASSET',     true,  false),
  ('other_asset',     'Other Asset',     'ASSET',     false, false),
  ('loan',            'Loan',            'LIABILITY', false, false),
  ('credit_card',     'Credit Card',     'LIABILITY', false, false),
  ('other_liability', 'Other Liability', 'LIABILITY', false, false);
```

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

All tenant-scoped tables key off `household_id` (directly or transitively via `snapshot_id`/`holding_id`/`goal_id`). Two viable enforcement layers, either is acceptable for v1:

1. **Application-layer scoping** — every query filters by the authenticated member's `household_id`. Simpler, matches a Prisma-based API layer.
2. **Postgres Row-Level Security (RLS)** — defense-in-depth if using Supabase or exposing the DB more directly. Recommended if v2 ever adds direct client-to-DB access (e.g. Supabase client SDK); not required if all access goes through the API layer in `08-api-design.md`.

v1 recommendation: application-layer scoping only, revisit RLS if the API layer is ever bypassed.

---

## 7. Migration tooling

Prisma Migrate, with this SQL as the reviewed source of truth for the initial migration (write the Prisma schema to generate equivalent DDL, don't hand-diverge). Seed script loads §3 data. Future schema changes go through `prisma migrate dev` in development and `prisma migrate deploy` in CI/CD.
