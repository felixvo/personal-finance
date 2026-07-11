import Link from "next/link";
import { requireHousehold } from "@/lib/session";
import { signOut } from "@/auth";

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
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.35rem 1rem", fontSize: "0.9rem" }}>
          <dt className="muted">Name</dt>
          <dd style={{ margin: 0 }}>{h.name}</dd>
          <dt className="muted">Base currency</dt>
          <dd style={{ margin: 0 }}>{h.baseCurrency}</dd>
          <dt className="muted">Check-in day</dt>
          <dd style={{ margin: 0 }}>{h.checkInDay}</dd>
          <dt className="muted">Signed in as</dt>
          <dd style={{ margin: 0 }}>{session.user.email}</dd>
        </dl>
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
