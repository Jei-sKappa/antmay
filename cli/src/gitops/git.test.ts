import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { GitCommandError, gitOrThrow, runGit } from "./git.js";

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    const cleanup = cleanups.pop();
    if (cleanup) await cleanup();
  }
});

async function tempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "antmay-git-test-"));
  cleanups.push(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}

describe("runGit — success surface", () => {
  it("returns code 0 and the version line for `git --version`", async () => {
    const dir = await tempDir();
    const result = await runGit(dir, ["--version"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("git version");
    expect(result.stderr).toBe("");
  });
});

describe("runGit — failure surface", () => {
  it("resolves (does not reject) with a non-zero code and stderr when git exits non-zero", async () => {
    const dir = await tempDir();
    const result = await runGit(dir, ["rev-parse", "--show-toplevel"]);
    expect(result.code).not.toBe(0);
    expect(result.stderr.trim().length).toBeGreaterThan(0);
  });
});

describe("gitOrThrow", () => {
  it("returns the result on a clean exit", async () => {
    const dir = await tempDir();
    const result = await gitOrThrow(dir, ["--version"]);
    expect(result.code).toBe(0);
  });

  it("throws a GitCommandError carrying the args, code, and stderr on non-zero exit", async () => {
    const dir = await tempDir();
    await expect(
      gitOrThrow(dir, ["rev-parse", "--show-toplevel"]),
    ).rejects.toBeInstanceOf(GitCommandError);

    try {
      await gitOrThrow(dir, ["rev-parse", "--show-toplevel"]);
      expect.unreachable("expected gitOrThrow to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(GitCommandError);
      const gitError = error as GitCommandError;
      expect(gitError.args).toEqual(["rev-parse", "--show-toplevel"]);
      expect(gitError.code).not.toBe(0);
      expect(gitError.stderr.trim().length).toBeGreaterThan(0);
    }
  });
});
