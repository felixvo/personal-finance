# 09 — Roadmap

Execution plan tying together `00`–`08`. Sizes are relative (**S** = days, **M** =1-2 weeks, **L** = 2-4 weeks, at a solo/small-team pace) rather than calendar dates, since team size and available hours aren't specified yet — swap in real dates once that's known.

---

## 1. Sequencing principle

Build the core monthly ritual **end-to-end, ugly, before building anything wide.** The riskiest assumption in the whole product isn't "can we compute FIRE projections correctly" — it's "will a household actually open this and complete a check-in, twice, a month apart." Phase 1 exists to test that as fast as possible; Goals, What-If, and visual polish only pay off if that loop already works.

---

## 2. Phase 0 — Foundations (S)

- Repo scaffold: Next.js + TS, Prisma + Postgres (Neon/Supabase), tRPC wiring, Auth.js — per stack in [08-api-design.md](08-api-design.md) §1.
- Deploy skeleton to Vercel immediately (empty app) — confirms the pipeline works before any feature work depends on it.
- Run the [database schema](03-database-design.md) §2 migration; load §3 seed data (`holding_type`).
- Scaffold the `calc-engine` package ([07-calculation-engine.md](07-calculation-engine.md) §5) with a unit-test harness — this module gets built out incrementally through Phase 1–2 but the package boundary and `Decimal`-only convention should exist from day one, since retrofitting float-safety later is much more painful than starting with it.

**Exit criteria:** empty app deployed, DB migrated, `npm test` runs (even with zero tests yet).

---

## 3. Phase 1 — MVP: the core ritual (M–L)

**Goal:** one household can complete a real monthly check-in, twice in a row, a month apart.

- Auth: sign up, household creation (name, base currency, check-in day) — [04-user-flows.md](04-user-flows.md) Flow 1.
- Holding CRUD: create, list, archive — plain list, **no allocation charts yet**.
- Check-in wizard, all 5 steps (Flow 1 + Flow 2), `DRAFT`/`COMPLETED` lifecycle, copy-forward logic (domain invariant 9).
- Home: both states (pending / dashboard), stat tiles only — no charts yet, just numbers.
- Timeline: plain reverse-chronological list + read-only snapshot detail.
- `calc-engine` §1 (snapshot metrics: Net Worth, Investable Assets, Cash Position, Passive Income, Savings Rate) wired end to end and unit-tested.

**Deliberately deferred out of Phase 1:** Goals, What-If, allocation charts, reminder emails, snapshot editing, design-system chart polish. All of it is additive on top of a working ritual, not a prerequisite for testing one.

**Exit criteria:** a household can sign up, complete an onboarding check-in, and one (real or simulated) month later complete a second check-in that correctly copy-forwards and shows a delta in Timeline.

---

## 4. Phase 2 — v1 complete: all five questions answerable (M–L)

- Assets page: allocation bars ([06-design-system.md](06-design-system.md) §3 — horizontal stacked bar, not donut), currency allocation, holding detail history/sparkline.
- Goals: create/list/detail, pace projection ([07](07-calculation-engine.md) §2).
- What-If: all 5 simulation types ([07](07-calculation-engine.md) §3), reusing `calc-engine` client-side.
- Snapshot editing (Flow 8) with version increment.
- Design-system full pass: mark specs, dark mode selected against its own surface, `validate_palette.js` run on the final categorical assignment ([06](06-design-system.md) §8).
- Check-in reminder email + follow-up ([04](04-user-flows.md) Flow 3, [08](08-api-design.md) §4) — not in the original PRD's explicit flows, but required for the "monthly ritual" to actually sustain itself past month one. Treat as core, not a nice-to-have.
- Data export (CSV/JSON).

**Exit criteria:** all Five Core Questions from [00-product-vision.md](00-product-vision.md) are answerable in the live product, and a lapsed household gets nudged back in automatically.

---

## 5. Phase 3 — Hardening (M)

- Mobile responsive pass ([05](05-wireframes.md) §8).
- Accessibility checklist ([06](06-design-system.md) §8) run against every shipped screen, not just charts.
- Empty-state and error-state audit (zero holdings, zero goals, first-ever login, failed FX entry, etc.).
- Instrument the product-level success metrics defined in [00-product-vision.md](00-product-vision.md): check-in completion time, completion rate, streak retention, time-to-first-check-in. Without this, there's no way to know if Phase 1's core bet actually paid off.

---

## 6. v2 candidates (explicitly deferred)

Consolidated from the open questions and "deferred" notes scattered through `00`–`08`, collected here so they're tracked in one place instead of lost in prose:

| Item | Why deferred | Source |
|---|---|---|
| Automatic FX/market price fetching (still user-confirmed, never silent) | v1 stays manual-entry to match the state-based philosophy exactly; automation is a friction-reducer, not a v1 requirement | `00` Q3 |
| Field-level audit trail for snapshot edits | `version` counter is enough signal for v1; full diffs are meaningfully more schema/UI work | `00` Q5, `02` §4 |
| Change household base currency post-creation | Requires re-converting all historical snapshots — real migration risk, not worth it before v1 has real historical data to migrate | `00` Q2, `02` §4 |
| Per-member permission tiers (view-only member, etc.) | v1 household is small (family) and trusted; adds real complexity for unclear value at this scale | `00` Q1, `02` §4 |
| Persisted / named What-If scenarios | Ephemeral client-side is simpler and sufficient until users actually ask to save one | `00` Q9, `08` §3.7 |
| Postgres Row-Level Security | Only matters if something other than the API layer ever touches the DB directly | `03` §6 |
| OLS regression for goal pace (vs. trailing moving average) | Moving average is simpler and more explainable; revisit only if pace projections prove noisy in practice | `07` §2.2 |
| Per-household timezone for reminder scheduling | v1 hardcodes one timezone since the first household is Vietnam-based | `08` §4 |
| CSV import | `export` exists in v1; import is symmetric but not required for the core loop | `08` §5 |
| Public API / external integrations / webhooks / bank sync | No third-party consumers exist yet; would also cut against the state-based, manual-entry philosophy | `08` §5, `00` Non-Goals |

---

## 7. What this roadmap deliberately excludes

- **Multi-household / advisor / B2B product.** Not a "later" item — it's a different product, explicitly out of vision per `00`'s Non-Goals.
- **Budgeting/envelope systems, tax features, brokerage execution.** Same — out of vision, not just out of sequence.
- **Calendar-date estimates.** Sizes above are relative; convert to dates once weekly available hours are known, otherwise the estimates will be more fiction than plan.
