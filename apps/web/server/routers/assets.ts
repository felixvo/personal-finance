import { router, householdProcedure } from "../trpc";
import { formatPeriod } from "../period";

export const assetsRouter = router({
  /**
   * The Assets view (docs/01 §3.4): the latest COMPLETED snapshot's holdings
   * grouped by type, plus asset allocation by type and by currency (assets
   * only). A read view — values are edited inside the check-in, not here.
   */
  get: householdProcedure.query(async ({ ctx }) => {
    const snap = await ctx.prisma.monthlySnapshot.findFirst({
      where: { householdId: ctx.householdId, status: "COMPLETED" },
      orderBy: { periodMonth: "desc" },
      include: { holdings: { include: { holding: { include: { holdingType: true } } } } },
    });
    if (!snap) return null;

    const rows = snap.holdings.map((sh) => ({
      name: sh.holding.name,
      currency: sh.holding.currency,
      typeSlug: sh.holding.holdingType.slug,
      typeLabel: sh.holding.holdingType.label,
      classification: sh.holding.holdingType.classification,
      valueBaseStr: sh.valueBase.toString(),
      valueBase: Number(sh.valueBase.toString()),
    }));

    // Holdings grouped by type (assets and liabilities both listed).
    const groupMap = new Map<
      string,
      {
        typeLabel: string;
        classification: "ASSET" | "LIABILITY";
        holdings: { name: string; currency: string; valueBase: string }[];
        total: number;
      }
    >();
    for (const r of rows) {
      const g =
        groupMap.get(r.typeSlug) ??
        { typeLabel: r.typeLabel, classification: r.classification, holdings: [], total: 0 };
      g.holdings.push({ name: r.name, currency: r.currency, valueBase: r.valueBaseStr });
      g.total += r.valueBase;
      groupMap.set(r.typeSlug, g);
    }

    // Allocation is assets-only.
    const byType = new Map<string, { label: string; value: number }>();
    const byCurrency = new Map<string, number>();
    let totalAssets = 0;
    let totalLiabilities = 0;
    for (const r of rows) {
      if (r.classification === "ASSET") {
        totalAssets += r.valueBase;
        const t = byType.get(r.typeSlug) ?? { label: r.typeLabel, value: 0 };
        t.value += r.valueBase;
        byType.set(r.typeSlug, t);
        byCurrency.set(r.currency, (byCurrency.get(r.currency) ?? 0) + r.valueBase);
      } else {
        totalLiabilities += r.valueBase;
      }
    }

    const groups = [...groupMap.entries()]
      .map(([slug, g]) => ({ slug, typeLabel: g.typeLabel, classification: g.classification, total: String(g.total), holdings: g.holdings }))
      .sort((a, b) =>
        a.classification === b.classification
          ? Number(b.total) - Number(a.total)
          : a.classification === "ASSET"
            ? -1
            : 1,
      );

    return {
      periodMonth: formatPeriod(snap.periodMonth),
      netWorth: String(totalAssets - totalLiabilities),
      totalAssets: String(totalAssets),
      totalLiabilities: String(totalLiabilities),
      groups,
      assetAllocation: [...byType.entries()]
        .map(([slug, e]) => ({ slug, label: e.label, value: String(e.value) }))
        .sort((a, b) => Number(b.value) - Number(a.value)),
      currencyAllocation: [...byCurrency.entries()]
        .map(([currency, value]) => ({ currency, value: String(value) }))
        .sort((a, b) => Number(b.value) - Number(a.value)),
    };
  }),
});
