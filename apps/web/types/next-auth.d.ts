import type { DefaultSession } from "next-auth";

// Expose the application user id on the session and JWT (Credentials + JWT).
declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
  }
}
