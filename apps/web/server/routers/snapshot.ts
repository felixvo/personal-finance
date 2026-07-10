import { z } from "zod";
import { TRPCError } from "@trpc/server";
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

  /** Reverse-chronological list of completed snapshots — the Timeline feed. */
  listTimeline: householdProcedure.query(async ({ ctx }) => {
    const snaps = await ctx.prisma.monthlySnapshot.findMany({
      where: { householdId: ctx.householdId, status: "COMPLETED" },
      orderBy: { periodMonth: "desc" },
      select: { id: true, periodMonth: true, netWorthBase: true, savingsRate: true, version: true },
    });
    return snaps.map((s) => ({
      id: s.id,
      periodMonth: formatPeriod(s.periodMonth),
      netWorth: s.netWorthBase?.toString() ?? null,
      savingsRate: s.savingsRate?.toString() ?? null,
      edited: s.version > 1,
    }));
  }),

  /** Full read-only detail for one completed snapshot (docs/01 §3.7). */
  getById: householdProcedure
    .input(z.object({ snapshotId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const snap = await ctx.prisma.monthlySnapshot.findUnique({
        where: { id: input.snapshotId },
        include: {
          holdings: {
            include: { holding: { include: { holdingType: true } } },
            orderBy: { valueBase: "desc" },
          },
          cashFlows: { orderBy: { category: "asc" } },
        },
      });
      if (!snap || snap.householdId !== ctx.householdId || snap.status !== "COMPLETED") {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return {
        id: snap.id,
        periodMonth: formatPeriod(snap.periodMonth),
        notes: snap.notes,
        edited: snap.version > 1,
        netWorth: snap.netWorthBase?.toString() ?? null,
        investable: snap.investableAssetsBase?.toString() ?? null,
        cash: snap.cashPositionBase?.toString() ?? null,
        passive: snap.passiveIncomeBase?.toString() ?? null,
        savingsRate: snap.savingsRate?.toString() ?? null,
        holdings: snap.holdings.map((sh) => ({
          holdingId: sh.holdingId,
          name: sh.holding.name,
          currency: sh.holding.currency,
          typeLabel: sh.holding.holdingType.label,
          classification: sh.holding.holdingType.classification,
          value: sh.value.toString(),
          valueBase: sh.valueBase.toString(),
        })),
        cashFlows: snap.cashFlows.map((cf) => ({
          id: cf.id,
          category: cf.category,
          label: cf.label,
          amount: cf.amount.toString(),
        })),
      };
    }),
});
