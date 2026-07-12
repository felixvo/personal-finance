import Link from "next/link";

export default function NotFound() {
  return (
    <main className="center-shell">
      <div className="card">
        <p className="eyebrow">Not found</p>
        <h1 className="title">We couldn&rsquo;t find that</h1>
        <p className="muted" style={{ marginTop: 0, lineHeight: 1.55 }}>
          The page or item you&rsquo;re looking for doesn&rsquo;t exist, or may have been removed.
        </p>
        <Link
          href="/"
          className="btn"
          style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: "1.25rem" }}
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
