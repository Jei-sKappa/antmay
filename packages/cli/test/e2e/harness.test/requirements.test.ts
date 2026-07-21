// The authoritative acceptance-traceability gate for the whole functional
// requirement set (FR-1 through FR-10) plus the FR-11 harness checks. It loads
// the real requirement files and the real declarative cases and proves: every
// behavioral acceptance criterion is covered by at least one real-CLI case,
// every architecture-review criterion is named by a structural assertion (and
// never by a case), and any unknown or removed reference fails loudly. The
// FR-11 checks (AC-11.1–AC-11.3) are proven directly against the loaded case set
// rather than declared as tracked requirements, because they describe the test
// infrastructure itself.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadCases } from "../harness/case-manifest";
import { loadRequirements } from "../harness/requirements";
import { validateTraceability } from "../harness/traceability";

const cliRoot = path.resolve(import.meta.dirname, "../../..");

// The architecture-review criteria across FR-1..FR-10. Each is proven by a named
// structural assertion (in `e2e.test.ts`, `architecture-boundaries.test.ts`, or
// `public-contract.test.ts`) rather than by a declarative case; traceability
// enforces that this list matches exactly the architecture criteria in the
// requirement files and that no case ever claims one.
const STRUCTURAL_REFS = [
  "ANTMAY-FR-0001.AC-0102",
  "ANTMAY-FR-0001.AC-0103",
  "ANTMAY-FR-0005.AC-0504",
  "ANTMAY-FR-0009.AC-0903",
  "ANTMAY-FR-0009.AC-0904",
  "ANTMAY-FR-0010.AC-1001",
  "ANTMAY-FR-0010.AC-1002",
  "ANTMAY-FR-0010.AC-1003",
  "ANTMAY-FR-0010.AC-1004",
];

const requirements = await loadRequirements(cliRoot);
const cases = (await loadCases(cliRoot)).map((entry) => entry.manifest);

const PUBLIC_ARGV0 = new Set([
  "spawn",
  "status",
  "attach",
  "--help",
  "--version",
]);

const DRY_RUN_MARKERS = ["--dry-run", "--dry", "--fake", "--fake-harness"];

function srcFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...srcFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

describe("acceptance traceability (FR-1..FR-10)", () => {
  it("covers every behavioral criterion by a case and every architecture criterion structurally", () => {
    expect(() =>
      validateTraceability(requirements, cases, STRUCTURAL_REFS),
    ).not.toThrow();
  });

  it("lists exactly the requirement set's architecture criteria as structural, none behavioral", () => {
    const architecture = new Set<string>();
    const behavioral = new Set<string>();
    for (const requirement of requirements) {
      if (requirement.status !== "active") continue;
      for (const ac of requirement.acceptance) {
        if (ac.status === "removed") continue;
        const ref = `${requirement.id}.${ac.id}`;
        (ac.kind === "architecture" ? architecture : behavioral).add(ref);
      }
    }
    expect([...STRUCTURAL_REFS].sort()).toEqual([...architecture].sort());
    for (const ref of STRUCTURAL_REFS) {
      expect(behavioral.has(ref), `${ref} must not be behavioral`).toBe(false);
    }
  });
});

describe("FR-11 harness checks", () => {
  it("AC-11.1: every case invokes the built executable via a public entry with valid traceability refs", () => {
    expect(cases.length).toBeGreaterThan(0);
    for (const testCase of cases) {
      expect(testCase.covers.length, `${testCase.id} covers`).toBeGreaterThan(
        0,
      );
      expect(testCase.steps.length, `${testCase.id} steps`).toBeGreaterThan(0);
      for (const step of testCase.steps) {
        expect(step.argv.length, `${testCase.id} argv`).toBeGreaterThan(0);
        expect(
          PUBLIC_ARGV0.has(step.argv[0] ?? ""),
          `${testCase.id} argv[0] ${step.argv[0]}`,
        ).toBe(true);
      }
    }
  });

  it("AC-11.2: the fixture suite spans classifications, false positives, recovery, status, attach, and the write boundary", () => {
    const covered = new Set(cases.flatMap((testCase) => testCase.covers));
    const requiredDimensions = [
      "ANTMAY-FR-0006.AC-0601", // done/blocked/refused classifications
      "ANTMAY-FR-0006.AC-0602", // codex subagent exclusion + top-level
      "ANTMAY-FR-0006.AC-0603", // transcript/pane false positives
      "ANTMAY-FR-0006.AC-0604", // malformed/additive lines and fork following
      "ANTMAY-FR-0006.AC-0606", // transient failure + ended-without-outcome
      "ANTMAY-FR-0007.AC-0704", // status JSON contract
      "ANTMAY-FR-0007.AC-0705", // human/JSON parity
      "ANTMAY-FR-0008.AC-0801", // attach active + retained terminal panes
      "ANTMAY-FR-0008.AC-0802", // ambiguity + remediation
      "ANTMAY-FR-0009.AC-0901", // absolute write boundary
      "ANTMAY-FR-0009.AC-0902", // state-home relocation
    ];
    for (const ref of requiredDimensions) {
      expect(covered.has(ref), `dimension ${ref} covered`).toBe(true);
    }
  });

  it("AC-11.3: no case or production source obtains coverage through a dry-run or fake-harness branch", () => {
    for (const testCase of cases) {
      for (const step of testCase.steps) {
        for (const arg of step.argv) {
          expect(
            DRY_RUN_MARKERS.includes(arg),
            `${testCase.id} arg ${arg}`,
          ).toBe(false);
        }
      }
    }
    for (const file of srcFiles(path.join(cliRoot, "src"))) {
      const text = readFileSync(file, "utf8");
      for (const marker of [
        "dry-run",
        "dryRun",
        "fakeHarness",
        "fake-harness",
      ]) {
        expect(text.includes(marker), `${file} contains ${marker}`).toBe(false);
      }
    }
  });
});
