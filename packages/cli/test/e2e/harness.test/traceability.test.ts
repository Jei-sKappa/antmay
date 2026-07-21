import { describe, expect, it } from "vitest";
import type { CaseManifest } from "../harness/case-manifest";
import type { Requirement } from "../harness/requirements";
import { validateTraceability } from "../harness/traceability";

function requirement(): Requirement {
  return {
    id: "ANTMAY-FR-0001",
    title: "sample",
    status: "active",
    description: "d",
    acceptance: [
      { id: "AC-0101", statement: "behavioral one", kind: "behavioral" },
      { id: "AC-0102", statement: "architecture one", kind: "architecture" },
    ],
  };
}

function caseFor(ref: string): CaseManifest {
  return {
    id: "c",
    covers: [ref],
    title: "t",
    description: "d",
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
  };
}

describe("traceability", () => {
  it("accepts a behavioral case plus a matching structural assertion", () => {
    expect(() =>
      validateTraceability(
        [requirement()],
        [caseFor("ANTMAY-FR-0001.AC-0101")],
        ["ANTMAY-FR-0001.AC-0102"],
      ),
    ).not.toThrow();
  });

  it("rejects an uncovered behavioral criterion", () => {
    expect(() =>
      validateTraceability([requirement()], [], ["ANTMAY-FR-0001.AC-0102"]),
    ).toThrow(/uncovered behavioral criterion ANTMAY-FR-0001.AC-0101/);
  });

  it("rejects a case covering an unknown criterion", () => {
    expect(() =>
      validateTraceability(
        [requirement()],
        [caseFor("ANTMAY-FR-0001.AC-9999")],
        ["ANTMAY-FR-0001.AC-0102"],
      ),
    ).toThrow(/missing acceptance criterion/);
  });

  it("rejects a case covering an architecture criterion", () => {
    expect(() =>
      validateTraceability(
        [requirement()],
        [caseFor("ANTMAY-FR-0001.AC-0102")],
        ["ANTMAY-FR-0001.AC-0102"],
      ),
    ).toThrow(/covers architecture-review criterion/);
  });

  it("rejects an architecture criterion with no structural assertion", () => {
    expect(() =>
      validateTraceability(
        [requirement()],
        [caseFor("ANTMAY-FR-0001.AC-0101")],
        [],
      ),
    ).toThrow(/no structural assertion/);
  });

  it("rejects a structural assertion naming a behavioral criterion", () => {
    expect(() =>
      validateTraceability(
        [requirement()],
        [caseFor("ANTMAY-FR-0001.AC-0101")],
        ["ANTMAY-FR-0001.AC-0101", "ANTMAY-FR-0001.AC-0102"],
      ),
    ).toThrow(/names behavioral criterion/);
  });
});
