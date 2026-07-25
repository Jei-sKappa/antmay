import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // The Git-backed cases drive whole runs through real `git` subprocesses and
    // fsynced checkpoints, and they run concurrently with the rest of the suite.
    // A single case can legitimately need several seconds of wall clock under
    // that load, so the budget is generous enough that contention alone never
    // fails a test while a genuine hang still terminates the run.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
