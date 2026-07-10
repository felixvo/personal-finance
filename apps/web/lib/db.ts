import { PrismaClient } from "@prisma/client";

// A single shared Prisma client. In dev, Next's hot reload re-evaluates modules
// repeatedly, so we stash the client on globalThis to avoid exhausting the
// connection pool with a new client per reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
