import { describe, it, expect } from "vitest";
import { valueBase } from "./fx";

describe("valueBase (§1.6 unit-price conversion)", () => {
  it("fiat: 12,400 USD × 25,300 = 313,720,000", () => {
    expect(valueBase(12400, 25300).toNumber()).toBe(313_720_000);
  });

  it("crypto: 0.5 BTC × 1,600,000,000 = 800,000,000", () => {
    expect(valueBase("0.5", "1600000000").toNumber()).toBe(800_000_000);
  });

  it("native fiat (rate 1) is the identity", () => {
    expect(valueBase(152_000_000, 1).toNumber()).toBe(152_000_000);
  });

  it("keeps full precision on satoshi-granularity quantities", () => {
    // 0.00000001 BTC × 2,500,000,000,000 VND/BTC = 25,000 VND, exactly.
    expect(valueBase("0.00000001", "2500000000000").toString()).toBe("25000");
  });
});
