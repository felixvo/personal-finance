import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, householdProcedure } from "../trpc";
import { CURRENCY_CODES } from "@/lib/currencies";

export const householdRouter = router({
  /**
   * Flow 1 step 2 — create the Household and its first Member (role OWNER) for
   * the signed-in user, in one transaction. Precondition: the user has no
   * household yet (member.household_id is NOT NULL, so a member can't predate
   * its household).
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(100),
        baseCurrency: z.enum(CURRENCY_CODES),
        checkInDay: z.number().int().min(1).max(28),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const existing = await ctx.prisma.member.findUnique({ where: { userId } });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already belong to a household.",
        });
      }

      const user = await ctx.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });
      if (!user?.email) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Account is missing an email." });
      }

      const household = await ctx.prisma.$transaction(async (tx) => {
        const hh = await tx.household.create({
          data: {
            name: input.name,
            baseCurrency: input.baseCurrency,
            checkInDay: input.checkInDay,
          },
        });
        await tx.member.create({
          data: {
            householdId: hh.id,
            userId,
            name: user.name ?? user.email!,
            email: user.email!,
            role: "OWNER",
          },
        });
        return hh;
      });

      return { id: household.id, name: household.name };
    }),

  /**
   * Edit household settings (docs/01 §3.9). Base currency is intentionally not
   * editable here — changing it post-creation is a v2 concern (docs/09 §6).
   */
  // TODO(invites): gate to OWNER once multi-member households exist.
  update: householdProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(100),
        checkInDay: z.number().int().min(1).max(28),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.household.update({
        where: { id: ctx.householdId },
        data: { name: input.name, checkInDay: input.checkInDay },
      });
      return { ok: true };
    }),
});
