/**
 * §3 (Phase 3) — check-in habit metrics, derived entirely from snapshot
 * timestamps (no separate event tracking needed). Counts and durations, so this
 * module is Decimal-free.
 */

export interface CheckinRecord {
  /** Completed check-in period, "YYYY-MM". */
  periodMonth: string;
  /** Draft-created epoch ms (when the check-in was started). */
  createdAt: number;
  /** Completed epoch ms. */
  completedAt: number;
}

export interface CheckinHabit {
  completedCount: number;
  /** Consecutive completed months ending at the most recent completed month. */
  currentStreak: number;
  /** completed / months since the household was created (inclusive), clamped to [0,1]; null if none elapsed. */
  completionRate: number | null;
  /** Mean minutes from draft start to completion; null if no records. */
  avgCompletionMinutes: number | null;
  /** Whole days from household creation to the first completed check-in; null if none. */
  daysToFirstCheckin: number | null;
}

const MS_PER_DAY = 86_400_000;
const MS_PER_MIN = 60_000;

/** "YYYY-MM" (UTC) for an epoch. */
function periodFromEpoch(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Absolute month number for a "YYYY-MM", so consecutiveness is simple arithmetic. */
function monthIndex(period: string): number {
  const [y, m] = period.split("-").map(Number);
  return y! * 12 + (m! - 1);
}

export function checkinHabit(
  records: CheckinRecord[],
  householdCreatedAt: number,
  currentPeriod: string,
): CheckinHabit {
  const completedCount = records.length;
  if (completedCount === 0) {
    return {
      completedCount: 0,
      currentStreak: 0,
      completionRate: null,
      avgCompletionMinutes: null,
      daysToFirstCheckin: null,
    };
  }

  // Streak: consecutive months present, counting back from the latest completed.
  const months = new Set(records.map((r) => monthIndex(r.periodMonth)));
  const latest = Math.max(...months);
  let currentStreak = 0;
  for (let m = latest; months.has(m); m--) currentStreak++;

  // Completion rate over the months elapsed since joining (inclusive).
  const elapsedMonths = monthIndex(currentPeriod) - monthIndex(periodFromEpoch(householdCreatedAt)) + 1;
  const completionRate = elapsedMonths > 0 ? Math.min(1, completedCount / elapsedMonths) : null;

  // Average completion time (draft start -> completion), ignoring any negatives.
  const durations = records.map((r) => r.completedAt - r.createdAt).filter((d) => d >= 0);
  const avgCompletionMinutes =
    durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length / MS_PER_MIN : null;

  const firstCompletedAt = Math.min(...records.map((r) => r.completedAt));
  const daysToFirstCheckin = Math.max(0, Math.floor((firstCompletedAt - householdCreatedAt) / MS_PER_DAY));

  return { completedCount, currentStreak, completionRate, avgCompletionMinutes, daysToFirstCheckin };
}
