import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectAttention, type RepositoryPath } from "@antmay/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { canonicalizeRepositoryPath } from "../src/state/registry-store";
import {
  scanAttention,
  scanRepositoryAttention,
} from "../src/status/attention-scan";

let sandbox: string;

beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), "antmay-attention-"));
});

afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

function makeRepo(name: string): RepositoryPath {
  const dir = join(sandbox, name);
  mkdirSync(dir, { recursive: true });
  return canonicalizeRepositoryPath(dir);
}

function threadDir(repo: RepositoryPath, thread: string): string {
  const dir = join(repo, "docs", "threads", thread);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeBundle(
  threadPath: string,
  workspace: string,
  file: string,
): void {
  const dir = join(threadPath, workspace);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, file), "content\n", "utf8");
}

describe("scanRepositoryAttention", () => {
  it("counts non-empty pending bundles in direct active thread roots", () => {
    const repo = makeRepo("repo");
    const thread = threadDir(repo, "260718155545Z-a");
    writeBundle(thread, ".pending-decisions", "01-decision.md");
    writeBundle(thread, ".pending-decisions", "02-decision.md");
    writeBundle(thread, ".pending-reviews", "01-review.md");

    const counts = scanRepositoryAttention(repo);

    expect(counts).toEqual([
      {
        repositoryPath: repo,
        threadPath: thread,
        pendingDecisions: 2,
        pendingReviews: 1,
      },
    ]);
  });

  it("reports empty workspaces with zero counts, which the projection drops", () => {
    const repo = makeRepo("repo");
    threadDir(repo, "260718155545Z-empty");

    const counts = scanRepositoryAttention(repo);
    expect(counts).toEqual([
      {
        repositoryPath: repo,
        threadPath: join(repo, "docs", "threads", "260718155545Z-empty"),
        pendingDecisions: 0,
        pendingReviews: 0,
      },
    ]);
    expect(collectAttention(counts)).toEqual([]);
  });

  it("excludes archived threads under docs/threads/archive", () => {
    const repo = makeRepo("repo");
    const archived = join(
      repo,
      "docs",
      "threads",
      "archive",
      "260718155545Z-old",
    );
    mkdirSync(archived, { recursive: true });
    writeBundle(archived, ".pending-decisions", "01-decision.md");

    expect(scanRepositoryAttention(repo)).toEqual([]);
  });

  it("returns nothing when there is no docs/threads folder", () => {
    const repo = makeRepo("bare");
    expect(scanRepositoryAttention(repo)).toEqual([]);
  });

  it("counts only files, not nested directories, inside a workspace", () => {
    const repo = makeRepo("repo");
    const thread = threadDir(repo, "260718155545Z-a");
    writeBundle(thread, ".pending-decisions", "01-decision.md");
    mkdirSync(join(thread, ".pending-decisions", "nested"), {
      recursive: true,
    });

    const counts = scanRepositoryAttention(repo);
    expect(counts[0]?.pendingDecisions).toBe(1);
  });
});

describe("scanAttention", () => {
  it("scans multiple repositories and de-duplicates repeated paths", () => {
    const repoA = makeRepo("a");
    const repoB = makeRepo("b");
    const threadA = threadDir(repoA, "260718155545Z-a");
    writeBundle(threadA, ".pending-reviews", "01-review.md");
    const threadB = threadDir(repoB, "260718155545Z-b");
    writeBundle(threadB, ".pending-decisions", "01-decision.md");

    const counts = scanAttention([repoA, repoB, repoA]);

    expect(counts).toEqual([
      {
        repositoryPath: repoA,
        threadPath: threadA,
        pendingDecisions: 0,
        pendingReviews: 1,
      },
      {
        repositoryPath: repoB,
        threadPath: threadB,
        pendingDecisions: 1,
        pendingReviews: 0,
      },
    ]);
  });
});
