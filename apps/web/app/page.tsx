import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const member = await prisma.member.findUnique({
    where: { userId: session.user.id },
    include: { household: true },
  });
  if (!member) redirect("/onboarding");

  const { household } = member;

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  // Home state A — "Check-in Pending" (docs/01 §3.3). The check-in wizard that
  // this CTA launches is the next Phase 1 slice, so the button is inert for now.
  return (
    <main className="center-shell">
      <div className="card" style={{ maxWidth: "34rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "1rem",
          }}
        >
          <p className="eyebrow">{household.name}</p>
          <form action={doSignOut}>
            <button className="btn-ghost" type="submit">
              Sign out
            </button>
          </form>
        </div>

        <h1 className="title">You haven&rsquo;t done a check-in yet</h1>
        <p className="muted" style={{ margin: "0 0 1.5rem", lineHeight: 1.6 }}>
          A check-in is the monthly ritual at the heart of Atlas — a few minutes
          to record where {household.name} stands. It takes under five minutes.
        </p>

        <button
          className="btn"
          type="button"
          disabled
          title="The check-in wizard lands in the next step"
        >
          Start Financial Check-in
        </button>
        <p className="muted" style={{ margin: "0.6rem 0 0", fontSize: "0.75rem", textAlign: "center" }}>
          The check-in wizard is the next step.
        </p>

        <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "1.5rem 0 1rem" }} />
        <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
          Signed in as {session.user.email} · base currency {household.baseCurrency} · check-in day{" "}
          {household.checkInDay}
        </p>
      </div>
    </main>
  );
}
