"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { trpc } from "@/trpc/react";

export default function SignupPage() {
  const router = useRouter();
  const register = trpc.auth.register.useMutation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await register.mutateAsync({ name, email, password });
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        setError("Account created, but sign-in failed — try signing in.");
        setPending(false);
        return;
      }
      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      setPending(false);
      setError(err instanceof Error ? err.message : "Could not create your account.");
    }
  }

  return (
    <main className="center-shell">
      <form className="card" onSubmit={onSubmit}>
        <p className="eyebrow">Project Atlas</p>
        <h1 className="title">Create your account</h1>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="field">
          <label htmlFor="name">Your name</label>
          <input
            id="name"
            className="input"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span className="muted" style={{ fontSize: "0.75rem" }}>
            At least 8 characters.
          </span>
        </div>
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create account"}
        </button>
        <p className="form-foot">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
