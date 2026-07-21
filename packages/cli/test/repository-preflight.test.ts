import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  RepositoryResolutionError,
  resolveRepositoryRoot,
} from "../src/preflight/repository";
import type {
  ProcessRunner,
  ProcessRunResult,
} from "../src/process/process-runner";

type FakeRunnerOptions = {
  located?: Record<string, string | null>;
  gitToplevel?: string;
  gitCode?: number;
};

class FakeRunner implements ProcessRunner {
  readonly runCalls: Array<{
    program: string;
    args: readonly string[];
    cwd?: string;
  }> = [];
  readonly locateCalls: string[] = [];

  constructor(private readonly opts: FakeRunnerOptions) {}

  run(
    program: string,
    args: readonly string[],
    options?: { cwd?: string },
  ): ProcessRunResult {
    this.runCalls.push({ program, args, cwd: options?.cwd });
    if (program === "git") {
      return {
        code: this.opts.gitCode ?? 0,
        stdout: `${this.opts.gitToplevel ?? ""}\n`,
        stderr: "",
      };
    }
    return { code: 0, stdout: "", stderr: "" };
  }

  locate(program: string): string | null {
    this.locateCalls.push(program);
    const map = this.opts.located ?? {};
    const value = map[program];
    return value === undefined ? null : value;
  }
}

let repo: string;

beforeEach(() => {
  repo = realpathSync.native(mkdtempSync(join(tmpdir(), "antmay-repo-")));
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe("resolveRepositoryRoot", () => {
  it("resolves the canonical worktree from a nested cwd via an argv array", () => {
    const runner = new FakeRunner({
      located: { git: "/usr/bin/git" },
      gitToplevel: repo,
    });
    const nested = join(repo, "packages", "cli");

    const resolved = resolveRepositoryRoot(nested, runner);

    expect(resolved).toBe(realpathSync.native(repo));
    expect(runner.runCalls).toEqual([
      { program: "git", args: ["rev-parse", "--show-toplevel"], cwd: nested },
    ]);
  });

  it("resolves all nested cwds to the same worktree root", () => {
    const runner = new FakeRunner({
      located: { git: "/usr/bin/git" },
      gitToplevel: repo,
    });

    const fromRoot = resolveRepositoryRoot(repo, runner);
    const fromNested = resolveRepositoryRoot(join(repo, "a", "b"), runner);

    expect(fromNested).toBe(fromRoot);
  });

  it("rejects a missing git executable before running anything", () => {
    const runner = new FakeRunner({ located: { git: null } });

    expect(() => resolveRepositoryRoot(repo, runner)).toThrow(
      RepositoryResolutionError,
    );
    expect(runner.runCalls).toEqual([]);
  });

  it("rejects a cwd outside a git worktree", () => {
    const runner = new FakeRunner({
      located: { git: "/usr/bin/git" },
      gitCode: 128,
    });

    expect(() => resolveRepositoryRoot(repo, runner)).toThrow(
      /not inside a git worktree/,
    );
  });
});
