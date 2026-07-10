import { describe, it, expect } from "vitest";
import { mortgage } from "./mortgage";

describe("mortgage (§3.4 amortization)", () => {
  it("payment matches the standard amortization formula", () => {
    const m = mortgage(100_000, 0.06, 30); // 100k @ 6%/yr, 30yr
    expect(m.payment.toNumber()).toBeCloseTo(599.55, 2);
    expect(m.months).toBe(360);
  });

  it("total interest = payment·n − principal", () => {
    const m = mortgage(100_000, 0.06, 30);
    expect(m.totalInterest.toNumber()).toBeCloseTo(
      m.payment.mul(360).minus(100_000).toNumber(),
      6,
    );
  });

  it("amortizes down to an essentially zero balance", () => {
    const m = mortgage(100_000, 0.06, 30);
    const last = m.balances[m.balances.length - 1]!;
    expect(last.abs().toNumber()).toBeLessThan(1e-6);
  });

  it("r == 0 edge: straight-line payment P/n", () => {
    const m = mortgage(120_000, 0, 10); // 120k / 120 months
    expect(m.payment.toNumber()).toBe(1000);
  });
});
