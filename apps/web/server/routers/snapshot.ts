import { router, householdProcedure } from "../trpc";
import { formatPeriod } from "../period";

export const snapshotRouter = router({
  /**
   * Home dashboard (state B): the two most recent COMPLETED snapshots, so a
   * "vs. last month" delta can be computed without a second round-trip
   * (docs/08 §3.5). Cached metrics are serialized as strings.
   */
  getDashboard: householdProcedure.query(async ({ ctx }) => {
    const snaps = await ctx.prisma.monthlySnapshot.findMany({
      where: { householdId: ctx.householdId, status: "COMPLETED" },
      orderBy: { periodMonth: "desc" },
      take: 2,
      select: {
        id: true,
        periodMonth: true,
        netWorthBase: true,
        investableAssetsBase: true,
        cashPositionBase: true,
        passiveIncomeBase: true,
        savingsRate: true,
      },
    });

    const toDash = (s: (typeof snaps)[number] | undefined) =>
      s
        ? {
            id: s.id,
            periodMonth: formatPeriod(s.periodMonth),
            netWorth: s.netWorthBase?.toString() ?? null,
            investable: s.investableAssetsBase?.toString() ?? null,
            cash: s.cashPositionBase?.toString() ?? null,
            passive: s.passiveIncomeBase?.toString() ?? null,
            savingsRate: s.savingsRate?.toString() ?? null,
          }
        : null;

    return { latest: toDash(snaps[0]), previous: toDash(snaps[1]) };
  }),
});
