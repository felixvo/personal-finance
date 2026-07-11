import Link from "next/link";
import { requireHousehold } from "@/lib/session";
import { signOut } from "@/auth";
import { HouseholdSettingsForm } from "./HouseholdSettingsForm";

export default async function SettingsPage() {
  const { session, member } = await requireHousehold();
  const h = member.household;

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <main style={{ maxWidth: "40rem", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <p className="eyebrow">Settings</p>
        <Link href="/" className="muted" style={{ fontSize: "0.85rem" }}>
          Home
        </Link>
      </div>
      <h1 className="title" style={{ marginTop: "0.4rem" }}>
        Settings
      </h1>

      <section className="card" style={{ maxWidth: "none", marginBottom: "1rem" }}>
        <h2 style={{ margin: "0 0 0.6rem", fontSize: "0.95rem" }}>Household</h2>
        <HouseholdSettingsForm
          initialName={h.name}
          initialCheckInDay={h.checkInDay}
          baseCurrency={h.baseCurrency}
          email={session.user.email}
        />
      </section>

      <section className="card" style={{ maxWidth: "none", marginBottom: "1rem" }}>
        <h2 style={{ margin: "0 0 0.4rem", fontSize: "0.95rem" }}>Holding types</h2>
        <p className="muted" style={{ margin: "0 0 0.9rem", fontSize: "0.85rem" }}>
          Manage the categories you can assign to holdings during a check-in.
        </p>
        <Link className="btn-ghost" href="/settings/holding-types" style={{ textDecoration: "none" }}>
          Manage holding types
        </Link>
      </section>

      <section className="card" style={{ maxWidth: "none", marginBottom: "1rem" }}>
        <h2 style={{ margin: "0 0 0.6rem", fontSize: "0.95rem" }}>Export your data</h2>
        <p className="muted" style={{ margin: "0 0 0.9rem", fontSize: "0.85rem" }}>
          JSON is a complete dump; CSV is the month-by-month metrics table.
        </p>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <a className="btn" href="/api/export?format=json" style={{ width: "auto", padding: "0.5rem 1rem", textDecoration: "none" }}>
            Download JSON
          </a>
          <a className="btn-ghost" href="/api/export?format=csv" style={{ textDecoration: "none" }}>
            Download CSV
          </a>
        </div>
      </section>

      <form action={doSignOut}>
        <button className="btn-ghost" type="submit">
          Sign out
        </button>
      </form>
    </main>
  );
}
