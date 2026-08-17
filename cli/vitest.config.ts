import { execFileSync } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync, symlinkSync } from "node:fs";
import { availableParallelism, tmpdir } from "node:os";
import path from "node:path";

import { defineConfig } from "vitest/config";

import { TEMP_ROOT_ENV } from "./src/test-helpers/temp-root.js";

/**
 * A directory whose `git` is the executable the platform's `git` would hand the
 * work to anyway, or `null` when there is nothing to shortcut.
 *
 * The suite's runtime is very nearly the number of `git` processes it launches,
 * and on macOS `/usr/bin/git` is a stub that resolves the active developer
 * directory and executes the real binary from it. That indirection costs more
 * than most of the commands run through it and it serializes under load, so
 * paying it thousands of times sets the whole suite's pace.
 *
 * `xcrun --find git` reports the very executable the stub would exec, so putting
 * a link to it first on the workers' `PATH` runs the identical Git — same
 * version, same behavior — without the lookup. It applies only when both report
 * the same version, and any failure to establish that leaves `PATH` untouched:
 * a shortcut that cannot be shown to lead to the same place is not taken.
 */
function directGitDirectory(): string | null {
  if (process.platform !== "darwin") return null;
  try {
    const resolved = execFileSync("xcrun", ["--find", "git"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (resolved === "") return null;

    const options = { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] } as const;
    if (
      execFileSync("git", ["--version"], options).trim() !==
      execFileSync(resolved, ["--version"], options).trim()
    ) {
      return null;
    }

    const directory = mkdtempSync(path.join(tmpdir(), "antmay-git-direct-"));
    symlinkSync(resolved, path.join(directory, "git"));
    process.once("exit", () => {
      rmSync(directory, { recursive: true, force: true });
    });
    return directory;
  } catch {
    return null;
  }
}

const directGit = directGitDirectory();

/**
 * The one directory every temporary tree in this run is allocated under. It is
 * created here rather than in the global setup so it can be handed to the
 * workers through `env` at the moment they are forked, and it is canonical from
 * the start so no allocation below it needs its own `realpath`. The global
 * teardown removes it once the last file has finished.
 */
const tempRoot = realpathSync(mkdtempSync(path.join(tmpdir(), "antmay-test-")));
process.env[TEMP_ROOT_ENV] = tempRoot;

// Git subprocess throughput, not CPU, is what this suite is bound by: it sits
// near-idle on cores while waiting on `git`. Workers past this point buy
// nothing measurable and only deepen the queue in front of that one resource.
const workerCount = Math.min(6, availableParallelism());

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    maxWorkers: workerCount,
    minWorkers: workerCount,
    globalSetup: "./src/test-helpers/global-setup.ts",
    env: {
      [TEMP_ROOT_ENV]: tempRoot,
      ...(directGit === null
        ? {}
        : { PATH: `${directGit}${path.delimiter}${process.env.PATH ?? ""}` }),
    },
    // The Git-backed cases drive whole runs through real `git` subprocesses and
    // fsynced checkpoints, and they run concurrently with the rest of the suite.
    // A single case can legitimately need several seconds of wall clock under
    // that load, so the budget is generous enough that contention alone never
    // fails a test while a genuine hang still terminates the run.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
