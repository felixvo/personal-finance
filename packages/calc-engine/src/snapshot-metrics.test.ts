import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { computeMetrics } from "./snapshot-metrics";
import type { SnapshotInput } from "./types";

const D = (n: number | string) => new Decimal(n);
const snap = (partial: Partial<SnapshotInput>): SnapshotInput => ({
  holdings: [],
  cashFlows: [],
  ...partial,
});

describe("computeMetrics (§1 snapshot metrics)", () => {
  it("net worth = Σ assets − Σ liabilities", () => {
    const m = computeMetrics(
      snap({
        holdings: [
          { valueBase: D(1000), classification: "ASSET", isInvestable: true, isCash: false },
          { valueBase: D(300), classification: "LIABILITY", isInvestable: false, isCash: false },
        ],
      }),
    );
    expect(m.netWorth.toNumber()).toBe(700);
    expect(m.investableAssets.toNumber()).toBe(1000);
  });

  it("cash and investable are independent buckets", () => {
    const m = computeMetrics(
      snap({
        holdings: [
          { valueBase: D(200), classification: "ASSET", isInvestable: false, isCash: true },
          { valueBase: D(500), classification: "ASSET", isInvestable: true, isCash: false },
        ],
      }),
    );
    expect(m.cashPosition.toNumber()).toBe(200);
    expect(m.investableAssets.toNumber()).toBe(500);
  });

  it("savings rate = (income − expenses) / income", () => {
    const m = computeMetrics(
      snap({
        cashFlows: [
          { category: "ACTIVE_INCOME", amount: D(100) },
          { category: "PASSIVE_INCOME", amount: D(20) },
          { category: "EXPENSE", amount: D(60) },
        ],
      }),
    );
    expect(m.savingsRate!.toNumber()).toBeCloseTo(0.5, 12); // (120−60)/120
    expect(m.passiveIncome.toNumber()).toBe(20);
  });

  it("savings rate is null with no income (undefined, render as —)", () => {
    const m = computeMetrics(snap({ cashFlows: [{ category: "EXPENSE", amount: D(60) }] }));
    expect(m.savingsRate).toBeNull();
  });

  it("savings rate goes negative when expenses exceed income", () => {
    const m = computeMetrics(
      snap({
        cashFlows: [
          { category: "ACTIVE_INCOME", amount: D(100) },
          { category: "EXPENSE", amount: D(150) },
        ],
      }),
    );
    expect(m.savingsRate!.toNumber()).toBeCloseTo(-0.5, 12);
  });

  it("monthly invested is summed but excluded from net worth & savings", () => {
    const m = computeMetrics(
      snap({
        cashFlows: [
          { category: "ACTIVE_INCOME", amount: D(100) },
          { category: "INVESTMENT_CONTRIBUTION", amount: D(30) },
        ],
      }),
    );
    expect(m.monthlyInvested.toNumber()).toBe(30);
    expect(m.savingsRate!.toNumber()).toBe(1); // contribution does not count as an expense
  });
});
