import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  // superjson preserves Date/BigInt/etc. across the wire. Monetary Decimals are
  // serialized as strings at the resolver boundary (docs/08 §2).
  transformer: superjson,
});

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;

/** Open to anyone (health checks, global reference data). */
export const publicProcedure = t.procedure;

/** Requires an authenticated session — the basis for household scoping. */
export const protectedProcedure = t.procedure.use((opts) => {
  const { ctx } = opts;
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return opts.next({ ctx: { ...ctx, session: ctx.session } });
});

/**
 * Requires the caller to belong to a household; exposes `ctx.householdId`.
 * Every household-scoped resolver filters by this id, never client input.
 */
export const householdProcedure = protectedProcedure.use(async (opts) => {
  const member = await opts.ctx.prisma.member.findUnique({
    where: { userId: opts.ctx.session.user.id },
    select: { householdId: true },
  });
  if (!member) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No household yet — complete onboarding first.",
    });
  }
  return opts.next({ ctx: { ...opts.ctx, householdId: member.householdId } });
});
