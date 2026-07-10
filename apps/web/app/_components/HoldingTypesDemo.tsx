"use client";

import { trpc } from "@/trpc/react";

/**
 * End-to-end smoke test rendered on the home page: a client component that calls
 * a tRPC query, which reads the seeded holding types from Postgres via Prisma.
 * If these chips render, the whole stack is wired correctly.
 */
export function HoldingTypesDemo() {
  const query = trpc.holdingType.listGlobal.useQuery();

  if (query.isPending) {
    return <p style={{ margin: 0, color: "var(--muted)" }}>Loading holding types…</p>;
  }
  if (query.error) {
    return <p style={{ margin: 0, color: "crimson" }}>Error: {query.error.message}</p>;
  }

  return (
    <ul
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "flex",
        flexWrap: "wrap",
        gap: "0.4rem",
      }}
    >
      {query.data.map((t) => (
        <li
          key={t.id}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "999px",
            padding: "0.2rem 0.7rem",
            fontSize: "0.8rem",
            color: t.classification === "LIABILITY" ? "var(--muted)" : "var(--ink)",
          }}
        >
          {t.label}
        </li>
      ))}
    </ul>
  );
}
