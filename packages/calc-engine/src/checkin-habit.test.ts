import { describe, it, expect } from "vitest";
import { checkinHabit } from "./checkin-habit";

const DAY = 86_400_000;
const MIN = 60_000;

describe("checkinHabit", () => {
  it("returns zeros/nulls when there are no completed check-ins", () => {
    expect(checkinHabit([], Date.UTC(2026, 0, 1), "2026-03")).toEqual({
      completedCount: 0,
      currentStreak: 0,
      completionRate: null,
      avgCompletionMinutes: null,
      daysToFirstCheckin: null,
    });
  });

  it("counts a consecutive streak ending at the latest month and a full rate", () => {
    const t = Date.UTC(2026, 4, 10);
    const h = checkinHabit(
      [
        { periodMonth: "2026-05", createdAt: t, completedAt: t + 5 * MIN },
        { periodMonth: "2026-06", createdAt: t, completedAt: t + 7 * MIN },
        { periodMonth: "2026-07", createdAt: t, completedAt: t + 3 * MIN },
      ],
      Date.UTC(2026, 4, 1),
      "2026-07",
    );
    expect(h.completedCount).toBe(3);
    expect(h.currentStreak).toBe(3);
    expect(h.completionRate).toBe(1); // 3 completed / 3 months elapsed
    expect(h.avgCompletionMinutes).toBeCloseTo(5); // (5+7+3)/3
  });

  it("breaks the streak on a gap and reports a partial completion rate", () => {
    const h = checkinHabit(
      [
        { periodMonth: "2026-01", createdAt: 0, completedAt: 10 * MIN },
        { periodMonth: "2026-03", createdAt: 0, completedAt: 10 * MIN },
      ],
      Date.UTC(2026, 0, 1),
      "2026-04",
    );
    expect(h.currentStreak).toBe(1); // only March; February missing
    expect(h.completionRate).toBeCloseTo(2 / 4); // 2 completed over Jan..Apr
  });

  it("measures whole days to the first completed check-in", () => {
    const join = Date.UTC(2026, 0, 1);
    const h = checkinHabit(
      [{ periodMonth: "2026-01", createdAt: join + 9 * DAY, completedAt: join + 9 * DAY + 4 * MIN }],
      join,
      "2026-01",
    );
    expect(h.daysToFirstCheckin).toBe(9);
    expect(h.avgCompletionMinutes).toBeCloseTo(4);
  });
});
