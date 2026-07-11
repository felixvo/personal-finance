import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { computeMetrics, valueBase as computeValueBase, Decimal } from "@atlas/calc-engine";
import { router, householdProcedure } from "../trpc";
import { formatPeriod } from "../period";
import { moneyString } from "../money";

const cashFlowCategory = z.enum([
  "ACTIVE_INCOME",
  "PASSIVE_INCOME",
  "EXPENSE",
  "INVESTMENT_CONTRIBUTION",
]);

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
          fxRateToBase: sh.fxRateToBase.toString(),
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

  /**
   * Edit a completed snapshot (Flow 8) — correct recorded holding values and
   * cash-flow lines after the fact, optionally add holdings that were missing
   * from that month, then recompute the cached metrics over the new figures and
   * bump `version` (Timeline marks a v>1 snapshot "edited"). `holdings` must
   * cover exactly the snapshot's existing holdings; `newHoldings` create fresh
   * Holding records (like Flow 4) and add them to this snapshot only. Cash flows
   * are replaced wholesale. Atomic.
   */
  edit: householdProcedure
    .input(
      z.object({
        snapshotId: z.string().uuid(),
        holdings: z
          .array(
            z.object({
              holdingId: z.string().uuid(),
              value: moneyString,
              fxRateToBase: moneyString.optional(),
            }),
          )
          .min(1),
        newHoldings: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(100),
              holdingTypeId: z.string().uuid(),
              institution: z.string().trim().max(100).optional(),
              currency: z.string().trim().min(1).max(12),
              value: moneyString,
              fxRateToBase: moneyString.optional(),
            }),
          )
          .default([]),
        cashFlows: z.array(
          z.object({
            category: cashFlowCategory,
            label: z.string().trim().min(1).max(100),
            amount: moneyString,
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const snap = await ctx.prisma.monthlySnapshot.findUnique({
        where: { id: input.snapshotId },
        include: {
          holdings: {
            include: {
              holding: {
                select: {
                  currency: true,
                  holdingType: { select: { classification: true, isInvestable: true, isCash: true } },
                },
              },
            },
          },
        },
      });
      if (!snap || snap.householdId !== ctx.householdId || snap.status !== "COMPLETED") {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const existingByHolding = new Map(snap.holdings.map((sh) => [sh.holdingId, sh]));
      const inputIds = new Set(input.holdings.map((h) => h.holdingId));
      if (
        inputIds.size !== input.holdings.length ||
        inputIds.size !== existingByHolding.size ||
        [...inputIds].some((id) => !existingByHolding.has(id))
      ) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Holdings don't match this check-in." });
      }

      const { baseCurrency } = await ctx.prisma.household.findUniqueOrThrow({
        where: { id: ctx.householdId },
        select: { baseCurrency: true },
      });

      const holdingUpdates = input.holdings.map((h) => {
        const existing = existingByHolding.get(h.holdingId)!;
        const isBase = existing.holding.currency === baseCurrency;
        const fxRate = isBase ? "1" : (h.fxRateToBase ?? existing.fxRateToBase.toString());
        return {
          holdingId: h.holdingId,
          value: h.value,
          fxRate,
          valueBase: computeValueBase(h.value, fxRate).toString(),
          classification: existing.holding.holdingType.classification,
          isInvestable: existing.holding.holdingType.isInvestable,
          isCash: existing.holding.holdingType.isCash,
        };
      });

      // Prepare any brand-new holdings to create + record in this snapshot.
      // Their types must belong to the household (or be a global seed type), and
      // a per-unit rate is required for a non-base currency (mirrors Flow 4).
      const newTypeIds = [...new Set(input.newHoldings.map((h) => h.holdingTypeId))];
      const types = newTypeIds.length
        ? await ctx.prisma.holdingType.findMany({
            where: { id: { in: newTypeIds }, OR: [{ householdId: ctx.householdId }, { householdId: null }] },
            select: { id: true, classification: true, isInvestable: true, isCash: true },
          })
        : [];
      const typeById = new Map(types.map((t) => [t.id, t]));

      const newHoldingPrepared = input.newHoldings.map((h) => {
        const type = typeById.get(h.holdingTypeId);
        if (!type) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown holding type." });
        const currency = h.currency.toUpperCase();
        const isBase = currency === baseCurrency;
        if (!isBase && !h.fxRateToBase) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "A per-unit rate is required for a non-base currency." });
        }
        const fxRate = isBase ? "1" : h.fxRateToBase!;
        return {
          name: h.name,
          holdingTypeId: h.holdingTypeId,
          institution: h.institution,
          currency,
          value: h.value,
          fxRate,
          valueBase: computeValueBase(h.value, fxRate).toString(),
          classification: type.classification,
          isInvestable: type.isInvestable,
          isCash: type.isCash,
        };
      });

      const metrics = computeMetrics({
        holdings: [...holdingUpdates, ...newHoldingPrepared].map((h) => ({
          valueBase: new Decimal(h.valueBase),
          classification: h.classification,
          isInvestable: h.isInvestable,
          isCash: h.isCash,
        })),
        cashFlows: input.cashFlows.map((cf) => ({
          category: cf.category,
          amount: new Decimal(cf.amount),
        })),
      });

      await ctx.prisma.$transaction(async (tx) => {
        for (const h of holdingUpdates) {
          await tx.snapshotHolding.update({
            where: { snapshotId_holdingId: { snapshotId: snap.id, holdingId: h.holdingId } },
            data: { value: h.value, fxRateToBase: h.fxRate, valueBase: h.valueBase },
          });
        }
        for (const h of newHoldingPrepared) {
          const created = await tx.holding.create({
            data: {
              householdId: ctx.householdId,
              holdingTypeId: h.holdingTypeId,
              name: h.name,
              institution: h.institution,
              currency: h.currency,
              status: "ACTIVE",
            },
            select: { id: true },
          });
          await tx.snapshotHolding.create({
            data: {
              snapshotId: snap.id,
              holdingId: created.id,
              value: h.value,
              fxRateToBase: h.fxRate,
              valueBase: h.valueBase,
            },
          });
        }
        await tx.snapshotCashFlow.deleteMany({ where: { snapshotId: snap.id } });
        if (input.cashFlows.length > 0) {
          await tx.snapshotCashFlow.createMany({
            data: input.cashFlows.map((cf) => ({
              snapshotId: snap.id,
              category: cf.category,
              label: cf.label,
              amount: cf.amount,
            })),
          });
        }
        await tx.monthlySnapshot.update({
          where: { id: snap.id },
          data: {
            version: { increment: 1 },
            netWorthBase: metrics.netWorth.toString(),
            investableAssetsBase: metrics.investableAssets.toString(),
            cashPositionBase: metrics.cashPosition.toString(),
            passiveIncomeBase: metrics.passiveIncome.toString(),
            savingsRate: metrics.savingsRate != null ? metrics.savingsRate.toString() : null,
          },
        });
      });

      return { id: snap.id };
    }),
});
