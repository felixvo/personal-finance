import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";

/** The authenticated principal, resolved from the Auth.js session. */
export interface SessionUser {
  id: string;
}

/**
 * Per-request tRPC context. `session` is null until the Auth.js step wires
 * session resolution in here; every household-scoped resolver reads identity
 * from this context, never from client input (docs/08 §2).
 */
export interface Context {
  prisma: PrismaClient;
  session: { user: SessionUser } | null;
}

export async function createContext(_opts?: { headers?: Headers }): Promise<Context> {
  const session: Context["session"] = null;
  return { prisma, session };
}
