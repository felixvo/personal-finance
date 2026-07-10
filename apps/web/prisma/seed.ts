import { PrismaClient } from "@prisma/client";
import type { HoldingClassification } from "@prisma/client";

const prisma = new PrismaClient();

// docs/03 §3 — global seed holding types (household_id = NULL). Households add
// their own custom types through Settings; those are not seeded here.
type SeedHoldingType = {
  slug: string;
  label: string;
  classification: HoldingClassification;
  isInvestable: boolean;
  isCash: boolean;
};

const GLOBAL_HOLDING_TYPES: SeedHoldingType[] = [
  { slug: "cash", label: "Cash", classification: "ASSET", isInvestable: false, isCash: true },
  { slug: "brokerage", label: "Brokerage", classification: "ASSET", isInvestable: true, isCash: false },
  { slug: "crypto", label: "Crypto", classification: "ASSET", isInvestable: true, isCash: false },
  { slug: "real_estate", label: "Real Estate", classification: "ASSET", isInvestable: false, isCash: false },
  { slug: "retirement", label: "Retirement", classification: "ASSET", isInvestable: true, isCash: false },
  { slug: "other_asset", label: "Other Asset", classification: "ASSET", isInvestable: false, isCash: false },
  { slug: "loan", label: "Loan", classification: "LIABILITY", isInvestable: false, isCash: false },
  { slug: "credit_card", label: "Credit Card", classification: "LIABILITY", isInvestable: false, isCash: false },
  { slug: "other_liability", label: "Other Liability", classification: "LIABILITY", isInvestable: false, isCash: false },
];

async function main() {
  // Idempotent: global types are keyed by slug where household_id IS NULL.
  // (findFirst + create, because the global-scope uniqueness is a partial index
  // that upsert can't target by compound key.)
  for (const t of GLOBAL_HOLDING_TYPES) {
    const existing = await prisma.holdingType.findFirst({
      where: { householdId: null, slug: t.slug },
    });
    if (existing) {
      await prisma.holdingType.update({ where: { id: existing.id }, data: t });
    } else {
      await prisma.holdingType.create({ data: { ...t, householdId: null } });
    }
  }
  console.log(`Seeded ${GLOBAL_HOLDING_TYPES.length} global holding types.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
