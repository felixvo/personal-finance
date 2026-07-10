import Decimal from "decimal.js";

/**
 * §1.6 — Unit-price conversion (fiat FX **and** crypto share one formula).
 *
 * `value` is an amount in the holding's native unit (a fiat balance, or a coin
 * quantity). `fxRateToBase` is the price of ONE native unit in base currency:
 *   - 1, when the holding is already in the base currency;
 *   - a fiat exchange rate (e.g. VND per 1 USD); or
 *   - a crypto unit price (e.g. VND per 1 BTC).
 *
 * The rate is frozen at write time and stored on the row — historical
 * `valueBase` is never recomputed when today's rate moves (invariant 8).
 */
export function valueBase(
  value: Decimal.Value,
  fxRateToBase: Decimal.Value,
): Decimal {
  return new Decimal(value).mul(fxRateToBase);
}
