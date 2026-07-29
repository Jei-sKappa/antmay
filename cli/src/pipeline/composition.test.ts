import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { composePipeline } from "./composition.js";
import type { PreparedStage } from "./composition.js";
import { loadPipelineDocument } from "./documents.js";
import type {
  ArtifactState,
  PipelineDocument,
  PipelineStageEntry,
} from "./types.js";

const THREAD = "docs/threads/260101000000Z-example";

/**
 * A thread that exists and holds nothing else yet, with dimensions overridable
 * per case.
 */
function state(overrides: Partial<ArtifactState> = {}): ArtifactState {
  return {
    validThread: true,
    proposal: false,
    spec: false,
    plan: "absent",
    implementationReport: false,
    ...overrides,
  };
}

function document(stages: PipelineStageEntry[]): PipelineDocument {
  return {
    name: "example",
    sourcePath: "/config/pipelines/example.json",
    stages,
  };
}

function compose(
  stages: PipelineStageEntry[],
  artifactState: ArtifactState,
  fromStage: string | null = null,
): PreparedStage[] {
  const result = composePipeline(document(stages), artifactState, THREAD, fromStage);
  if (!result.ok) {
    throw new Error(`expected a composable pipeline: ${result.errors.join(" ")}`);
  }
  return result.stages;
}

function refuse(
  stages: PipelineStageEntry[],
  artifactState: ArtifactState,
  fromStage: string | null = null,
): string[] {
  const result = composePipeline(document(stages), artifactState, THREAD, fromStage);
  if (result.ok) {
    throw new Error("expected the composition to be refused");
  }
  return result.errors;
}

function ids(prepared: PreparedStage[]): string[] {
  return prepared.map((entry) => entry.stage.id);
}

describe("composePipeline — suffix selection (AC-4.1, AC-4.2, AC-4.3)", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "antmay-composition-"));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("validates the complete source document even where --from would skip the fault", () => {
    const source = path.join(dir, "pipeline.json");
    fs.writeFileSync(
      source,
      JSON.stringify({
        schemaVersion: 0,
        name: "example",
        stages: [{ stage: "spec", instructions: "" }, { stage: "plan-strict" }],
      }),
      "utf8",
    );

    const loaded = loadPipelineDocument(source);

    expect(loaded).toEqual({
      ok: false,
      errors: ["stages[0].instructions must be a non-empty string."],
    });
  });

  it("selects every stage when no --from is given", () => {
    const prepared = compose(
      [{ stage: "spec" }, { stage: "review-spec" }, { stage: "plan-strict" }],
      state(),
    );

    expect(ids(prepared)).toEqual(["spec", "review-spec", "plan-strict"]);
  });

  it("selects the named stage and every later one, in document order", () => {
    const prepared = compose(
      [
        { stage: "spec" },
        { stage: "review-spec" },
        { stage: "plan-strict" },
        { stage: "implement-plan" },
      ],
      state({ spec: true }),
      "review-spec",
    );

    expect(ids(prepared)).toEqual(["review-spec", "plan-strict", "implement-plan"]);
  });

  it("refuses a --from stage the pipeline does not select, naming it", () => {
    expect(
      refuse([{ stage: "spec" }, { stage: "plan-strict" }], state(), "implement"),
    ).toEqual([
      'Stage "implement" is not in pipeline "example"; its stages are "spec", "plan-strict".',
    ]);
  });
});

describe("composePipeline — simulated artifact state (AC-4.4)", () => {
  it("credits nothing a skipped stage would have promised", () => {
    expect(
      refuse(
        [{ stage: "spec" }, { stage: "plan-strict" }],
        state(),
        "plan-strict",
      ),
    ).toEqual([
      'Stage "plan-strict" (selected position 1) cannot run: it requires a ' +
        "non-empty spec.md, but the thread's current state has no spec.md.",
      "No earlier stage is selected, so that state must already exist in the thread.",
    ]);
  });

  it("admits a later entry point whose prerequisite already exists in the thread", () => {
    const prepared = compose(
      [{ stage: "spec" }, { stage: "plan-strict" }],
      state({ spec: true }),
      "plan-strict",
    );

    expect(ids(prepared)).toEqual(["plan-strict"]);
  });

  it("applies each promised transition in order for the stages after it", () => {
    const prepared = compose(
      [{ stage: "spec" }, { stage: "plan-strict" }, { stage: "reconcile-plan" }],
      state(),
    );

    expect(ids(prepared)).toEqual(["spec", "plan-strict", "reconcile-plan"]);
  });

  it("leaves dimensions a transition does not name untouched", () => {
    // `spec` promises only a spec, so the strict plan already in the thread must
    // still satisfy `reconcile-plan` behind it.
    const prepared = compose(
      [{ stage: "spec" }, { stage: "reconcile-plan" }],
      state({ plan: "strict" }),
    );

    expect(ids(prepared)).toEqual(["spec", "reconcile-plan"]);
  });

  it("does not mutate the concrete state it was given", () => {
    const concrete = state();
    compose([{ stage: "spec" }, { stage: "plan-strict" }], concrete);

    expect(concrete).toEqual(state());
  });

  it("refuses a stage whose plan prerequisite is malformed", () => {
    expect(refuse([{ stage: "implement-plan" }], state({ plan: "malformed" }))).toEqual([
      'Stage "implement-plan" (selected position 1) cannot run: it requires a ' +
        "non-empty plan.md and a plan-tasks/ folder holding at least one " +
        "non-empty .md task file, but the thread's current state has a plan.md " +
        "and plan-tasks/ folder pair in a combination that is no usable plan.",
      "No earlier stage is selected, so that state must already exist in the thread.",
    ]);
  });
});

describe("composePipeline — the first impossible stage (AC-4.5, AC-4.7)", () => {
  it("rejects plan-brief followed by either strict-plan implementation stage", () => {
    for (const implementation of [
      "implement-plan",
      "implement-plan-with-subagents",
    ] as const) {
      expect(
        refuse([{ stage: "plan-brief" }, { stage: implementation }], state()),
      ).toEqual([
        `Stage "${implementation}" (selected position 2) cannot run: it requires a ` +
          "non-empty plan.md and a plan-tasks/ folder holding at least one " +
          "non-empty .md task file, but the simulated state at that point has a " +
          "non-empty plan.md and no plan-tasks/ folder.",
        'Earlier selected stages leaving that state: "plan-brief" (position 1) ' +
          "promises a non-empty plan.md and no plan-tasks/ folder.",
      ]);
    }
  });

  it("names the thread's own state when nothing precedes the failing stage", () => {
    expect(refuse([{ stage: "implement" }], state())).toEqual([
      'Stage "implement" (selected position 1) cannot run: it requires a ' +
        "non-empty plan.md and no plan-tasks/ folder, but the thread's current " +
        "state has no plan.md and no plan-tasks/ folder.",
      "No earlier stage is selected, so that state must already exist in the thread.",
    ]);
  });

  it("says so when no preceding selected stage bears on the failing dimension", () => {
    expect(refuse([{ stage: "spec" }, { stage: "implement" }], state())).toEqual([
      'Stage "implement" (selected position 2) cannot run: it requires a ' +
        "non-empty plan.md and no plan-tasks/ folder, but the simulated state at " +
        "that point has no plan.md and no plan-tasks/ folder.",
      "No earlier selected stage produces that state, so it must already exist in the thread.",
    ]);
  });

  it("reports every unmet dimension of the failing stage together", () => {
    expect(refuse([{ stage: "reconcile-plan" }], state())).toEqual([
      'Stage "reconcile-plan" (selected position 1) cannot run: it requires a ' +
        "non-empty spec.md, a non-empty plan.md and a plan-tasks/ folder holding " +
        "at least one non-empty .md task file, but the thread's current state has " +
        "no spec.md, no plan.md and no plan-tasks/ folder.",
      "No earlier stage is selected, so that state must already exist in the thread.",
    ]);
  });

  it("stops at the first impossible stage and prepares nothing after it", () => {
    const result = composePipeline(
      document([
        { stage: "spec" },
        { stage: "implement" },
        { stage: "review-spec" },
      ]),
      state(),
      THREAD,
      null,
    );

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.errors[0]).toContain('Stage "implement"');
  });

  it("admits a strict-plan implementation stage after an existing strict plan", () => {
    expect(
      ids(compose([{ stage: "implement-plan" }], state({ plan: "strict" }))),
    ).toEqual(["implement-plan"]);
  });

  it("admits a strict-plan implementation stage after a selected plan-strict", () => {
    expect(
      ids(
        compose(
          [{ stage: "plan-strict" }, { stage: "implement-plan-with-subagents" }],
          state({ spec: true }),
        ),
      ),
    ).toEqual(["plan-strict", "implement-plan-with-subagents"]);
  });
});

describe("composePipeline — resolved targets (AC-4.6, AC-4.8)", () => {
  it("targets plan-brief at the spec promised by a preceding selected stage", () => {
    const prepared = compose([{ stage: "spec" }, { stage: "plan-brief" }], state());

    expect(prepared.map((entry) => entry.target)).toEqual([
      `${THREAD}/`,
      `${THREAD}/spec.md`,
    ]);
  });

  it("targets plan-brief at the spec already present in the thread", () => {
    const prepared = compose([{ stage: "plan-brief" }], state({ spec: true }));

    expect(prepared[0]?.target).toBe(`${THREAD}/spec.md`);
  });

  it("targets plan-brief at the thread root when no spec exists or is promised", () => {
    const prepared = compose([{ stage: "plan-brief" }], state());

    expect(prepared[0]?.target).toBe(`${THREAD}/`);
  });

  it("resolves every other catalog target from its fixed rule", () => {
    const prepared = compose(
      [{ stage: "plan-strict" }, { stage: "implement-plan" }],
      state({ spec: true }),
    );

    expect(prepared.map((entry) => entry.target)).toEqual([
      `${THREAD}/spec.md`,
      `${THREAD}/plan.md`,
    ]);
  });

  it("admits plan-brief over a strict plan and carries its instructions verbatim", () => {
    const instructions = "Replacement authorized: discard the strict plan-tasks.";
    const prepared = compose(
      [{ stage: "plan-brief" }],
      state({ spec: true, plan: "strict" }),
      null,
    );
    const authorized = compose(
      [{ stage: "plan-brief", instructions }],
      state({ spec: true, plan: "strict" }),
    );

    expect(ids(prepared)).toEqual(["plan-brief"]);
    expect(prepared[0]).not.toHaveProperty("instructions");
    // The CLI never reads the authorization: the two compositions differ only by
    // the opaque text they carry.
    expect(authorized[0]?.instructions).toBe(instructions);
    expect(authorized[0]?.stage).toEqual(prepared[0]?.stage);
    expect(authorized[0]?.target).toBe(prepared[0]?.target);
  });

  it("attaches the trusted catalog definition rather than a copy the document could shape", () => {
    const prepared = compose([{ stage: "review-spec" }], state({ spec: true }));

    expect(prepared[0]?.stage).toMatchObject({
      id: "review-spec",
      skill: "review-spec",
      queueResolution: "rerun",
      gitPolicy: {
        headMayChange: false,
        allowedChanges: [],
        changeRequired: false,
        commitSubjectTemplate: null,
      },
    });
  });
});
