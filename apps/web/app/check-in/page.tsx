import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { serverCaller } from "@/server/caller";
import { CheckInWizard } from "./CheckInWizard";

export default async function CheckInPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const caller = await serverCaller();
  const me = await caller.me.get();
  if (!me.member) redirect("/onboarding");

  // The wizard needs an open draft; the Home CTA creates one before linking here.
  const status = await caller.checkIn.getStatus();
  if (status.state !== "draft") redirect("/");

  return <CheckInWizard baseCurrency={me.member.household.baseCurrency} />;
}
