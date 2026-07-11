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

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-07" → "Jul '26", for compact chart axis labels. */
export function formatMonthShort(period: string): string {
  const [y, m] = period.split("-").map(Number);
  const mon = m ? MONTHS_SHORT[m - 1] : undefined;
  return mon && y ? `${mon} '${String(y).slice(-2)}` : period;
}
