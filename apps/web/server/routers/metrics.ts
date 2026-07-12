import { checkinHabit, type CheckinRecord } from "@atlas/calc-engine";
import { router, householdProcedure } from "../trpc";
import { formatPeriod, currentPeriodMonth } from "../period";

export const metricsRouter = router({
  /**
   * Check-in habit stats (docs/09 Phase 3 — success-metric instrumentation),
   * derived from completed-snapshot timestamps: streak, completion rate, average
   * completion time, and time-to-first-check-in.
   */
  checkinHabit: householdProcedure.query(async ({ ctx }) => {
    const [household, snaps] = await Promise.all([
      ctx.prisma.household.findUniqueOrThrow({
        where: { id: ctx.householdId },
        select: { createdAt: true },
      }),
      ctx.prisma.monthlySnapshot.findMany({
        where: { householdId: ctx.householdId, status: "COMPLETED", completedAt: { not: null } },
        select: { periodMonth: true, createdAt: true, completedAt: true },
      }),
    ]);

    const records: CheckinRecord[] = snaps.map((s) => ({
      periodMonth: formatPeriod(s.periodMonth),
      createdAt: s.createdAt.getTime(),
      completedAt: s.completedAt!.getTime(),
    }));

    return checkinHabit(records, household.createdAt.getTime(), formatPeriod(currentPeriodMonth()));
  }),
});
