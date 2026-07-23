import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { AttemptLogHeader } from "./logs.js";
import { attemptLogPaths, createAttemptLog } from "./logs.js";

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    const cleanup = cleanups.pop();
    if (cleanup) await cleanup();
  }
});

async function tempDir(): Promise<string> {
  const raw = await fs.mkdtemp(path.join(os.tmpdir(), "antmay-logs-"));
  cleanups.push(() => fs.rm(raw, { recursive: true, force: true }));
  return raw;
}

function header(): AttemptLogHeader {
  return {
    runId: "20260723T121500123Z-abababab",
    stageId: "spec",
    stageOrdinal: 1,
    attempt: 2,
    harness: "codex",
    model: "gpt-5",
    harnessVersion: "codex 1.2.3",
    repoRoot: "/tmp/repo",
    threadRelPath: "docs/threads/t",
    startedAt: "2026-07-23T12:15:00.123Z",
  };
}

describe("attemptLogPaths (pure)", () => {
  it("zero-pads the ordinal and attempt into the file name", () => {
    const paths = attemptLogPaths("/tmp/run", 1, "spec", 2);
    expect(paths.runRelPath).toBe("logs/01-spec-attempt-02.log");
    expect(paths.absPath).toBe(path.join("/tmp/run", "logs", "01-spec-attempt-02.log"));
  });

  it("pads single-digit ordinal zero and attempt one", () => {
    const paths = attemptLogPaths("/tmp/run", 0, "plan", 1);
    expect(paths.runRelPath).toBe("logs/00-plan-attempt-01.log");
  });
});

describe("createAttemptLog (AC-13.4, AC-13.5)", () => {
  it("writes the full header in order, flushed and closed before return", async () => {
    const dir = await tempDir();
    const paths = attemptLogPaths(dir, 1, "spec", 2);
    await createAttemptLog(paths, header());
    const raw = await fs.readFile(paths.absPath, "utf8");
    expect(raw).toBe(
      [
        "Run: 20260723T121500123Z-abababab",
        "Stage: spec",
        "Stage ordinal: 1",
        "Attempt: 2",
        "Harness: codex",
        "Model: gpt-5",
        "Harness version: codex 1.2.3",
        "Repository root: /tmp/repo",
        "Thread: docs/threads/t",
        "Started at: 2026-07-23T12:15:00.123Z",
        "",
        "",
      ].join("\n"),
    );
  });

  it("creates the file at mode 0600", async () => {
    const dir = await tempDir();
    const paths = attemptLogPaths(dir, 1, "spec", 2);
    await createAttemptLog(paths, header());
    const st = await fs.stat(paths.absPath);
    expect(st.mode & 0o777).toBe(0o600);
  });

  it("fails a second creation of the same path rather than appending", async () => {
    const dir = await tempDir();
    const paths = attemptLogPaths(dir, 1, "spec", 2);
    await createAttemptLog(paths, header());
    await expect(createAttemptLog(paths, header())).rejects.toMatchObject({
      code: "EEXIST",
    });
  });
});
