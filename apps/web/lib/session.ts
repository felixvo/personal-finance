import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { serverCaller } from "@/server/caller";

/**
 * Guard for authenticated, onboarded pages. Redirects to /login when there's no
 * session and to /onboarding when the user has no household. Returns the tRPC
 * caller and the member (with household) for the page to use.
 */
export async function requireHousehold() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const caller = await serverCaller();
  const me = await caller.me.get();
  if (!me.member) redirect("/onboarding");

  return { session, caller, member: me.member };
}
