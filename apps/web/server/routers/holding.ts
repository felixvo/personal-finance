import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { valueBase as computeValueBase } from "@atlas/calc-engine";
import { router, householdProcedure } from "../trpc";
import { moneyString } from "../money";
import { currentPeriodMonth } from "../period";

export const holdingRouter = router({
  /** Active holdings for this household (powers /assets add + goal subset picker). */
  list: householdProcedure.query(({ ctx }) =>
    ctx.prisma.holding.findMany({
      where: { householdId: ctx.householdId, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, currency: true },
    }),
  ),

  /** Global seed types + this household's custom types (docs/08 §3.3). */
  listTypes: householdProcedure.query(({ ctx }) =>
    ctx.prisma.holdingType.findMany({
      where: { OR: [{ householdId: ctx.householdId }, { householdId: null }] },
      orderBy: [{ classification: "asc" }, { label: "asc" }],
      select: {
        id: true,
        slug: true,
        label: true,
        classification: true,
        isInvestable: true,
        isCash: true,
      },
    }),
  ),

  /**
   * Flow 4 — create a holding. When a DRAFT snapshot is open, also write its
   * SnapshotHolding so it's counted when the check-in completes. `value` is a
   * native-unit amount; `fxRateToBase` is the per-unit price in base currency
   * (required only when the denomination differs from the base currency).
   */
  create: householdProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(100),
        holdingTypeId: z.string().uuid(),
        institution: z.string().trim().max(100).optional(),
        currency: z.string().trim().min(1).max(12),
        value: moneyString,
        fxRateToBase: moneyString.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const type = await ctx.prisma.holdingType.findFirst({
        where: {
          id: input.holdingTypeId,
          OR: [{ householdId: ctx.householdId }, { householdId: null }],
        },
        select: { id: true },
      });
      if (!type) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown holding type." });

      const household = await ctx.prisma.household.findUniqueOrThrow({
        where: { id: ctx.householdId },
        select: { baseCurrency: true },
      });
      const currency = input.currency.toUpperCase();
      const isBase = currency === household.baseCurrency;
      if (!isBase && !input.fxRateToBase) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A per-unit rate is required for a non-base currency.",
        });
      }
      const fxRate = isBase ? "1" : input.fxRateToBase!;
      const valueBase = computeValueBase(input.value, fxRate).toString();

      const holding = await ctx.prisma.$transaction(async (tx) => {
        const h = await tx.holding.create({
          data: {
            householdId: ctx.householdId,
            holdingTypeId: input.holdingTypeId,
            name: input.name,
            institution: input.institution,
            currency,
            status: "ACTIVE",
          },
          select: { id: true },
        });
        const draft = await tx.monthlySnapshot.findFirst({
          where: { householdId: ctx.householdId, periodMonth: currentPeriodMonth(), status: "DRAFT" },
          select: { id: true },
        });
        if (draft) {
          await tx.snapshotHolding.create({
            data: {
              snapshotId: draft.id,
              holdingId: h.id,
              value: input.value,
              fxRateToBase: fxRate,
              valueBase,
            },
          });
        }
        return h;
      });
      return { id: holding.id };
    }),

  /**
   * Remove a holding while a draft is open. Hard-deletes it only if it has no
   * completed snapshot history (invariant 7); otherwise archives it.
   */
  removeFromDraft: householdProcedure
    .input(z.object({ holdingId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const holding = await ctx.prisma.holding.findFirst({
        where: { id: input.holdingId, householdId: ctx.householdId },
        select: { id: true },
      });
      if (!holding) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.prisma.$transaction(async (tx) => {
        const draft = await tx.monthlySnapshot.findFirst({
          where: { householdId: ctx.householdId, periodMonth: currentPeriodMonth(), status: "DRAFT" },
          select: { id: true },
        });
        if (draft) {
          await tx.snapshotHolding.deleteMany({
            where: { snapshotId: draft.id, holdingId: input.holdingId },
          });
        }
        const remaining = await tx.snapshotHolding.count({ where: { holdingId: input.holdingId } });
        if (remaining === 0) {
          await tx.holding.delete({ where: { id: input.holdingId } });
        } else {
          await tx.holding.update({
            where: { id: input.holdingId },
            data: { status: "ARCHIVED", archivedAt: new Date() },
          });
        }
      });
      return { ok: true };
    }),
});
