import Decimal from "decimal.js";
import type { SnapshotInput } from "./types";

/**
 * §1 — Snapshot metrics. Computed once per snapshot completion/edit and cached
 * on `monthly_snapshot`. Pure: same inputs → same outputs, no I/O.
 */
export interface SnapshotMetrics {
  /** §1.1 Σ asset valueBase − Σ liability valueBase. */
  netWorth: Decimal;
  /** §1.2 Σ valueBase where isInvestable. */
  investableAssets: Decimal;
  /** §1.3 Σ valueBase where isCash. */
  cashPosition: Decimal;
  /** §1.4 Σ PASSIVE_INCOME. */
  passiveIncome: Decimal;
  /** §1.7 Σ INVESTMENT_CONTRIBUTION — derived, not fed into net worth/savings. */
  monthlyInvested: Decimal;
  /**
   * §1.5 (income − expenses) / income. `null` when there is no income at all —
   * undefined, not zero; render as "—". Can be negative when expenses > income.
   */
  savingsRate: Decimal | null;
}

export function computeMetrics(snapshot: SnapshotInput): SnapshotMetrics {
  let netWorth = new Decimal(0);
  let investableAssets = new Decimal(0);
  let cashPosition = new Decimal(0);

  for (const h of snapshot.holdings) {
    netWorth =
      h.classification === "ASSET"
        ? netWorth.plus(h.valueBase)
        : netWorth.minus(h.valueBase);
    if (h.isInvestable) investableAssets = investableAssets.plus(h.valueBase);
    if (h.isCash) cashPosition = cashPosition.plus(h.valueBase);
  }

  let activeIncome = new Decimal(0);
  let passiveIncome = new Decimal(0);
  let expenses = new Decimal(0);
  let monthlyInvested = new Decimal(0);

  for (const f of snapshot.cashFlows) {
    switch (f.category) {
      case "ACTIVE_INCOME":
        activeIncome = activeIncome.plus(f.amount);
        break;
      case "PASSIVE_INCOME":
        passiveIncome = passiveIncome.plus(f.amount);
        break;
      case "EXPENSE":
        expenses = expenses.plus(f.amount);
        break;
      case "INVESTMENT_CONTRIBUTION":
        monthlyInvested = monthlyInvested.plus(f.amount);
        break;
    }
  }

  const totalIncome = activeIncome.plus(passiveIncome);
  const savingsRate = totalIncome.isZero()
    ? null
    : totalIncome.minus(expenses).div(totalIncome);

  return {
    netWorth,
    investableAssets,
    cashPosition,
    passiveIncome,
    monthlyInvested,
    savingsRate,
  };
}
