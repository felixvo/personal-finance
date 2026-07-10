import Decimal from "decimal.js";

/**
 * Shared input shapes for the calculation engine (docs/07).
 *
 * The engine is deliberately decoupled from Prisma / the DB: callers resolve
 * holding-type flags and per-holding base values first, then hand the engine
 * plain value objects. Every monetary field is a `Decimal` — never a JS
 * `number` — per the non-negotiable precision rule in docs/07.
 */

export type HoldingClassification = "ASSET" | "LIABILITY";

export type CashFlowCategory =
  | "ACTIVE_INCOME"
  | "PASSIVE_INCOME"
  | "EXPENSE"
  | "INVESTMENT_CONTRIBUTION";

export type GoalTrackingMode = "NET_WORTH" | "HOLDING_SUBSET";

/** One holding line inside a snapshot, with its type flags already resolved. */
export interface SnapshotHoldingLine {
  /** value × fxRateToBase — a base-currency amount (see fx.ts / §1.6). */
  valueBase: Decimal;
  classification: HoldingClassification;
  isInvestable: boolean;
  isCash: boolean;
}

export interface CashFlowLine {
  category: CashFlowCategory;
  amount: Decimal;
}

export interface SnapshotInput {
  holdings: SnapshotHoldingLine[];
  cashFlows: CashFlowLine[];
}
