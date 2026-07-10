# Deploying Atlas (Phase 0 skeleton)

This deploys the current scaffold — an empty-but-fully-wired app (Next.js + tRPC
+ Prisma + Auth.js) — to **Vercel** with a **Neon** Postgres database. The goal is
to prove the pipeline end to end *before* Phase 1 features depend on it
([docs/09-roadmap.md](docs/09-roadmap.md) §2).

The home page doubles as the smoke test: if it lists the 9 global holding types
and shows `calc-engine: online`, the whole chain (Vercel → tRPC → Prisma → Neon)
works.

## Already wired for you

- `apps/web/package.json` has a **`vercel-build`** script that runs on every
  deploy: `prisma generate` → `prisma migrate deploy` (applies pending
  migrations) → `prisma db seed` (idempotently ensures the 9 global holding
  types) → `next build`.
- `apps/web/prisma/schema.prisma` uses `url` (pooled, for runtime) + `directUrl`
  (direct, for migrations) and includes the `rhel-openssl-3.0.x` query-engine
  binary Vercel's runtime needs.
- `trustHost: true` is set in `auth.ts`, so Auth.js accepts Vercel's host.

## Prerequisites

The repo must be on GitHub/GitLab/Bitbucket for Vercel's Git integration. It
currently has **no remote** — see Step 0.

## Step 0 — Push to GitHub

Create a new **empty private** repo on github.com (no README/license), then:

```bash
git remote add origin git@github.com:<you>/personal-finance-app.git
git push -u origin main
```

## Step 1 — Create the Neon database

1. Sign up at **neon.tech** and create a project (region near you).
2. In **Connection Details**, copy **two** strings:
   - **Pooled** (host contains `-pooler`) → this becomes `DATABASE_URL`.
   - **Direct** (no `-pooler`) → this becomes `DIRECT_URL`.
   Both should include `?sslmode=require`.

## Step 2 — Import into Vercel

1. At **vercel.com**, *Add New… → Project*, import your Git repo.
2. **Root Directory → `apps/web`.** Vercel detects the npm workspace and installs
   from the repo root automatically, so the `@atlas/calc-engine` workspace
   package resolves.
3. Framework preset **Next.js** (auto-detected). Leave build/output at their
   defaults — Vercel picks up the `vercel-build` script automatically.

## Step 3 — Environment variables

Vercel → Project → **Settings → Environment Variables** (add to Production, and
Preview if you want preview deploys):

| Name | Value |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string |
| `DIRECT_URL` | Neon **direct** connection string |
| `AUTH_SECRET` | generate one: `npx auth secret` (or `openssl rand -base64 32`) |

## Step 4 — Deploy

Vercel deploys on import and on every push to `main`. The `vercel-build` script
migrates + seeds Neon and builds. The first deploy takes a few minutes.

## Step 5 — Verify

Open the deployment URL. You should see:

- the 9 holding types (Brokerage, Cash, Crypto, …) — proving Vercel → tRPC →
  Prisma → Neon,
- `calc-engine: online`.

If so, the pipeline is live. 🎉

## Notes & troubleshooting

- **Migrations and seed run on every deploy.** `migrate deploy` only applies
  *pending* migrations; the seed is idempotent. Both become no-ops once applied.
- **Auth on Vercel** works out of the box (`trustHost: true`). Only set `AUTH_URL`
  if you add a custom domain.
- **`@atlas/calc-engine` not found at build** → confirm Root Directory is
  `apps/web`; Vercel's *Include files outside the root directory* is on by
  default for detected monorepos.
- **Prisma engine error at runtime** → the schema already lists
  `rhel-openssl-3.0.x`; redeploy so the client regenerates.
- Migrations intentionally route through `DIRECT_URL`; never point them at the
  pooled URL.
