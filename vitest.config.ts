import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

// Two projects keep the fast unit suite (`bun run test`) and the real-CLI E2E
// suite (`bun run test:cli:e2e`) separate: the unit project excludes the E2E
// tree, and the E2E project — which spawns cold CLI subprocesses and detached
// workers — runs only under `--project e2e` with generous timeouts.
export default defineConfig({
  resolve: {
    alias: {
      // Resolve the workspace core package to its source during tests so the
      // suite runs against current source without requiring a prior build.
      // (Mirrors the tsconfig `paths` mapping; vite does not read tsconfig paths.)
      "@antmay/core": path.resolve(root, "packages/core/src/index.ts"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["packages/*/test/**/*.test.ts"],
          exclude: ["**/node_modules/**", "**/dist/**", "packages/cli/test/e2e/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "e2e",
          include: ["packages/cli/test/e2e/**/*.test.ts"],
          testTimeout: 60_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
