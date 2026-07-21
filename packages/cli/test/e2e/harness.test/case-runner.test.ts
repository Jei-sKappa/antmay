import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { CaseManifest } from "../harness/case-manifest";
import {
  ensureBuilt,
  noLeakedWorkers,
  runCase,
  snapshotDirectory,
  stripAnsi,
} from "../harness/case-runner";

const workspaceRoot = path.resolve(import.meta.dirname, "../../../../..");
const { cliIndex, worker } = ensureBuilt(workspaceRoot);

function manifest(overrides: Partial<CaseManifest>): CaseManifest {
  return {
    id: "self",
    covers: ["ANTMAY-FR-0001.AC-0101"],
    title: "self test",
    description: "self test",
    repos: ["main"],
    plainDirs: [],
    threads: [],
    archivedThreads: [],
    files: [],
    skills: [],
    control: {},
    seedRuns: [],
    steps: [],
    assertState: [],
    auditRepoWrites: true,
    ...overrides,
  };
}

const tempDirs: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "antmay-harness-"));
  tempDirs.push(dir);
  return dir;
}

afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

describe("write-audit primitive", () => {
  it("snapshots file content and detects an added or changed file", () => {
    const dir = tempDir();
    writeFileSync(path.join(dir, "a.txt"), "one", "utf8");
    const before = snapshotDirectory(dir);
    expect(before.size).toBe(1);
    writeFileSync(path.join(dir, "b.txt"), "two", "utf8");
    const after = snapshotDirectory(dir);
    const added = [...after.keys()].filter((f) => !before.has(f));
    expect(added).toEqual(["b.txt"]);
  });
});

describe("exact-output cleaning", () => {
  it("strips CSI escape sequences and carriage returns a PTY interleaves", () => {
    const esc = String.fromCharCode(27);
    const raw = `${esc}[1G${esc}[0JHello:${esc}[5G world\r\n`;
    expect(stripAnsi(raw)).toBe("Hello: world\n");
  });
});

describe("process cleanup", () => {
  it("reports no leaked worker for an unused token", () => {
    expect(noLeakedWorkers(["antmay-e2e-worker-absent-token-xyz"])).toEqual([]);
  });
});

describe("runCase against the built CLI", () => {
  it("runs a plain case, asserts exact output, and audits repository writes", async () => {
    await runCase(
      workspaceRoot,
      cliIndex,
      worker,
      manifest({
        id: "self-help",
        steps: [
          {
            argv: ["--help"],
            cwd: ".",
            tty: false,
            stdin: [],
            expect: {
              exitCode: 0,
              stderrEquals: "",
              stdoutContains: ["Usage: antmay"],
            },
          },
        ],
      }),
    );
  });

  it("drives a TTY interaction script through a real pseudo-terminal", async () => {
    await runCase(
      workspaceRoot,
      cliIndex,
      worker,
      manifest({
        id: "self-tty",
        threads: ["260718155545z-demo"],
        skills: [
          {
            harness: "claude",
            name: "propose",
            scope: "project",
            repo: "main",
          },
        ],
        control: { paneAlive: true },
        steps: [
          {
            argv: [
              "spawn",
              "--skill",
              "propose",
              "--harness",
              "claude",
              "--adapter",
              "herdr",
            ],
            cwd: ".",
            tty: true,
            stdin: ["260718155545z-demo"],
            expect: {
              exitCode: 0,
              stdoutContains: ["Thread (folder name", "Launched run "],
            },
          },
        ],
      }),
    );
  });
});
