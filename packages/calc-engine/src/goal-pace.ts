import Decimal from "decimal.js";
import type { GoalTrackingMode } from "./types";

/**
 * §2 — Goal pace & projection. Backward-looking, derived from actual snapshot
 * history (distinct from the forward-looking What-If engine in what-if/).
 */

/** A completed snapshot's tracked value for one goal, in chronological order. */
export interface TrackedPoint {
  /** "YYYY-MM", normalized to first-of-month. */
  periodMonth: string;
  value: Decimal;
}

export type PaceStatus = "good" | "warning" | null;

export type GoalProjection =
  | { status: "insufficient-data" }
  | { status: "achieved" }
  | { status: "not-on-pace" }
  | {
      status: "projected";
      monthsRemaining: number;
      estimatedDate: string; // "YYYY-MM"
      pace: Decimal; // base currency / month
      paceStatus: PaceStatus;
    };

export interface GoalProgress {
  /** Clamped to [0,1] for the progress bar; `null` when target <= 0. */
  pct: Decimal | null;
  /** Unclamped ratio for the label (can exceed 1, or read low/negative). */
  raw: Decimal | null;
}

/** §2.1 — the value a goal tracks in a given snapshot. */
export function trackedValue(
  netWorthBase: Decimal,
  mode: GoalTrackingMode,
  linkedHoldingValueBases: Decimal[] = [],
): Decimal {
  if (mode === "NET_WORTH") return netWorthBase;
  return linkedHoldingValueBases.reduce(
    (sum, v) => sum.plus(v),
    new Decimal(0),
  );
}

/** §2.1 — progress = clamp(tracked / target, 0, 1), with raw ratio for the label. */
export function goalProgress(latestTracked: Decimal, target: Decimal): GoalProgress {
  if (target.lte(0)) return { pct: null, raw: null };
  const raw = latestTracked.div(target);
  return { pct: Decimal.max(0, Decimal.min(1, raw)), raw };
}

/**
 * §2.2 — pace = trailing simple moving average of month-over-month deltas over
 * the last min(6, N−1) intervals. `null` with fewer than two completed points.
 */
export function goalPace(points: TrackedPoint[]): Decimal | null {
  if (points.length < 2) return null;
  const deltas: Decimal[] = [];
  for (let i = 1; i < points.length; i++) {
    deltas.push(points[i]!.value.minus(points[i - 1]!.value));
  }
  const window = deltas.slice(-6);
  const sum = window.reduce((a, b) => a.plus(b), new Decimal(0));
  return sum.div(window.length);
}

/**
 * §2.3 / §2.4 — projected completion + on-track/behind status.
 * `targetDate` (optional, "YYYY-MM…") enables the pace comparison; only the
 * year-month is significant.
 */
export function goalProjection(
  points: TrackedPoint[],
  target: Decimal,
  targetDate?: string | null,
): GoalProjection {
  const pace = goalPace(points);
  const latest = points.length ? points[points.length - 1]! : null;
  const tracked = latest ? latest.value : new Decimal(0);
  const remaining = target.minus(tracked);

  if (pace === null) return { status: "insufficient-data" };
  if (remaining.lte(0)) return { status: "achieved" };
  if (pace.lte(0)) return { status: "not-on-pace" };

  const monthsRemaining = remaining.div(pace).ceil().toNumber();
  const estimatedDate = addMonths(latest!.periodMonth, monthsRemaining);

  let paceStatus: PaceStatus = null;
  if (targetDate) {
    paceStatus = estimatedDate <= targetDate.slice(0, 7) ? "good" : "warning";
  }
  return { status: "projected", monthsRemaining, estimatedDate, pace, paceStatus };
}

/** Add `n` whole months to a "YYYY-MM" period, rolling over year boundaries. */
export function addMonths(periodMonth: string, n: number): string {
  const [y, m] = periodMonth.split("-").map(Number);
  const total = y! * 12 + (m! - 1) + n;
  const year = Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}
