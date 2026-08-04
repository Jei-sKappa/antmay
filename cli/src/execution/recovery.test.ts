import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { AttemptReference, WaitingRecovery } from "../state/checkpoint.js";

import {
  DECIDED_FROM,
  classifyRecovery,
  holdsPreservedDone,
  referencesAttempt,
} from "./recovery.js";

const REFERENCE: AttemptReference = { stageIndex: 2, attempt: 3 };

/** Every recovery a paused checkpoint can record, so a table can be exhaustive. */
const EVERY_RECOVERY: WaitingRecovery[] = [
  { kind: "retry-stage" },
  { kind: "resume-finalized-done", attempt: REFERENCE, queueResolution: "advance" },
  { kind: "resume-finalized-done", attempt: REFERENCE, queueResolution: "rerun" },
  { kind: "recheck-stage-contract", attempt: REFERENCE, pausedAtHead: "a".repeat(40) },
  { kind: "retry-git-finalization", attempt: REFERENCE, pausedAtHead: "b".repeat(40) },
];

describe("DECIDED_FROM — what each recovery is decided from", () => {
  it("declares one row for every recovery a pause can record", () => {
    // The type makes a missing row a compile error; this is the other half — that
    // the union the rows are written against is the one a checkpoint carries, so
    // a kind cannot be classified in the table and unreachable in practice.
    expect(Object.keys(DECIDED_FROM).sort()).toEqual(
      [...new Set(EVERY_RECOVERY.map((recovery) => recovery.kind))].sort(),
    );
  });

  it("asks for fresh evidence only where a saved DONE is being held", () => {
    expect(
      Object.entries(DECIDED_FROM)
        .filter(([, evidence]) => evidence === "preserved-done")
        .map(([kind]) => kind)
        .sort(),
    ).toEqual(["recheck-stage-contract", "retry-git-finalization"]);
  });
});

describe("classifyRecovery — matching a recorded value against that table", () => {
  it("classifies every recovery exactly as the table declares it", () => {
    for (const recovery of EVERY_RECOVERY) {
      expect(classifyRecovery(recovery).decidedFrom, recovery.kind).toBe(
        DECIDED_FROM[recovery.kind],
      );
    }
  });

  it("carries the recorded recovery through untouched", () => {
    for (const recovery of EVERY_RECOVERY) {
      expect(classifyRecovery(recovery).recovery).toBe(recovery);
    }
  });
});

describe("holdsPreservedDone — which pauses hold a saved DONE (AC-3.4)", () => {
  it("names exactly the two recoveries a finalization can be requested for", () => {
    expect(EVERY_RECOVERY.filter(holdsPreservedDone).map((r) => r.kind)).toEqual([
      "recheck-stage-contract",
      "retry-git-finalization",
    ]);
  });
});

describe("referencesAttempt — which pauses name one exact attempt", () => {
  it("names every recovery carrying a reference, and no other", () => {
    expect(EVERY_RECOVERY.filter(referencesAttempt).map((r) => r.kind)).toEqual([
      "resume-finalized-done",
      "resume-finalized-done",
      "recheck-stage-contract",
      "retry-git-finalization",
    ]);
  });

  it("reads the reference off the recovery rather than off its kind", () => {
    // Answering from the reference is what keeps a recovery that names an attempt
    // from being resolved as one that names none, whatever its kind is called.
    for (const recovery of EVERY_RECOVERY) {
      expect(referencesAttempt(recovery), recovery.kind).toBe("attempt" in recovery);
    }
  });
});

describe("recovery module — purity", () => {
  const source = readFileSync(new URL("./recovery.ts", import.meta.url), "utf8");

  it("declares no import of the filesystem, Git, harness, display, or persistence", () => {
    // A static source assertion rather than a fixture: the property under test is
    // what the module may reach at all, which no runtime call can demonstrate.
    const statements = [...source.matchAll(/^import[\s\S]*?;$/gm)].map((m) => m[0]);
    expect(statements).toHaveLength(2);
    for (const statement of statements) {
      expect(statement.startsWith("import type ")).toBe(true);
    }
    expect(statements.map((s) => /from "([^"]+)"/.exec(s)?.[1])).toEqual([
      "../state/checkpoint.js",
      "../thread/artifacts.js",
    ]);
    expect(source).not.toMatch(/node:|Date\(|process\./);
  });
});
