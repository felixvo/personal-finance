/** Format a base-currency amount for display. Falls back gracefully for
 *  non-ISO codes (e.g. a crypto ticker used as a household base). */
export function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${Math.round(value).toLocaleString("en-US")} ${currency}`;
  }
}

/** Format a signed decimal fraction (0.42) as a percentage ("42.0%"). */
export function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}
