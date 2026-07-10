import { z } from "zod";

/**
 * Monetary values cross the wire as strings, parsed to Decimal on both ends
 * (docs/08 §2) — never JS numbers, which would silently lose precision.
 */
export const moneyString = z
  .string()
  .trim()
  .regex(/^\d{1,20}(\.\d{1,8})?$/, "Enter a valid amount");
