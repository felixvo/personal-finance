import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to the monorepo root. Without this, Next infers it
  // from the nearest lockfile and can pick up an unrelated one outside the repo.
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
  // The calc-engine package ships raw TypeScript from src/; let Next transpile it.
  transpilePackages: ["@atlas/calc-engine"],
};

export default nextConfig;
