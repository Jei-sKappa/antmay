import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createRunDirectory,
  generateRunId,
  runDirectoryFor,
  runsDirectory,
} from "./runs.js";

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    const cleanup = cleanups.pop();
    if (cleanup) await cleanup();
  }
});

async function tempDir(): Promise<string> {
  const raw = await fs.mkdtemp(path.join(os.tmpdir(), "antmay-runs-"));
  cleanups.push(() => fs.rm(raw, { recursive: true, force: true }));
  return raw;
}

async function mode(p: string): Promise<number> {
  const st = await fs.stat(p);
  return st.mode & 0o777;
}

describe("generateRunId (AC-7.5)", () => {
  it("matches the required run-ID pattern", () => {
    const now = new Date(Date.UTC(2026, 6, 23, 12, 15, 0, 123));
    const id = generateRunId(now, (n) => Buffer.alloc(n, 0xab));
    expect(id).toBe("20260723T121500123Z-abababab");
    expect(id).toMatch(/^\d{8}T\d{9}Z-[0-9a-f]{8}$/);
  });

  it("zero-pads every component", () => {
    const now = new Date(Date.UTC(2026, 0, 3, 4, 5, 6, 7));
    const id = generateRunId(now, (n) => Buffer.alloc(n, 0x0f));
    expect(id).toBe("20260103T040506007Z-0f0f0f0f");
  });
});

describe("createRunDirectory (AC-7.5, AC-13.5)", () => {
  it("creates the run directory and reports the path", async () => {
    const stateRoot = path.join(await tempDir(), "state");
    const result = await createRunDirectory(stateRoot, "20260723T121500123Z-abababab");
    expect(result.kind).toBe("created");
    if (result.kind === "created") {
      const st = await fs.stat(result.runDir);
      expect(st.isDirectory()).toBe(true);
    }
  });

  it("reports a collision for an explicit duplicate candidate", async () => {
    const stateRoot = path.join(await tempDir(), "state");
    const runId = "20260723T121500123Z-abababab";
    const first = await createRunDirectory(stateRoot, runId);
    expect(first.kind).toBe("created");
    const second = await createRunDirectory(stateRoot, runId);
    expect(second.kind).toBe("collision");
  });

  it("creates state root, afk-runs, and the run dir at mode 0700", async () => {
    const stateRoot = path.join(await tempDir(), "state");
    const runId = "20260723T121500123Z-abababab";
    const result = await createRunDirectory(stateRoot, runId);
    expect(await mode(stateRoot)).toBe(0o700);
    expect(await mode(runsDirectory(stateRoot))).toBe(0o700);
    if (result.kind === "created") {
      expect(await mode(result.runDir)).toBe(0o700);
    }
  });
});

describe("path helpers are pure (AC-15 lazy creation)", () => {
  it("runsDirectory and runDirectoryFor create nothing", async () => {
    const stateRoot = path.join(await tempDir(), "state");
    const runsDir = runsDirectory(stateRoot);
    const runDir = runDirectoryFor(stateRoot, "20260723T121500123Z-abababab");
    expect(runsDir).toBe(path.join(stateRoot, "afk-runs"));
    expect(runDir).toBe(path.join(stateRoot, "afk-runs", "20260723T121500123Z-abababab"));
    await expect(fs.stat(stateRoot)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(fs.stat(runsDir)).rejects.toMatchObject({ code: "ENOENT" });
  });
});
