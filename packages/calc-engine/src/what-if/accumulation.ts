import Decimal from "decimal.js";

/**
 * §3.1 / §3.2 — Forward-looking accumulation (Future Value, Compound Interest,
 * Retirement, Goal Projection). Ephemeral, client-side; shares this one formula.
 *
 * Rate convention (§3.1 note): r = rAnnual / 12 (nominal division), NOT the
 * compounded-equivalent — matches how retail calculators present "annual
 * return". Surface this in the UI so it's never a silent assumption.
 */

const RATE_EPSILON = new Decimal("1e-12");

const isZeroRate = (r: Decimal): boolean => r.abs().lt(RATE_EPSILON);

/**
 * §3.1 — ordinary annuity (contributions at end of each month).
 *   FV = PV·(1+r)^n + PMT·(((1+r)^n − 1) / r)      (r ≠ 0)
 *   FV = PV + PMT·n                                 (r = 0)
 */
export function futureValue(
  pv: Decimal.Value,
  pmt: Decimal.Value,
  rAnnual: Decimal.Value,
  months: number,
): Decimal {
  const PV = new Decimal(pv);
  const PMT = new Decimal(pmt);
  const r = new Decimal(rAnnual).div(12);
  if (isZeroRate(r)) return PV.plus(PMT.mul(months));
  const g = r.plus(1).pow(months);
  return PV.mul(g).plus(PMT.mul(g.minus(1)).div(r));
}

/**
 * §3.2 — solve for the number of months to reach `target` (closed form).
 * Returns `Infinity` when the target is mathematically unreachable (surface as
 * "not reachable with current inputs", never an error or infinite chart), and
 * `0` when it is already met.
 */
export function solveMonths(
  pv: Decimal.Value,
  pmt: Decimal.Value,
  rAnnual: Decimal.Value,
  target: Decimal.Value,
): number {
  const PV = new Decimal(pv);
  const PMT = new Decimal(pmt);
  const FV = new Decimal(target);
  const r = new Decimal(rAnnual).div(12);

  if (isZeroRate(r)) {
    if (PMT.lte(0)) return PV.gte(FV) ? 0 : Infinity;
    return Decimal.max(0, FV.minus(PV).div(PMT)).toNumber();
  }

  const denom = PV.plus(PMT.div(r));
  const numer = FV.plus(PMT.div(r));
  if (denom.lte(0) || numer.div(denom).lte(0)) return Infinity;

  const n = numer.div(denom).ln().div(r.plus(1).ln());
  return n.gt(0) ? n.toNumber() : 0;
}
