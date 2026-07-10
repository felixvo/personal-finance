import { router, publicProcedure, protectedProcedure } from "../trpc";

/**
 * Root tRPC router. Phase 0 exposes just enough to prove the stack end to end
 * (client → tRPC → Prisma → Postgres); the docs/08 routers are added in Phase 1.
 */
export const appRouter = router({
  health: router({
    ping: publicProcedure.query(() => ({ ok: true as const, time: new Date() })),
  }),

  holdingType: router({
    /** Global seed types (household_id IS NULL). Powers Settings later. */
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
