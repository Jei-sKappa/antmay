// The public v0 contract, compared against the built artifact and the fixed
// specification: the built executable's `--help` and `--version`, the frozen
// eighteen-entry skill catalog with its harness identities and request postures,
// the exact `status --json` structural contract at schema version 1, and the
// package identity/platform metadata (bin `antmay`, Node.js 20+, no native
// Windows claim). This reads the real built `dist/index.js`, not a mock.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ANTMAY_SKILL_CATALOG } from "@antmay/core";
import { afterAll, describe, expect, it } from "vitest";

const workspaceRoot = path.resolve(import.meta.dirname, "../../..");
const cliIndex = path.join(workspaceRoot, "packages/cli/dist/index.js");

// Build the production bundle once if it is not already present, so this suite
// asserts against the real built executable even when run before a manual build.
if (!existsSync(cliIndex)) {
  const result = spawnSync("bun", ["run", "build"], {
    cwd: workspaceRoot,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(
      "failed to build the production CLI for the contract test.",
    );
  }
}

const tempDirs: string[] = [];
afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

function runBuilt(
  args: readonly string[],
  env: NodeJS.ProcessEnv,
): { code: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [cliIndex, ...args], {
    encoding: "utf8",
    env,
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

// The frozen v0 catalog exactly as fixed in the specification §3.4.
const EXPECTED_CATALOG = [
  ["implement", "/implement", "$implement", "required"],
  ["implement-plan", "/implement-plan", "$implement-plan", "optional"],
  [
    "implement-plan-with-subagents",
    "/implement-plan-with-subagents",
    "$implement-plan-with-subagents",
    "optional",
  ],
  [
    "materialize-roadmap-threads",
    "/materialize-roadmap-threads",
    "$materialize-roadmap-threads",
    "forbidden",
  ],
  ["merge-artifacts", "/merge-artifacts", "$merge-artifacts", "required"],
  ["plan-brief", "/plan-brief", "$plan-brief", "optional"],
  ["plan-strict", "/plan-strict", "$plan-strict", "optional"],
  ["propose", "/propose", "$propose", "optional"],
  ["reconcile-plan", "/reconcile-plan", "$reconcile-plan", "forbidden"],
  [
    "reconcile-proposal",
    "/reconcile-proposal",
    "$reconcile-proposal",
    "forbidden",
  ],
  [
    "reconcile-roadmap",
    "/reconcile-roadmap",
    "$reconcile-roadmap",
    "forbidden",
  ],
  ["reconcile-spec", "/reconcile-spec", "$reconcile-spec", "forbidden"],
  ["review-code", "/review-code", "$review-code", "required"],
  [
    "review-implementation",
    "/review-implementation",
    "$review-implementation",
    "required",
  ],
  ["review-roadmap", "/review-roadmap", "$review-roadmap", "forbidden"],
  ["review-spec", "/review-spec", "$review-spec", "forbidden"],
  ["roadmap", "/roadmap", "$roadmap", "forbidden"],
  ["spec", "/spec", "$spec", "optional"],
];

describe("public help and version", () => {
  it("identifies antmay and lists exactly spawn/status/attach with no worker", () => {
    const help = execFileSync(process.execPath, [cliIndex, "--help"], {
      encoding: "utf8",
    });
    expect(help).toContain("Usage: antmay");
    expect(help).toContain("spawn");
    expect(help).toContain("status");
    expect(help).toContain("attach");
    expect(help).not.toContain("worker");
  });

  it("prints the package version", () => {
    const pkg = JSON.parse(
      readFileSync(
        path.join(workspaceRoot, "packages/cli/package.json"),
        "utf8",
      ),
    ) as { version: string };
    const version = execFileSync(process.execPath, [cliIndex, "--version"], {
      encoding: "utf8",
    });
    expect(version.trim()).toBe(pkg.version);
  });
});

describe("frozen skill catalog", () => {
  it("contains exactly the eighteen specified entries, identities, and postures", () => {
    expect(ANTMAY_SKILL_CATALOG.length).toBe(18);
    const actual = ANTMAY_SKILL_CATALOG.map((entry) => [
      entry.name,
      entry.claudeIdentity,
      entry.codexIdentity,
      entry.requestPosture,
    ]);
    expect(actual).toEqual(EXPECTED_CATALOG);
  });
});

describe("status --json contract", () => {
  it("emits exactly the schema-version-1 document shape with all scope", () => {
    const home = mkdtempSync(path.join(tmpdir(), "antmay-contract-"));
    tempDirs.push(home);
    const env: NodeJS.ProcessEnv = {
      PATH: process.env.PATH,
      HOME: home,
      ANTMAY_STATE_HOME: path.join(home, "state"),
    };
    const result = runBuilt(["status", "--all", "--json"], env);
    expect(result.code).toBe(0);
    const document = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(Object.keys(document).sort()).toEqual([
      "attention",
      "runs",
      "schemaVersion",
      "scope",
    ]);
    expect(document.schemaVersion).toBe(1);
    expect(document.scope).toEqual({ mode: "all", repositoryPath: null });
    expect(document.runs).toEqual([]);
    expect(document.attention).toEqual([]);
  });
});

describe("package identity and platform", () => {
  it("declares bin antmay, Node.js 20+, an npx-runnable shebang, and no native Windows claim", () => {
    const cliPkg = JSON.parse(
      readFileSync(
        path.join(workspaceRoot, "packages/cli/package.json"),
        "utf8",
      ),
    ) as {
      bin?: Record<string, string>;
      engines?: { node?: string };
      os?: string[];
    };
    expect(cliPkg.bin?.antmay).toBe("./dist/index.js");
    const node = cliPkg.engines?.node ?? "";
    expect(node.startsWith(">=")).toBe(true);
    expect(
      Number.parseInt(node.replace(/[^0-9]/g, ""), 10),
    ).toBeGreaterThanOrEqual(20);
    expect(cliPkg.os === undefined || !cliPkg.os.includes("win32")).toBe(true);
    expect(
      readFileSync(cliIndex, "utf8").startsWith("#!/usr/bin/env node"),
    ).toBe(true);
  });
});
