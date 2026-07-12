/**
 * @atlas/calc-engine — pure financial calculations (docs/07).
 *
 * Framework-free and Decimal-only, so it runs identically on the server
 * (authoritative snapshot writes) and in the browser (live What-If recompute).
 */
export * from "./types";
export * from "./fx";
export * from "./snapshot-metrics";
export * from "./goal-pace";
export * from "./checkin-habit";
export * from "./what-if/accumulation";
export * from "./what-if/mortgage";

export { default as Decimal } from "decimal.js";
