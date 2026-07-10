import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

/** The authenticated principal, resolved from the Auth.js session. */
export interface SessionUser {
  id: string;
}

/**
 * Per-request tRPC context. Every household-scoped resolver reads identity from
 * this context, never from client input (docs/08 §2).
 */
export interface Context {
  prisma: PrismaClient;
  session: { user: SessionUser } | null;
}

export async function createContext(_opts?: { headers?: Headers }): Promise<Context> {
  const session = await auth();
  const ctxSession = session?.user?.id ? { user: { id: session.user.id } } : null;
  return { prisma, session: ctxSession };
}
