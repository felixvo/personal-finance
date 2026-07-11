"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/react";

export function HouseholdSettingsForm({
  initialName,
  initialCheckInDay,
  baseCurrency,
  email,
}: {
  initialName: string;
  initialCheckInDay: number;
  baseCurrency: string;
  email: string | null | undefined;
}) {
  const router = useRouter();
  const update = trpc.household.update.useMutation();
  const [name, setName] = useState(initialName);
  const [checkInDay, setCheckInDay] = useState(String(initialCheckInDay));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await update.mutateAsync({ name: name.trim(), checkInDay: Number(checkInDay) });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <p className="error">{error}</p>}
      <div className="field">
        <label htmlFor="hh-name">Household name</label>
        <input
          id="hh-name"
          className="input"
          required
          maxLength={100}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
        />
      </div>
      <div className="field">
        <label htmlFor="hh-day">Check-in day of month</label>
        <input
          id="hh-day"
          className="input"
          type="number"
          min={1}
          max={28}
          required
          value={checkInDay}
          onChange={(e) => {
            setCheckInDay(e.target.value);
            setSaved(false);
          }}
        />
        <span className="muted" style={{ fontSize: "0.75rem" }}>
          Between 1 and 28.
        </span>
      </div>
      <dl style={{ margin: "0 0 1rem", display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.35rem 1rem", fontSize: "0.9rem" }}>
        <dt className="muted">Base currency</dt>
        <dd style={{ margin: 0 }}>{baseCurrency}</dd>
        <dt className="muted">Signed in as</dt>
        <dd style={{ margin: 0 }}>{email}</dd>
      </dl>
      <button className="btn" type="submit" disabled={update.isPending} style={{ width: "auto", padding: "0.5rem 1rem" }}>
        {update.isPending ? "Saving…" : "Save changes"}
      </button>
      {saved && (
        <span className="muted" style={{ marginLeft: "0.75rem", fontSize: "0.85rem" }}>
          Saved.
        </span>
      )}
    </form>
  );
}
