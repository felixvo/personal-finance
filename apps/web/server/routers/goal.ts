import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { goalProgress, goalProjection, Decimal, type TrackedPoint } from "@atlas/calc-engine";
import { router, householdProcedure } from "../trpc";
import { moneyString } from "../money";
import { formatPeriod } from "../period";

const GOAL_TYPE = z.enum(["FIRE", "NET_WORTH", "HOUSE_FUND", "EDUCATION_FUND", "CUSTOM"]);
const TRACKING_MODE = z.enum(["NET_WORTH", "HOLDING_SUBSET"]);

type SnapForGoals = {
  periodMonth: Date;
  netWorthBase: { toString(): string } | null;
  holdings: { holdingId: string; valueBase: { toString(): string } }[];
};

/** The tracked-value series for a goal across completed snapshots (docs/07 §2.1). */
function trackedPoints(
  snaps: SnapForGoals[],
  trackingMode: "NET_WORTH" | "HOLDING_SUBSET",
  linkedHoldingIds: Set<string>,
): TrackedPoint[] {
  return snaps.map((s) => ({
    periodMonth: formatPeriod(s.periodMonth),
    value:
      trackingMode === "NET_WORTH"
        ? new Decimal(s.netWorthBase?.toString() ?? "0")
        : s.holdings
            .filter((h) => linkedHoldingIds.has(h.holdingId))
            .reduce((sum, h) => sum.plus(h.valueBase.toString()), new Decimal(0)),
  }));
}

function serializeProjection(target: Decimal, points: TrackedPoint[], targetDate: string | null) {
  const p = goalProjection(points, target, targetDate);
  if (p.status === "projected") {
    return {
      status: p.status,
      monthsRemaining: p.monthsRemaining,
      estimatedDate: p.estimatedDate,
      pace: p.pace.toString(),
      paceStatus: p.paceStatus,
    };
  }
  return { status: p.status };
}

export const goalRouter = router({
  /** Goals with computed progress + projection at read time (docs/08 §3.6). */
  list: householdProcedure.query(async ({ ctx }) => {
    const [goals, snaps] = await Promise.all([
      ctx.prisma.goal.findMany({
        where: { householdId: ctx.householdId, status: { not: "ARCHIVED" } },
        include: { goalHoldings: { select: { holdingId: true } } },
        orderBy: { createdAt: "asc" },
      }),
      ctx.prisma.monthlySnapshot.findMany({
        where: { householdId: ctx.householdId, status: "COMPLETED" },
        orderBy: { periodMonth: "asc" },
        select: {
          periodMonth: true,
          netWorthBase: true,
          holdings: { select: { holdingId: true, valueBase: true } },
        },
      }),
    ]);

    return goals.map((g) => {
      const linked = new Set(g.goalHoldings.map((gh) => gh.holdingId));
      const points = trackedPoints(snaps, g.trackingMode, linked);
      const tracked = points.length ? points[points.length - 1]!.value : new Decimal(0);
      const target = new Decimal(g.targetAmount.toString());
      const progress = goalProgress(tracked, target);
      const targetDate = g.targetDate ? formatPeriod(g.targetDate) : null;
      return {
        id: g.id,
        name: g.name,
        type: g.type,
        trackingMode: g.trackingMode,
        target: target.toString(),
        tracked: tracked.toString(),
        pct: progress.pct ? progress.pct.toNumber() : null,
        rawPct: progress.raw ? progress.raw.toNumber() : null,
        targetDate,
        projection: serializeProjection(target, points, targetDate),
      };
    });
  }),

  /** One goal with its tracked-value history (for the detail chart). */
  get: householdProcedure
    .input(z.object({ goalId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const goal = await ctx.prisma.goal.findFirst({
        where: { id: input.goalId, householdId: ctx.householdId },
        include: { goalHoldings: { select: { holdingId: true } } },
      });
      if (!goal) throw new TRPCError({ code: "NOT_FOUND" });

      const snaps = await ctx.prisma.monthlySnapshot.findMany({
        where: { householdId: ctx.householdId, status: "COMPLETED" },
        orderBy: { periodMonth: "asc" },
        select: {
          periodMonth: true,
          netWorthBase: true,
          holdings: { select: { holdingId: true, valueBase: true } },
        },
      });
      const linked = new Set(goal.goalHoldings.map((gh) => gh.holdingId));
      const points = trackedPoints(snaps, goal.trackingMode, linked);
      const tracked = points.length ? points[points.length - 1]!.value : new Decimal(0);
      const target = new Decimal(goal.targetAmount.toString());
      const progress = goalProgress(tracked, target);
      const targetDate = goal.targetDate ? formatPeriod(goal.targetDate) : null;

      return {
        id: goal.id,
        name: goal.name,
        type: goal.type,
        trackingMode: goal.trackingMode,
        target: target.toString(),
        tracked: tracked.toString(),
        pct: progress.pct ? progress.pct.toNumber() : null,
        rawPct: progress.raw ? progress.raw.toNumber() : null,
        targetDate,
        projection: serializeProjection(target, points, targetDate),
        history: points.map((p) => ({ periodMonth: p.periodMonth, value: p.value.toString() })),
        holdingIds: goal.goalHoldings.map((gh) => gh.holdingId),
      };
    }),

  create: householdProcedure
    .input(
      z.object({
        type: GOAL_TYPE,
        name: z.string().trim().min(1).max(100),
        targetAmount: moneyString,
        targetDate: z
          .string()
          .regex(/^\d{4}-\d{2}$/)
          .optional(),
        trackingMode: TRACKING_MODE,
        holdingIds: z.array(z.string().uuid()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.trackingMode === "HOLDING_SUBSET" && !input.holdingIds?.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Select at least one holding to track.",
        });
      }
      const targetDate = input.targetDate
        ? new Date(Date.UTC(Number(input.targetDate.slice(0, 4)), Number(input.targetDate.slice(5, 7)) - 1, 1))
        : null;

      const goal = await ctx.prisma.$transaction(async (tx) => {
        const g = await tx.goal.create({
          data: {
            householdId: ctx.householdId,
            type: input.type,
            name: input.name,
            targetAmount: input.targetAmount,
            targetDate,
            trackingMode: input.trackingMode,
          },
          select: { id: true },
        });
        if (input.trackingMode === "HOLDING_SUBSET" && input.holdingIds?.length) {
          const owned = await tx.holding.findMany({
            where: { id: { in: input.holdingIds }, householdId: ctx.householdId },
            select: { id: true },
          });
          await tx.goalHolding.createMany({
            data: owned.map((h) => ({ goalId: g.id, holdingId: h.id })),
          });
        }
        return g;
      });
      return { id: goal.id };
    }),

  /** Edit a goal's fields and re-link tracked holdings (docs/01 §3.5). */
  update: householdProcedure
    .input(
      z.object({
        goalId: z.string().uuid(),
        type: GOAL_TYPE,
        name: z.string().trim().min(1).max(100),
        targetAmount: moneyString,
        targetDate: z
          .string()
          .regex(/^\d{4}-\d{2}$/)
          .optional(),
        trackingMode: TRACKING_MODE,
        holdingIds: z.array(z.string().uuid()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.trackingMode === "HOLDING_SUBSET" && !input.holdingIds?.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Select at least one holding to track.",
        });
      }
      const existing = await ctx.prisma.goal.findFirst({
        where: { id: input.goalId, householdId: ctx.householdId },
        select: { id: true, status: true },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const targetDate = input.targetDate
        ? new Date(Date.UTC(Number(input.targetDate.slice(0, 4)), Number(input.targetDate.slice(5, 7)) - 1, 1))
        : null;

      await ctx.prisma.$transaction(async (tx) => {
        await tx.goal.update({
          where: { id: existing.id },
          data: {
            type: input.type,
            name: input.name,
            targetAmount: input.targetAmount,
            targetDate,
            trackingMode: input.trackingMode,
            // Editing an ACHIEVED goal may raise the bar past the tracked value;
            // reset to ACTIVE and let markGoalsAchieved re-flip it if still met.
            status: existing.status === "ACHIEVED" ? "ACTIVE" : undefined,
          },
        });
        await tx.goalHolding.deleteMany({ where: { goalId: existing.id } });
        if (input.trackingMode === "HOLDING_SUBSET" && input.holdingIds?.length) {
          const owned = await tx.holding.findMany({
            where: { id: { in: input.holdingIds }, householdId: ctx.householdId },
            select: { id: true },
          });
          await tx.goalHolding.createMany({
            data: owned.map((h) => ({ goalId: existing.id, holdingId: h.id })),
          });
        }
      });
      await markGoalsAchieved(ctx.prisma, ctx.householdId);
      return { id: existing.id };
    }),

  archive: householdProcedure
    .input(z.object({ goalId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const goal = await ctx.prisma.goal.findFirst({
        where: { id: input.goalId, householdId: ctx.householdId },
        select: { id: true },
      });
      if (!goal) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.prisma.goal.update({ where: { id: goal.id }, data: { status: "ARCHIVED" } });
      return { ok: true };
    }),
});

/**
 * Flip ACTIVE goals to ACHIEVED once their tracked value reaches target, judged
 * against the latest COMPLETED snapshot. One-directional (never reverts) and
 * idempotent — safe to call after any snapshot settles (check-in complete/edit)
 * or after a goal is edited. `client` may be `ctx.prisma` or a transaction.
 */
export async function markGoalsAchieved(
  client: Prisma.TransactionClient,
  householdId: string,
): Promise<void> {
  const latest = await client.monthlySnapshot.findFirst({
    where: { householdId, status: "COMPLETED" },
    orderBy: { periodMonth: "desc" },
    select: {
      netWorthBase: true,
      holdings: { select: { holdingId: true, valueBase: true } },
    },
  });
  if (!latest) return;

  const goals = await client.goal.findMany({
    where: { householdId, status: "ACTIVE" },
    include: { goalHoldings: { select: { holdingId: true } } },
  });
  if (goals.length === 0) return;

  const valueByHolding = new Map(
    latest.holdings.map((h) => [h.holdingId, new Decimal(h.valueBase.toString())]),
  );
  const netWorth = new Decimal(latest.netWorthBase?.toString() ?? "0");

  const achievedIds = goals
    .filter((g) => {
      const tracked =
        g.trackingMode === "NET_WORTH"
          ? netWorth
          : g.goalHoldings.reduce(
              (sum, gh) => sum.plus(valueByHolding.get(gh.holdingId) ?? new Decimal(0)),
              new Decimal(0),
            );
      return tracked.gte(g.targetAmount.toString());
    })
    .map((g) => g.id);

  if (achievedIds.length > 0) {
    await client.goal.updateMany({
      where: { id: { in: achievedIds }, status: "ACTIVE" },
      data: { status: "ACHIEVED" },
    });
  }
}
