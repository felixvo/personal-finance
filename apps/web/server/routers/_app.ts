import { router, publicProcedure, protectedProcedure } from "../trpc";
import { authRouter } from "./auth";
import { householdRouter } from "./household";

/**
 * Root tRPC router. Grows toward the docs/08 surface as Phase 1 features land.
 */
export const appRouter = router({
  auth: authRouter,
  household: householdRouter,

  health: router({
    ping: publicProcedure.query(() => ({ ok: true as const, time: new Date() })),
  }),

  holdingType: router({
    /** Global seed types (household_id IS NULL). Powers Settings + check-in. */
    listGlobal: publicProcedure.query(({ ctx }) =>
      ctx.prisma.holdingType.findMany({
        where: { householdId: null },
        orderBy: [{ classification: "asc" }, { slug: "asc" }],
        select: {
          id: true,
          slug: true,
          label: true,
          classification: true,
          isInvestable: true,
          isCash: true,
        },
      }),
    ),
  }),

  me: router({
    /** The signed-in user and their household membership (null until onboarded). */
    get: protectedProcedure.query(async ({ ctx }) => {
      const member = await ctx.prisma.member.findUnique({
        where: { userId: ctx.session.user.id },
        include: { household: true },
      });
      return { userId: ctx.session.user.id, member };
    }),
  }),
});

export type AppRouter = typeof appRouter;
