import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { RunCheckpoint } from "./checkpoint.js";
import type { FileHandleLike, FsOps } from "./persist.js";
import { readCheckpoint, writeCheckpoint } from "./persist.js";

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    const cleanup = cleanups.pop();
    if (cleanup) await cleanup();
  }
});

async function tempDir(): Promise<string> {
  const raw = await fs.mkdtemp(path.join(os.tmpdir(), "antmay-persist-"));
  cleanups.push(() => fs.rm(raw, { recursive: true, force: true }));
  return raw;
}

function checkpoint(): RunCheckpoint {
  return {
    schemaVersion: 1,
    runId: "20260723T121500123Z-0a1b2c3d",
    executor: { pid: 1, version: "0.1.0" },
    createdAt: "2026-07-23T12:15:00.123Z",
    updatedAt: "2026-07-23T12:16:00.000Z",
    repoRoot: "/tmp/repo",
    threadRelPath: "docs/threads/t",
    workspace: {
      strategy: "current-checkout",
      path: "/tmp/repo",
      execution: { cwd: "/tmp/repo", sandbox: "none", branchStrategy: "head" },
    },
    dangerouslySkipPermissions: false,
    recipeName: "standard",
    stages: [
      {
        id: "spec",
        skill: "spec",
        target: { kind: "thread-root" },
        gitPolicy: {
          headMayChange: false,
          allowedChanges: [],
          changeRequired: false,
          commitSubjectTemplate: null,
        },
        queueResolution: "rerun",
        profile: { harness: "codex", model: "gpt-5", prompt: "p", idleTimeoutSeconds: 900 },
        resolvedTarget: "/tmp/repo/docs/threads/t",
      },
    ],
    observedHarnessVersions: { codex: "codex 1.0.0" },
    stageIndex: 0,
    condition: "ready",
    attempts: [],
    waiting: null,
    gitCursor: { stageIndex: 0, headAtStageEntry: null, observedHead: null },
  };
}

function fakeHandle(overrides: Partial<FileHandleLike> = {}): FileHandleLike {
  return {
    write: async () => undefined,
    sync: async () => undefined,
    close: async () => undefined,
    ...overrides,
  };
}

describe("writeCheckpoint serialization (AC-13.2)", () => {
  it("writes deterministic two-space JSON with a trailing newline", async () => {
    const dir = await tempDir();
    const cp = checkpoint();
    await writeCheckpoint(dir, cp);
    const raw = await fs.readFile(path.join(dir, "state.json"), "utf8");
    expect(raw).toBe(`${JSON.stringify(cp, null, 2)}\n`);
  });

  it("round-trips through readCheckpoint", async () => {
    const dir = await tempDir();
    const cp = checkpoint();
    await writeCheckpoint(dir, cp);
    const result = await readCheckpoint(dir);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.checkpoint).toEqual(cp);
  });
});

describe("writeCheckpoint atomic temp file", () => {
  it("exclusively creates the temp file with flag wx and mode 0600", async () => {
    const opens: Array<{ path: string; flags: string; mode?: number }> = [];
    let renamed = false;
    const fsOps: FsOps = {
      open: async (p, flags, mode) => {
        opens.push({ path: p, flags, mode });
        return fakeHandle();
      },
      rename: async () => {
        renamed = true;
      },
    };
    await writeCheckpoint("/tmp/run", checkpoint(), fsOps);
    const tempOpen = opens.find((o) => o.path.includes(".state.json."));
    expect(tempOpen).toBeDefined();
    expect(tempOpen?.flags).toBe("wx");
    expect(tempOpen?.mode).toBe(0o600);
    expect(renamed).toBe(true);
  });
});

describe("writeCheckpoint failure atomicity (AC-13.2)", () => {
  it("leaves the previous state.json intact on injected write failure", async () => {
    const dir = await tempDir();
    const first = checkpoint();
    await writeCheckpoint(dir, first);

    let renamed = false;
    const failing: FsOps = {
      open: async () => fakeHandle({ write: async () => { throw new Error("disk full"); } }),
      rename: async () => { renamed = true; },
    };
    const second = { ...checkpoint(), runId: "20260723T999999999Z-ffffffff" };
    await expect(writeCheckpoint(dir, second, failing)).rejects.toThrow("disk full");
    expect(renamed).toBe(false);

    const result = await readCheckpoint(dir);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.checkpoint).toEqual(first);
  });

  it("leaves the previous state.json intact on injected rename failure", async () => {
    const dir = await tempDir();
    const first = checkpoint();
    await writeCheckpoint(dir, first);

    const failing: FsOps = {
      open: async () => fakeHandle(),
      rename: async () => { throw new Error("rename failed"); },
    };
    const second = { ...checkpoint(), runId: "20260723T999999999Z-ffffffff" };
    await expect(writeCheckpoint(dir, second, failing)).rejects.toThrow("rename failed");

    const result = await readCheckpoint(dir);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.checkpoint).toEqual(first);
  });
});

describe("readCheckpoint ignores leftover temp files", () => {
  it("reads only state.json and ignores stray temp files", async () => {
    const dir = await tempDir();
    const cp = checkpoint();
    await writeCheckpoint(dir, cp);
    await fs.writeFile(path.join(dir, ".state.json.deadbeef.tmp"), "not json {{{", "utf8");
    const result = await readCheckpoint(dir);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.checkpoint).toEqual(cp);
  });

  it("reports a failure when state.json is missing", async () => {
    const dir = await tempDir();
    const result = await readCheckpoint(dir);
    expect(result.ok).toBe(false);
  });
});
