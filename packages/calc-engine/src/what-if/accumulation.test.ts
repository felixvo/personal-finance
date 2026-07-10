import { describe, it, expect } from "vitest";
import { futureValue, solveMonths } from "./accumulation";

describe("futureValue (§3.1 ordinary annuity)", () => {
  it("r == 0 edge: PV + PMT·n", () => {
    expect(futureValue(1000, 50, 0, 10).toNumber()).toBe(1500);
  });

  it("annuity growth matches the closed form", () => {
    // PV 0, PMT 100, 12%/yr → 1%/mo over 12 mo = 1268.2503…
    expect(futureValue(0, 100, 0.12, 12).toNumber()).toBeCloseTo(1268.250301, 4);
  });

  it("PV compounds alongside contributions", () => {
    // 1000 · 1.01^12 = 1126.8250…
    expect(futureValue(1000, 0, 0.12, 12).toNumber()).toBeCloseTo(1126.82503, 4);
  });
});

describe("solveMonths (§3.2 closed-form inversion)", () => {
  it("inverts futureValue (~12 months)", () => {
    expect(solveMonths(0, 100, 0.12, 1268.250301)).toBeCloseTo(12, 3);
  });

  it("r == 0 linear case", () => {
    // need 4000 more at 100/mo, no growth → 40 months
    expect(solveMonths(1000, 100, 0, 5000)).toBe(40);
  });

  it("unreachable target → Infinity (no contributions, no growth)", () => {
    expect(solveMonths(1000, 0, 0, 5000)).toBe(Infinity);
  });

  it("already reached → 0", () => {
    expect(solveMonths(6000, 0, 0, 5000)).toBe(0);
  });
});
