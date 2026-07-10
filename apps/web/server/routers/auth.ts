import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";

export const authRouter = router({
  /**
   * Flow 1 step 1 — create the Auth.js User (no Member yet; a member can't
   * exist before its household). The client signs in right after.
   */
  register: publicProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(100),
        email: z.string().email().max(200),
        password: z.string().min(8).max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();

      const existing = await ctx.prisma.user.findUnique({ where: { email } });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists.",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 10);
      const user = await ctx.prisma.user.create({
        data: { name: input.name, email, passwordHash },
        select: { id: true, email: true },
      });
      return { id: user.id, email: user.email };
    }),
});
