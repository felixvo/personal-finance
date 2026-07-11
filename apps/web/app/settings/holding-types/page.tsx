import Link from "next/link";
import { requireHousehold } from "@/lib/session";
import { HoldingTypesManager } from "./HoldingTypesManager";

export default async function HoldingTypesPage() {
  const { caller } = await requireHousehold();
  const [globalTypes, customTypes] = await Promise.all([
    caller.holdingType.listGlobal(),
    caller.holdingType.listCustom(),
  ]);

  return (
    <main style={{ maxWidth: "40rem", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <p className="eyebrow">Settings · Holding types</p>
        <Link href="/settings" className="muted" style={{ fontSize: "0.85rem" }}>
          Settings
        </Link>
      </div>
      <h1 className="title" style={{ marginTop: "0.4rem" }}>
        Holding types
      </h1>
      <p className="muted" style={{ marginTop: 0, fontSize: "0.9rem", lineHeight: 1.5 }}>
        Types categorise your holdings across check-ins. The built-in types are shared; add your own
        for anything they don&rsquo;t cover.
      </p>

      <HoldingTypesManager custom={customTypes} />

      <section className="card" style={{ maxWidth: "none", marginTop: "1rem" }}>
        <h2 style={{ margin: "0 0 0.6rem", fontSize: "0.95rem" }}>Built-in types</h2>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          {globalTypes.map((t) => (
            <li key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", fontSize: "0.88rem" }}>
              <span>
                {t.label}{" "}
                <span className="muted">· {t.classification === "LIABILITY" ? "liability" : "asset"}</span>
              </span>
              <span className="muted" style={{ fontSize: "0.78rem" }}>
                {[t.isInvestable ? "investable" : null, t.isCash ? "cash" : null].filter(Boolean).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
