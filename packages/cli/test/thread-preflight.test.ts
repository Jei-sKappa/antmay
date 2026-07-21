import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import type { RepositoryPath } from "@antmay/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveThread, ThreadResolutionError } from "../src/preflight/thread";

let repo: RepositoryPath;
const THREAD = "260718155545Z-workflow-orchestrator-cli";

beforeEach(() => {
  repo = realpathSync.native(
    mkdtempSync(join(tmpdir(), "antmay-thread-")),
  ) as RepositoryPath;
  mkdirSync(join(repo, "docs", "threads", THREAD), { recursive: true });
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

function expected(): string {
  return realpathSync.native(join(repo, "docs", "threads", THREAD));
}

describe("resolveThread", () => {
  it("resolves the exact folder name to the active thread root", () => {
    expect(resolveThread({ threadArg: THREAD, repositoryPath: repo })).toBe(
      expected(),
    );
  });

  it("resolves the repo-relative docs/threads path to the same root", () => {
    expect(
      resolveThread({
        threadArg: `docs/threads/${THREAD}`,
        repositoryPath: repo,
      }),
    ).toBe(expected());
  });

  it("resolves the absolute thread-root path to the same root", () => {
    expect(
      resolveThread({
        threadArg: join(repo, "docs", "threads", THREAD),
        repositoryPath: repo,
      }),
    ).toBe(expected());
  });

  it("all three forms resolve to one identical directory", () => {
    const a = resolveThread({ threadArg: THREAD, repositoryPath: repo });
    const b = resolveThread({
      threadArg: `docs/threads/${THREAD}`,
      repositoryPath: repo,
    });
    const c = resolveThread({
      threadArg: join(repo, "docs", "threads", THREAD),
      repositoryPath: repo,
    });
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("rejects a nonexistent thread with no fuzzy fallback", () => {
    expect(() =>
      resolveThread({ threadArg: "260718155545Z-other", repositoryPath: repo }),
    ).toThrow(ThreadResolutionError);
  });

  it("rejects a partial timestamp or slug", () => {
    expect(() =>
      resolveThread({ threadArg: "260718155545Z", repositoryPath: repo }),
    ).toThrow(ThreadResolutionError);
  });

  it("rejects a file path inside a thread", () => {
    const file = join(repo, "docs", "threads", THREAD, "spec.md");
    writeFileSync(file, "# spec\n", "utf8");
    expect(() =>
      resolveThread({ threadArg: file, repositoryPath: repo }),
    ).toThrow(/points at a file/);
  });

  it("rejects an archived thread root", () => {
    mkdirSync(join(repo, "docs", "threads", "archive", THREAD), {
      recursive: true,
    });
    expect(() =>
      resolveThread({
        threadArg: `docs/threads/archive/${THREAD}`,
        repositoryPath: repo,
      }),
    ).toThrow(/direct child/);
  });

  it("rejects an external root outside docs/threads", () => {
    const external = realpathSync.native(
      mkdtempSync(join(tmpdir(), "antmay-external-")),
    );
    try {
      expect(() =>
        resolveThread({ threadArg: external, repositoryPath: repo }),
      ).toThrow(ThreadResolutionError);
    } finally {
      rmSync(external, { recursive: true, force: true });
    }
  });

  it("rejects an empty thread value", () => {
    expect(() =>
      resolveThread({ threadArg: "   ", repositoryPath: repo }),
    ).toThrow(ThreadResolutionError);
  });

  it("keeps the resolved path a direct child of docs/threads", () => {
    const resolved = resolveThread({ threadArg: THREAD, repositoryPath: repo });
    expect(relative(join(repo, "docs", "threads"), resolved)).toBe(THREAD);
  });
});
