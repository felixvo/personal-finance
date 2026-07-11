import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, householdProcedure } from "../trpc";

const CLASSIFICATION = z.enum(["ASSET", "LIABILITY"]);

const TYPE_SELECT = {
  id: true,
  slug: true,
  label: true,
  classification: true,
  isInvestable: true,
  isCash: true,
} as const;

/**
 * Derive a stable slug from a human label, matching the lowercase convention of
 * the global seed types (docs/03 §6) — e.g. "Real Estate" -> "real_estate" — so
 * the collision check below catches a custom label that duplicates a seed type.
 */
function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export const holdingTypeRouter = router({
  /** Global seed types (household_id IS NULL). Powers Settings + check-in. */
  listGlobal: publicProcedure.query(({ ctx }) =>
    ctx.prisma.holdingType.findMany({
      where: { householdId: null },
      orderBy: [{ classification: "asc" }, { slug: "asc" }],
      select: TYPE_SELECT,
    }),
  ),

  /** This household's custom types (for the Settings management page). */
  listCustom: householdProcedure.query(({ ctx }) =>
    ctx.prisma.holdingType.findMany({
      where: { householdId: ctx.householdId },
      orderBy: [{ classification: "asc" }, { label: "asc" }],
      select: TYPE_SELECT,
    }),
  ),

  /** Create a custom holding type for this household (docs/01 §3.9). */
  // TODO(invites): gate to OWNER once multi-member households exist.
  create: householdProcedure
    .input(
      z.object({
        label: z.string().trim().min(1).max(60),
        classification: CLASSIFICATION,
        isInvestable: z.boolean().default(false),
        isCash: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const slug = slugify(input.label);
      if (!slug) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a label with letters or numbers." });
      }
      // Reject collisions with a global seed slug or an existing custom slug so
      // the check-in type picker (which merges both) never shows duplicates.
      const clash = await ctx.prisma.holdingType.findFirst({
        where: { slug, OR: [{ householdId: ctx.householdId }, { householdId: null }] },
        select: { id: true },
      });
      if (clash) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A holding type with that name already exists." });
      }

      const created = await ctx.prisma.holdingType.create({
        data: {
          householdId: ctx.householdId,
          slug,
          label: input.label,
          classification: input.classification,
          isInvestable: input.isInvestable,
          isCash: input.isCash,
        },
        select: { id: true },
      });
      return { id: created.id };
    }),

  /** Delete a custom type — only if this household owns it and nothing uses it. */
  // TODO(invites): gate to OWNER once multi-member households exist.
  remove: householdProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const type = await ctx.prisma.holdingType.findFirst({
        where: { id: input.id, householdId: ctx.householdId },
        select: { id: true },
      });
      if (!type) throw new TRPCError({ code: "NOT_FOUND" });

      const inUse = await ctx.prisma.holding.count({ where: { holdingTypeId: type.id } });
      if (inUse > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This type is used by a holding and can't be deleted.",
        });
      }
      await ctx.prisma.holdingType.delete({ where: { id: type.id } });
      return { ok: true };
    }),
});
