"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { trpc, type RouterOutputs } from "@/trpc/react";

type CustomType = RouterOutputs["holdingType"]["listCustom"][number];

export function HoldingTypesManager({ custom }: { custom: CustomType[] }) {
  const router = useRouter();
  const create = trpc.holdingType.create.useMutation();
  const remove = trpc.holdingType.remove.useMutation();

  const [label, setLabel] = useState("");
  const [classification, setClassification] = useState<"ASSET" | "LIABILITY">("ASSET");
  const [isInvestable, setIsInvestable] = useState(false);
  const [isCash, setIsCash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    try {
      await create.mutateAsync({ label, classification, isInvestable, isCash });
      setLabel("");
      setClassification("ASSET");
      setIsInvestable(false);
      setIsCash(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the type.");
    }
  }

  async function onRemove(id: string) {
    setError(null);
    try {
      await remove.mutateAsync({ id });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the type.");
    }
  }

  return (
    <>
      <section className="card" style={{ maxWidth: "none", marginTop: "1rem" }}>
        <h2 style={{ margin: "0 0 0.6rem", fontSize: "0.95rem" }}>Your custom types</h2>
        {error && <p className="error" role="alert">{error}</p>}
        {custom.length === 0 ? (
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            None yet — add one below.
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {custom.map((t) => (
              <li
                key={t.id}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", fontSize: "0.88rem" }}
              >
                <span>
                  {t.label}{" "}
                  <span className="muted">
                    · {t.classification === "LIABILITY" ? "liability" : "asset"}
                    {t.isInvestable ? " · investable" : ""}
                    {t.isCash ? " · cash" : ""}
                  </span>
                </span>
                <button
                  className="btn-ghost"
                  style={{ width: "auto", padding: "0.25rem 0.6rem", fontSize: "0.8rem" }}
                  onClick={() => onRemove(t.id)}
                  disabled={remove.isPending}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" style={{ maxWidth: "none", marginTop: "1rem" }}>
        <h2 style={{ margin: "0 0 0.6rem", fontSize: "0.95rem" }}>Add a custom type</h2>
        <form onSubmit={onCreate}>
          <div className="field">
            <label htmlFor="ht-label">Label</label>
            <input
              id="ht-label"
              className="input"
              required
              maxLength={60}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Collectibles"
            />
          </div>
          <div className="field">
            <label htmlFor="ht-class">Classification</label>
            <select
              id="ht-class"
              className="select"
              value={classification}
              onChange={(e) => setClassification(e.target.value as "ASSET" | "LIABILITY")}
            >
              <option value="ASSET">Asset</option>
              <option value="LIABILITY">Liability</option>
            </select>
          </div>
          <div className="field">
            <div style={{ display: "flex", gap: "1rem", fontSize: "0.9rem" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontWeight: 400 }}>
                <input type="checkbox" checked={isInvestable} onChange={(e) => setIsInvestable(e.target.checked)} /> Investable
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontWeight: 400 }}>
                <input type="checkbox" checked={isCash} onChange={(e) => setIsCash(e.target.checked)} /> Cash
              </label>
            </div>
          </div>
          <button className="btn" type="submit" disabled={create.isPending}>
            {create.isPending ? "Adding…" : "Add type"}
          </button>
        </form>
      </section>
    </>
  );
}
