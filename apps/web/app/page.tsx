import { futureValue } from "@atlas/calc-engine";
import { HoldingTypesDemo } from "./_components/HoldingTypesDemo";

export default function Home() {
  // Smoke test: exercise the workspace calc-engine from a server component, so a
  // broken package wiring fails the build instead of surfacing later at runtime.
  const engineOnline = futureValue(0, 100, 0.12, 12).toFixed(2) === "1268.25";

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "2.5rem 2.75rem",
          maxWidth: "34rem",
          boxShadow: "0 8px 30px rgba(52, 49, 72, 0.06)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.8rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--accent)",
            fontWeight: 600,
          }}
        >
          Project Atlas
        </p>
        <h1 style={{ margin: "0.5rem 0 0.75rem", fontSize: "1.9rem", lineHeight: 1.15 }}>
          Your family&rsquo;s financial mirror
        </h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          A personal financial operating system. The foundation is being built —
          a monthly ritual for seeing where you stand, not a transaction tracker.
        </p>

        <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "1.75rem 0" }} />

        <p
          style={{
            margin: "0 0 0.6rem",
            fontSize: "0.72rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--muted)",
            fontWeight: 600,
          }}
        >
          Holding types &mdash; live from Postgres via tRPC
        </p>
        <HoldingTypesDemo />

        <p style={{ margin: "1.5rem 0 0", fontSize: "0.8rem", color: "var(--muted)" }}>
          calc-engine:{" "}
          <span style={{ color: engineOnline ? "var(--accent)" : "crimson", fontWeight: 600 }}>
            {engineOnline ? "online" : "error"}
          </span>
        </p>
      </div>
    </main>
  );
}
