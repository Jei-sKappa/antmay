
import { describe, expect, it } from "vitest";

import { GitCommandError, gitOrThrow, runGit, splitNul } from "./git.js";
import { tempDir as allocate } from "../test-helpers/temp-root.js";

async function tempDir(): Promise<string> {
  return allocate("antmay-git-test-");
}

describe("runGit — success surface", () => {
  it("returns code 0 and the version line for `git --version`", async () => {
    const dir = await tempDir();
    const result = await runGit(dir, ["--version"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("git version");
    expect(result.stderr).toBe("");
  });

  it("writes optional stdin to the Git process", async () => {
    const dir = await tempDir();
    const result = await runGit(dir, ["hash-object", "--stdin"], "hello\n");
    expect(result).toEqual({
      code: 0,
      stdout: "ce013625030ba8dba906f756967f9e9ca394464a\n",
      stderr: "",
    });
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

describe("splitNul", () => {
  it("drops the trailing empty field the terminator leaves behind", () => {
    expect(splitNul("one\0two\0")).toEqual(["one", "two"]);
  });

  it("drops an interior empty field", () => {
    expect(splitNul("one\0\0two\0")).toEqual(["one", "two"]);
  });

  it("returns no fields for empty output", () => {
    expect(splitNul("")).toEqual([]);
  });

  it("keeps whitespace, quotes, and newlines inside a field intact", () => {
    expect(splitNul('a dir/we"ird\nname.md\0plain.md\0')).toEqual([
      'a dir/we"ird\nname.md',
      "plain.md",
    ]);
  });
});
