import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadCases } from "./harness/case-manifest";
import { ensureBuilt, runCase } from "./harness/case-runner";
import { loadRequirements } from "./harness/requirements";
import { validateTraceability } from "./harness/traceability";

const workspaceRoot = path.resolve(import.meta.dirname, "../../../..");
const cliRoot = path.resolve(import.meta.dirname, "../..");

// The architecture-review criteria of FR-1..FR-5. Each is proven by a structural
// assertion below rather than by a declarative case; traceability enforces that
// this list matches exactly the architecture criteria in the requirement files.
const STRUCTURAL_REFS = [
  "ANTMAY-FR-0001.AC-0102",
  "ANTMAY-FR-0001.AC-0103",
  "ANTMAY-FR-0005.AC-0504",
];

// Build (or locate) the production bundle once before any case runs.
const { cliIndex, worker } = ensureBuilt(workspaceRoot);

// Load every case at collection time so each becomes its own concurrent test with
// its own timeout — a slow case then names itself instead of starving a shared
// aggregate loop of cold CLI subprocess spawns.
const cases = await loadCases(cliRoot);

function cliHelp(): string {
  return execFileSync(process.execPath, [cliIndex, "--help"], {
    encoding: "utf8",
  });
}

describe("e2e traceability", () => {
  it("covers every behavioral criterion by a case and every architecture criterion structurally", async () => {
    const requirements = await loadRequirements(cliRoot);
    expect(() =>
      validateTraceability(
        requirements,
        cases.map((entry) => entry.manifest),
        STRUCTURAL_REFS,
      ),
    ).not.toThrow();
  });
});

// Structural assertions for the architecture-review criteria FR-1..FR-5 declare.
// These are proven by inspecting the workspace and built package rather than by a
// declarative case.
describe("architecture review (FR-1..FR-5)", () => {
  it("ANTMAY-FR-0001.AC-0102: strict two-package workspace with the standing root scripts", () => {
    expect(existsSync(path.join(workspaceRoot, "packages/core/src"))).toBe(
      true,
    );
    expect(existsSync(path.join(workspaceRoot, "packages/cli/src"))).toBe(true);
    const rootPkg = JSON.parse(
      readFileSync(path.join(workspaceRoot, "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };
    for (const script of [
      "build",
      "typecheck",
      "test",
      "test:cli:e2e",
      "check",
      "format",
    ]) {
      expect(rootPkg.scripts?.[script], `root script ${script}`).toBeTypeOf(
        "string",
      );
    }
    const base = JSON.parse(
      readFileSync(path.join(workspaceRoot, "tsconfig.base.json"), "utf8"),
    ) as { compilerOptions?: { strict?: boolean; module?: string } };
    expect(base.compilerOptions?.strict).toBe(true);
    expect(base.compilerOptions?.module).toBe("ESNext");
  });

  it("ANTMAY-FR-0001.AC-0103: declares Node 20+, is npx-runnable, and claims no native Windows support", () => {
    const cliPkg = JSON.parse(
      readFileSync(
        path.join(workspaceRoot, "packages/cli/package.json"),
        "utf8",
      ),
    ) as {
      engines?: { node?: string };
      bin?: Record<string, string>;
      os?: string[];
    };
    const node = cliPkg.engines?.node ?? "";
    expect(node.startsWith(">=")).toBe(true);
    expect(
      Number.parseInt(node.replace(/[^0-9]/g, ""), 10),
    ).toBeGreaterThanOrEqual(20);
    expect(cliPkg.bin?.antmay).toBe("./dist/index.js");
    // No native-Windows-only packaging claim.
    expect(cliPkg.os === undefined || !cliPkg.os.includes("win32")).toBe(true);
    expect(
      readFileSync(cliIndex, "utf8").startsWith("#!/usr/bin/env node"),
    ).toBe(true);
  });

  it("ANTMAY-FR-0005.AC-0504: no public worker command, daemon, or hook is exposed", () => {
    const help = cliHelp();
    expect(help).not.toContain("worker");
    const cliPkg = JSON.parse(
      readFileSync(
        path.join(workspaceRoot, "packages/cli/package.json"),
        "utf8",
      ),
    ) as { bin?: Record<string, string> };
    expect(Object.keys(cliPkg.bin ?? {})).toEqual(["antmay"]);
    // The private worker module is packaged as a sibling, never as a bin/command.
    expect(existsSync(worker)).toBe(true);
  });
});

describe("e2e case tree", () => {
  it.concurrent.each(cases)(
    "runs case $manifest.id through the built CLI",
    async ({ manifest }) => {
      await runCase(workspaceRoot, cliIndex, worker, manifest);
    },
    60_000,
  );
});
