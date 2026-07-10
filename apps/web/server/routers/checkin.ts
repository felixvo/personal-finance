import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";
import { computeMetrics, valueBase as computeValueBase, Decimal } from "@atlas/calc-engine";
import { router, householdProcedure } from "../trpc";
import { moneyString } from "../money";
import { currentPeriodMonth } from "../period";

const cashFlowCategory = z.enum([
  "ACTIVE_INCOME",
  "PASSIVE_INCOME",
  "EXPENSE",
  "INVESTMENT_CONTRIBUTION",
]);

export const checkInRouter = router({
  /** Drives Home's three derived states (docs/01 §3.3). */
  getStatus: householdProcedure.query(async ({ ctx }) => {
    const snap = await ctx.prisma.monthlySnapshot.findUnique({
      where: {
        householdId_periodMonth: {
          householdId: ctx.householdId,
          periodMonth: currentPeriodMonth(),
        },
      },
      select: { id: true, status: true },
    });
    if (!snap) return { state: "no-draft" as const };
    return {
      state: snap.status === "COMPLETED" ? ("completed-this-month" as const) : ("draft" as const),
      snapshotId: snap.id,
    };
  }),

  /**
   * Open (or resume) this month's check-in. Creates a DRAFT snapshot and, if a
   * prior COMPLETED snapshot exists, copy-forwards its active holdings' values
   * and cash-flow lines (invariant 9). Idempotent.
   */
  start: householdProcedure.mutation(async ({ ctx }) => {
    const period = currentPeriodMonth();
    const existing = await ctx.prisma.monthlySnapshot.findUnique({
      where: { householdId_periodMonth: { householdId: ctx.householdId, periodMonth: period } },
      select: { id: true, status: true },
    });
    if (existing) return { id: existing.id };

    const last = await ctx.prisma.monthlySnapshot.findFirst({
      where: { householdId: ctx.householdId, status: "COMPLETED" },
      orderBy: { periodMonth: "desc" },
      include: { holdings: true, cashFlows: true },
    });

    const draft = await ctx.prisma.$transaction(async (tx) => {
      const snap = await tx.monthlySnapshot.create({
        data: { householdId: ctx.householdId, periodMonth: period, status: "DRAFT" },
        select: { id: true },
      });
      if (last) {
        const active = await tx.holding.findMany({
          where: { householdId: ctx.householdId, status: "ACTIVE" },
          select: { id: true },
        });
        const prevByHolding = new Map(last.holdings.map((h) => [h.holdingId, h]));
        for (const h of active) {
          const prev = prevByHolding.get(h.id);
          if (prev) {
            await tx.snapshotHolding.create({
              data: {
                snapshotId: snap.id,
                holdingId: h.id,
                value: prev.value,
                fxRateToBase: prev.fxRateToBase,
                valueBase: prev.valueBase,
              },
            });
          }
        }
        for (const cf of last.cashFlows) {
          await tx.snapshotCashFlow.create({
            data: { snapshotId: snap.id, category: cf.category, label: cf.label, amount: cf.amount },
          });
        }
      }
      return snap;
    });
    return { id: draft.id };
  }),

  /** The open draft with its holdings + cash flows, for the wizard. */
  getDraft: householdProcedure.query(async ({ ctx }) => {
    const snap = await ctx.prisma.monthlySnapshot.findUnique({
      where: {
        householdId_periodMonth: {
          householdId: ctx.householdId,
          periodMonth: currentPeriodMonth(),
        },
      },
      include: {
        holdings: {
          include: { holding: { include: { holdingType: true } } },
          orderBy: { holding: { name: "asc" } },
        },
        cashFlows: { orderBy: { category: "asc" } },
      },
    });
    if (!snap || snap.status !== "DRAFT") return null;
    return {
      id: snap.id,
      holdings: snap.holdings.map((sh) => ({
        holdingId: sh.holdingId,
        name: sh.holding.name,
        institution: sh.holding.institution,
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

  addCashFlow: householdProcedure
    .input(
      z.object({
        snapshotId: z.string().uuid(),
        category: cashFlowCategory,
        label: z.string().trim().min(1).max(100),
        amount: moneyString,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwnedDraft(ctx.prisma, ctx.householdId, input.snapshotId);
      const cf = await ctx.prisma.snapshotCashFlow.create({
        data: {
          snapshotId: input.snapshotId,
          category: input.category,
          label: input.label,
          amount: input.amount,
        },
        select: { id: true },
      });
      return { id: cf.id };
    }),

  /**
   * Step 2 — update a holding's value in the draft (edit a copied-forward figure
   * or set a first value). Re-derives valueBase; keeps the existing FX rate for a
   * foreign holding unless a new one is supplied.
   */
  updateHoldingValue: householdProcedure
    .input(
      z.object({
        snapshotId: z.string().uuid(),
        holdingId: z.string().uuid(),
        value: moneyString,
        fxRateToBase: moneyString.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwnedDraft(ctx.prisma, ctx.householdId, input.snapshotId);

      const holding = await ctx.prisma.holding.findFirst({
        where: { id: input.holdingId, householdId: ctx.householdId },
        select: { currency: true },
      });
      if (!holding) throw new TRPCError({ code: "NOT_FOUND" });

      const household = await ctx.prisma.household.findUniqueOrThrow({
        where: { id: ctx.householdId },
        select: { baseCurrency: true },
      });
      const isBase = holding.currency === household.baseCurrency;
      const existing = await ctx.prisma.snapshotHolding.findUnique({
        where: { snapshotId_holdingId: { snapshotId: input.snapshotId, holdingId: input.holdingId } },
        select: { fxRateToBase: true },
      });
      const fxRate = isBase
        ? "1"
        : (input.fxRateToBase ?? existing?.fxRateToBase.toString() ?? "1");
      const valueBase = computeValueBase(input.value, fxRate).toString();

      await ctx.prisma.snapshotHolding.upsert({
        where: { snapshotId_holdingId: { snapshotId: input.snapshotId, holdingId: input.holdingId } },
        create: {
          snapshotId: input.snapshotId,
          holdingId: input.holdingId,
          value: input.value,
          fxRateToBase: fxRate,
          valueBase,
        },
        update: { value: input.value, fxRateToBase: fxRate, valueBase },
      });
      return { ok: true };
    }),

  removeCashFlow: householdProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const cf = await ctx.prisma.snapshotCashFlow.findUnique({
        where: { id: input.id },
        select: { snapshot: { select: { householdId: true, status: true } } },
      });
      if (!cf || cf.snapshot.householdId !== ctx.householdId || cf.snapshot.status !== "DRAFT") {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.prisma.snapshotCashFlow.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  /**
   * Complete the check-in: run the calculation engine (docs/07 §1) over the
   * draft's holdings + cash flows and cache the metrics on the snapshot.
   */
  complete: householdProcedure
    .input(z.object({ snapshotId: z.string().uuid(), notes: z.string().max(1000).optional() }))
    .mutation(async ({ ctx, input }) => {
      const snap = await ctx.prisma.monthlySnapshot.findUnique({
        where: { id: input.snapshotId },
        include: {
          holdings: {
            include: {
              holding: {
                select: {
                  holdingType: { select: { classification: true, isInvestable: true, isCash: true } },
                },
              },
            },
          },
          cashFlows: true,
        },
      });
      if (!snap || snap.householdId !== ctx.householdId) throw new TRPCError({ code: "NOT_FOUND" });
      if (snap.status !== "DRAFT") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This check-in is already completed." });
      }
      if (snap.holdings.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Add at least one holding before completing." });
      }

      const metrics = computeMetrics({
        holdings: snap.holdings.map((sh) => ({
          valueBase: new Decimal(sh.valueBase.toString()),
          classification: sh.holding.holdingType.classification,
          isInvestable: sh.holding.holdingType.isInvestable,
          isCash: sh.holding.holdingType.isCash,
        })),
        cashFlows: snap.cashFlows.map((cf) => ({
          category: cf.category,
          amount: new Decimal(cf.amount.toString()),
        })),
      });

      await ctx.prisma.monthlySnapshot.update({
        where: { id: snap.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          notes: input.notes ?? null,
          netWorthBase: metrics.netWorth.toString(),
          investableAssetsBase: metrics.investableAssets.toString(),
          cashPositionBase: metrics.cashPosition.toString(),
          passiveIncomeBase: metrics.passiveIncome.toString(),
          savingsRate: metrics.savingsRate != null ? metrics.savingsRate.toString() : null,
        },
      });
      return { id: snap.id };
    }),
});

async function assertOwnedDraft(prisma: PrismaClient, householdId: string, snapshotId: string) {
  const snap = await prisma.monthlySnapshot.findUnique({
    where: { id: snapshotId },
    select: { householdId: true, status: true },
  });
  if (!snap || snap.householdId !== householdId || snap.status !== "DRAFT") {
    throw new TRPCError({ code: "NOT_FOUND", message: "No open draft to modify." });
  }
}
