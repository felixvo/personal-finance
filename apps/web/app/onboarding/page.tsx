import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // A user with a household is already onboarded — send them home.
  const member = await prisma.member.findUnique({
    where: { userId: session.user.id },
  });
  if (member) redirect("/");

  return (
    <main className="center-shell">
      <div className="card">
        <p className="eyebrow">Project Atlas</p>
        <h1 className="title">Set up your household</h1>
        <p className="muted" style={{ margin: "0 0 1.25rem", fontSize: "0.9rem", lineHeight: 1.55 }}>
          Atlas tracks one household&rsquo;s finances together. Name it, pick the
          currency you think in, and choose a day each month for your check-in.
        </p>
        <OnboardingForm />
      </div>
    </main>
  );
}
