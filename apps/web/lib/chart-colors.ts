/**
 * Categorical color assignment for allocation charts. Each entity gets a FIXED
 * slot (never cycled by rank — dataviz rule); unknown/custom entities fold into
 * "other". Slots map to the validated --series-N tokens in globals.css.
 */
const TYPE_SLOT: Record<string, number> = {
  cash: 1,
  brokerage: 2,
  crypto: 3,
  real_estate: 4,
  retirement: 5,
  other_asset: 6,
  loan: 7,
  credit_card: 8,
};

const CURRENCY_SLOT: Record<string, number> = {
  VND: 1,
  USD: 2,
  EUR: 3,
  GBP: 4,
  SGD: 5,
  JPY: 6,
  BTC: 7,
  ETH: 8,
};

export function typeColor(slug: string): string {
  const slot = TYPE_SLOT[slug];
  return slot ? `var(--series-${slot})` : "var(--series-other)";
}

export function currencyColor(code: string): string {
  const slot = CURRENCY_SLOT[code];
  return slot ? `var(--series-${slot})` : "var(--series-other)";
}
