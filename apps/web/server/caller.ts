import { appRouter } from "./routers/_app";
import { createCallerFactory } from "./trpc";
import { createContext } from "./context";

const createCaller = createCallerFactory(appRouter);

/** A server-side tRPC caller for use in Server Components and Server Actions. */
export async function serverCaller() {
  return createCaller(await createContext());
}
