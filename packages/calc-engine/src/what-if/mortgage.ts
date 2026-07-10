import Decimal from "decimal.js";

/**
 * §3.4 — Mortgage amortization. Different input shape from the accumulation
 * simulations (a loan, not a savings plan), so it gets its own function.
 */

const RATE_EPSILON = new Decimal("1e-12");

export interface MortgageResult {
  /** Level monthly payment M. */
  payment: Decimal;
  /** M × n. */
  totalPaid: Decimal;
  /** (M × n) − P. */
  totalInterest: Decimal;
  /** balance_0..balance_n (length n+1); balance_0 = principal, clamped ≥ 0. */
  balances: Decimal[];
  /** Loan term in months. */
  months: number;
}

export function mortgage(
  principal: Decimal.Value,
  rAnnual: Decimal.Value,
  years: number,
): MortgageResult {
  const P = new Decimal(principal);
  const r = new Decimal(rAnnual).div(12);
  const n = Math.round(years * 12);

  let payment: Decimal;
  if (r.abs().lt(RATE_EPSILON)) {
    payment = P.div(n);
  } else {
    const g = r.plus(1).pow(n);
    payment = P.mul(r.mul(g)).div(g.minus(1));
  }

  let balance = P;
  const balances: Decimal[] = [Decimal.max(0, balance)];
  for (let i = 0; i < n; i++) {
    const interest = balance.mul(r);
    balance = balance.minus(payment.minus(interest));
    balances.push(Decimal.max(0, balance));
  }

  const totalPaid = payment.mul(n);
  return {
    payment,
    totalPaid,
    totalInterest: totalPaid.minus(P),
    balances,
    months: n,
  };
}
