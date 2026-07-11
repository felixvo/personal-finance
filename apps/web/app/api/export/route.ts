import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { formatPeriod } from "@/server/period";

/**
 * Data export (docs/08 §3.8) — a session-authenticated Route Handler, not tRPC,
 * because a file download doesn't fit the JSON-RPC shape. GET /api/export?format=
 * csv|json returns the household's data as an attachment. CSV is the month-by-
 * month metrics table (spreadsheet-friendly); JSON is the complete dump.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const member = await prisma.member.findUnique({
    where: { userId: session.user.id },
    select: { householdId: true },
  });
  if (!member) return new Response("No household", { status: 403 });
  const householdId = member.householdId;

  const [household, holdings, snapshots, goals] = await Promise.all([
    prisma.household.findUniqueOrThrow({
      where: { id: householdId },
      select: { name: true, baseCurrency: true, checkInDay: true },
    }),
    prisma.holding.findMany({
      where: { householdId },
      orderBy: { name: "asc" },
      include: { holdingType: { select: { slug: true, label: true, classification: true } } },
    }),
    prisma.monthlySnapshot.findMany({
      where: { householdId, status: "COMPLETED" },
      orderBy: { periodMonth: "asc" },
      include: {
        holdings: { include: { holding: { select: { name: true } } } },
        cashFlows: true,
      },
    }),
    prisma.goal.findMany({
      where: { householdId },
      include: { goalHoldings: { select: { holdingId: true } } },
    }),
  ]);

  const format = new URL(req.url).searchParams.get("format") === "csv" ? "csv" : "json";

  if (format === "csv") {
    const header = ["period", "net_worth", "investable", "cash", "passive_income", "savings_rate"];
    const cell = (v: { toString(): string } | null) => (v == null ? "" : v.toString());
    const rows = snapshots.map((s) =>
      [
        formatPeriod(s.periodMonth),
        cell(s.netWorthBase),
        cell(s.investableAssetsBase),
        cell(s.cashPositionBase),
        cell(s.passiveIncomeBase),
        cell(s.savingsRate),
      ].join(","),
    );
    const csv = [header.join(","), ...rows].join("\n") + "\n";
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="atlas-export.csv"',
      },
    });
  }

  const dump = {
    exportedAt: new Date().toISOString(),
    household,
    holdings: holdings.map((h) => ({
      name: h.name,
      type: h.holdingType.slug,
      typeLabel: h.holdingType.label,
      classification: h.holdingType.classification,
      currency: h.currency,
      status: h.status,
    })),
    snapshots: snapshots.map((s) => ({
      period: formatPeriod(s.periodMonth),
      version: s.version,
      netWorth: s.netWorthBase?.toString() ?? null,
      investable: s.investableAssetsBase?.toString() ?? null,
      cash: s.cashPositionBase?.toString() ?? null,
      passiveIncome: s.passiveIncomeBase?.toString() ?? null,
      savingsRate: s.savingsRate?.toString() ?? null,
      holdings: s.holdings.map((sh) => ({
        name: sh.holding.name,
        value: sh.value.toString(),
        fxRateToBase: sh.fxRateToBase.toString(),
        valueBase: sh.valueBase.toString(),
      })),
      cashFlows: s.cashFlows.map((cf) => ({
        category: cf.category,
        label: cf.label,
        amount: cf.amount.toString(),
      })),
    })),
    goals: goals.map((g) => ({
      type: g.type,
      name: g.name,
      target: g.targetAmount.toString(),
      targetDate: g.targetDate ? formatPeriod(g.targetDate) : null,
      trackingMode: g.trackingMode,
      status: g.status,
      linkedHoldingCount: g.goalHoldings.length,
    })),
  };

  return new Response(JSON.stringify(dump, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="atlas-export.json"',
    },
  });
}
