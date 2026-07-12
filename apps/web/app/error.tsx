"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-segment error boundary. Catches errors thrown while rendering a page
 * (e.g. a tRPC/database failure in a Server Component) and shows a recoverable
 * fallback instead of Next's raw error screen.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="center-shell">
      <div className="card">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="title">This page hit a snag</h1>
        <p className="muted" style={{ marginTop: 0, lineHeight: 1.55 }}>
          An unexpected error occurred. You can try again, or head back home.
        </p>
        <div style={{ display: "flex", gap: "0.6rem", marginTop: "1.25rem" }}>
          <button className="btn" style={{ width: "auto", padding: "0.55rem 1.1rem" }} onClick={() => reset()}>
            Try again
          </button>
          <Link href="/" className="btn-ghost" style={{ textDecoration: "none" }}>
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
