import fs from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import { loadPipelineDocument } from "./documents.js";
import type { PipelineDocument } from "./types.js";
import { tempDirSync } from "../test-helpers/temp-root.js";

let dir: string;

beforeEach(() => {
  dir = tempDirSync("antmay-pipeline-doc-");
});

function write(document: unknown, filename = "pipeline.json"): string {
  const source = path.join(dir, filename);
  fs.writeFileSync(source, JSON.stringify(document), "utf8");
  return source;
}

function accept(document: unknown): PipelineDocument {
  const result = loadPipelineDocument(write(document));
  if (!result.ok) {
    throw new Error(`expected a valid pipeline: ${result.errors.join("; ")}`);
  }
  return result.document;
}

function reject(document: unknown): string[] {
  const result = loadPipelineDocument(write(document));
  if (result.ok) {
    throw new Error("expected the pipeline document to be rejected");
  }
  return result.errors;
}

/**
 * A minimal valid document, with root fields overridable per case.
 */
function pipeline(overrides: Record<string, unknown> = {}): unknown {
  return {
    schemaVersion: 0,
    name: "standard",
    stages: [{ stage: "spec" }],
    ...overrides,
  };
}

describe("loadPipelineDocument — the canonical schema (AC-2.1)", () => {
  it("accepts the exact object schema and keeps entries in document order", () => {
    const document = accept({
      schemaVersion: 0,
      name: "standard",
      stages: [
        { stage: "spec" },
        { stage: "plan-strict", instructions: "Split by module." },
        { stage: "implement-plan-with-subagents" },
      ],
    });

    expect(document.name).toBe("standard");
    expect(document.stages).toEqual([
      { stage: "spec" },
      { stage: "plan-strict", instructions: "Split by module." },
      { stage: "implement-plan-with-subagents" },
    ]);
  });

  it("keeps the declared identity separate from the resolved source", () => {
    const source = write(pipeline({ name: "standard" }), "renamed-on-disk.json");
    const result = loadPipelineDocument(source);

    expect(result).toEqual({
      ok: true,
      document: { name: "standard", sourcePath: source, stages: [{ stage: "spec" }] },
    });
  });

  it("reports a missing document against its resolved path", () => {
    const missing = path.join(dir, "absent.json");
    const result = loadPipelineDocument(missing);

    expect(result).toEqual({
      ok: false,
      errors: [`No pipeline document exists at ${missing}.`],
    });
  });

  it("reports invalid JSON against its resolved path", () => {
    const source = path.join(dir, "broken.json");
    fs.writeFileSync(source, "{ not json", "utf8");
    const result = loadPipelineDocument(source);

    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.errors[0]).toContain(
      `${source} is not valid JSON`,
    );
  });

  it("rejects a non-object root", () => {
    expect(reject([{ stage: "spec" }])).toEqual([
      "The pipeline document root must be an object.",
    ]);
  });

  it("requires schemaVersion 0", () => {
    expect(reject(pipeline({ schemaVersion: 1 }))).toEqual([
      "schemaVersion must be 0.",
    ]);
    expect(reject(pipeline({ schemaVersion: "0" }))).toEqual([
      "schemaVersion must be 0.",
    ]);
    const { schemaVersion: _omitted, ...withoutVersion } = pipeline() as Record<
      string,
      unknown
    >;
    expect(reject(withoutVersion)).toEqual([
      "schemaVersion is required and must be 0.",
    ]);
  });

  it("rejects every declared name that fails the shared raw grammar (AC-2.1)", () => {
    for (const name of [
      "",
      "Standard",
      "standard pipeline",
      "standard_pipeline",
      "-standard",
      "standard-",
      "standard--pipeline",
      "standard.json",
      "stàndard",
      42,
    ]) {
      expect(reject(pipeline({ name }))).toEqual([
        "name must be a string matching ^[a-z0-9]+(?:-[a-z0-9]+)*$.",
      ]);
    }
  });

  it("accepts a declared name that need not match the filename", () => {
    const document = accept(pipeline({ name: "0-budget-run" }));
    expect(document.name).toBe("0-budget-run");
  });

  it("requires a non-empty stages array", () => {
    expect(reject(pipeline({ stages: [] }))).toEqual([
      "stages must list at least one stage.",
    ]);
    expect(reject(pipeline({ stages: { spec: {} } }))).toEqual([
      "stages must be an array of stage entries.",
    ]);
    const { stages: _omitted, ...withoutStages } = pipeline() as Record<
      string,
      unknown
    >;
    expect(reject(withoutStages)).toEqual([
      "stages is required and must list at least one stage.",
    ]);
  });

  it("rejects string stage shorthand", () => {
    expect(reject(pipeline({ stages: ["spec"] }))).toEqual([
      'stages[0] must be an object with a "stage" field; a stage entry has no string shorthand.',
    ]);
  });

  it("requires stage on every entry", () => {
    expect(reject(pipeline({ stages: [{ instructions: "go" }] }))).toEqual([
      "stages[0].stage is required.",
    ]);
  });

  it("rejects an unknown stage ID, including the deferred capabilities (AC-2.2)", () => {
    for (const stage of ["propose", "roadmap", "review-roadmap", "spek"]) {
      expect(reject(pipeline({ stages: [{ stage }] }))).toEqual([
        `stages[0].stage must name a catalog stage; "${stage}" is not a supported catalog stage ID.`,
      ]);
    }
  });

  it("rejects a duplicate stage ID", () => {
    expect(
      reject(
        pipeline({
          stages: [{ stage: "spec" }, { stage: "review-spec" }, { stage: "spec" }],
        }),
      ),
    ).toEqual([
      'stages[2].stage repeats "spec"; a pipeline may select each stage only once.',
    ]);
  });

  it("rejects empty or non-string instructions", () => {
    expect(reject(pipeline({ stages: [{ stage: "spec", instructions: "" }] }))).toEqual(
      ["stages[0].instructions must be a non-empty string."],
    );
    expect(
      reject(pipeline({ stages: [{ stage: "spec", instructions: ["go"] }] })),
    ).toEqual(["stages[0].instructions must be a non-empty string."]);
  });

  it("reports every discoverable problem in one load", () => {
    expect(
      reject({
        schemaVersion: 1,
        name: "Standard",
        description: "notes",
        stages: [
          { stage: "spec", instructions: "" },
          { stage: "nope" },
          { stage: "spec" },
        ],
      }),
    ).toEqual([
      "description is not a recognized pipeline field.",
      "schemaVersion must be 0.",
      "name must be a string matching ^[a-z0-9]+(?:-[a-z0-9]+)*$.",
      "stages[0].instructions must be a non-empty string.",
      'stages[1].stage must name a catalog stage; "nope" is not a supported catalog stage ID.',
      'stages[2].stage repeats "spec"; a pipeline may select each stage only once.',
    ]);
  });
});

describe("loadPipelineDocument — nothing but portable structure (AC-2.5)", () => {
  it("rejects unknown root fields, including pipeline-wide instructions", () => {
    for (const field of [
      "instructions",
      "defaults",
      "agent",
      "profile",
      "prompt",
      "gitPolicy",
    ]) {
      expect(reject(pipeline({ [field]: "anything" }))).toEqual([
        `${field} is not a recognized pipeline field.`,
      ]);
    }
  });

  it("rejects local binding, prompt, target, Git, queue, and contract entry fields", () => {
    for (const field of [
      "agent",
      "harness",
      "model",
      "idleTimeoutSeconds",
      "heartbeatSeconds",
      "prompt",
      "skill",
      "target",
      "targetRule",
      "gitPolicy",
      "allowedChanges",
      "commitSubjectTemplate",
      "queueResolution",
      "prerequisite",
      "promises",
    ]) {
      expect(
        reject(pipeline({ stages: [{ stage: "spec", [field]: "anything" }] })),
      ).toEqual([
        `stages[0].${field} is not a recognized stage entry field; an entry carries only "stage" and "instructions".`,
      ]);
    }
  });
});
