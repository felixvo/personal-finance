/** Base-currency options offered at household creation. Stored as CHAR(3). */
export const CURRENCY_CODES = [
  "VND",
  "USD",
  "EUR",
  "GBP",
  "SGD",
  "JPY",
  "AUD",
  "CAD",
  "CHF",
  "CNY",
] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];
