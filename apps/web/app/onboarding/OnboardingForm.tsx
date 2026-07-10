"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/react";
import { CURRENCY_CODES, type CurrencyCode } from "@/lib/currencies";

export function OnboardingForm() {
  const router = useRouter();
  const create = trpc.household.create.useMutation();
  const [name, setName] = useState("");
  const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>("USD");
  const [checkInDay, setCheckInDay] = useState(1);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    try {
      await create.mutateAsync({ name, baseCurrency, checkInDay });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your household.");
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
          placeholder="The Nguyễn Family"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="hh-currency">Base currency</label>
        <select
          id="hh-currency"
          className="select"
          value={baseCurrency}
          onChange={(e) => setBaseCurrency(e.target.value as CurrencyCode)}
        >
          {CURRENCY_CODES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        <span className="muted" style={{ fontSize: "0.75rem" }}>
          The currency you think in. Everything is reported in this.
        </span>
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
          onChange={(e) => setCheckInDay(Number(e.target.value))}
        />
      </div>
      <button className="btn" type="submit" disabled={create.isPending}>
        {create.isPending ? "Creating…" : "Create household"}
      </button>
    </form>
  );
}
