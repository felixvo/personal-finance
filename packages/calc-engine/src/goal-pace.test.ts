import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  addMonths,
  goalPace,
  goalProgress,
  goalProjection,
  trackedValue,
  type TrackedPoint,
} from "./goal-pace";

const D = (n: number | string) => new Decimal(n);
const pts = (vals: number[], start = "2025-01"): TrackedPoint[] =>
  vals.map((v, i) => ({ periodMonth: addMonths(start, i), value: D(v) }));

describe("addMonths", () => {
  it("rolls over year boundaries", () => {
    expect(addMonths("2025-11", 3)).toBe("2026-02");
    expect(addMonths("2025-01", 0)).toBe("2025-01");
    expect(addMonths("2026-06", 12)).toBe("2027-06");
  });
});

describe("goalProgress (§2.1)", () => {
  it("clamps to [0,1] but preserves the raw ratio", () => {
    const p = goalProgress(D(150), D(100));
    expect(p.pct!.toNumber()).toBe(1);
    expect(p.raw!.toNumber()).toBe(1.5);
  });

  it("is null on a non-positive target", () => {
    expect(goalProgress(D(50), D(0)).pct).toBeNull();
  });
});

describe("goalPace (§2.2 trailing moving average)", () => {
  it("is null with fewer than two points", () => {
    expect(goalPace(pts([100]))).toBeNull();
  });

  it("averages the month-over-month deltas", () => {
    expect(goalPace(pts([100, 200, 300, 400]))!.toNumber()).toBe(100);
  });

  it("uses only the last six deltas", () => {
    // 8 points → 7 deltas; the first (+1000) must fall outside the window.
    const vals = [0, 1000, 1010, 1020, 1030, 1040, 1050, 1060];
    expect(goalPace(pts(vals))!.toNumber()).toBe(10);
  });
});

describe("goalProjection (§2.3 / §2.4)", () => {
  it("insufficient-data with fewer than two points", () => {
    expect(goalProjection(pts([100]), D(1000)).status).toBe("insufficient-data");
  });

  it("achieved when the target is already met", () => {
    expect(goalProjection(pts([100, 600, 1200]), D(1000)).status).toBe("achieved");
  });

  it("not-on-pace when flat or shrinking", () => {
    expect(goalProjection(pts([500, 400, 300]), D(1000)).status).toBe("not-on-pace");
  });

  it("projects months + date, rounding up", () => {
    const pr = goalProjection(pts([100, 200, 300]), D(1000)); // pace +100, remaining 700
    expect(pr.status).toBe("projected");
    if (pr.status === "projected") {
      expect(pr.monthsRemaining).toBe(7);
      expect(pr.estimatedDate).toBe("2025-10"); // 2025-03 + 7
    }
  });

  it("flags good vs behind pace against a target date", () => {
    const good = goalProjection(pts([100, 200, 300]), D(1000), "2026-06");
    const warn = goalProjection(pts([100, 200, 300]), D(1000), "2025-08");
    if (good.status === "projected") expect(good.paceStatus).toBe("good");
    if (warn.status === "projected") expect(warn.paceStatus).toBe("warning");
  });
});

describe("trackedValue (§2.1)", () => {
  it("NET_WORTH mode returns net worth", () => {
    expect(trackedValue(D(5000), "NET_WORTH").toNumber()).toBe(5000);
  });

  it("HOLDING_SUBSET mode sums only the linked holdings", () => {
    expect(trackedValue(D(5000), "HOLDING_SUBSET", [D(100), D(250)]).toNumber()).toBe(350);
  });
});
