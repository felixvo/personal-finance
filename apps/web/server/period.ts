/** First day of the current month at midnight UTC — the snapshot period key. */
export function currentPeriodMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** "YYYY-MM" label for a period Date. */
export function formatPeriod(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
