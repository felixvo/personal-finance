import { requireHousehold } from "@/lib/session";
import { WhatIfSimulator } from "./WhatIfSimulator";

export default async function WhatIfPage() {
  const { caller, member } = await requireHousehold();
  const dash = await caller.snapshot.getDashboard();
  const defaultCurrent = dash.latest?.netWorth
    ? String(Math.round(Number(dash.latest.netWorth)))
    : "";

  return <WhatIfSimulator baseCurrency={member.household.baseCurrency} defaultCurrent={defaultCurrent} />;
}
