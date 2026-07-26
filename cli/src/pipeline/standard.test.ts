import { describe, expect, it } from "vitest";

import {
  builtInPipelines,
  knownStageIds,
  standardPipeline,
} from "./standard.js";
import type { QueueResolution } from "./types.js";

describe("standardPipeline — stage table (AC-6.1)", () => {
  it("has exactly six stages in the declared order", () => {
    expect(standardPipeline.name).toBe("standard");
    expect(standardPipeline.stages.map((s) => s.id)).toEqual([
      "spec",
      "reconcile-spec",
      "review-spec",
      "plan-strict",
      "reconcile-plan",
      "implement-plan-with-subagents",
    ]);
  });

  it("each stage's skill matches its id", () => {
    for (const stage of standardPipeline.stages) {
      expect(stage.skill).toBe(stage.id);
    }
  });

  it("declares the correct targets", () => {
    const byId = Object.fromEntries(standardPipeline.stages.map((s) => [s.id, s]));
    expect(byId.spec.target).toEqual({ kind: "thread-root" });
    expect(byId["reconcile-spec"].target).toEqual({
      kind: "thread-file",
      path: "spec.md",
    });
    expect(byId["review-spec"].target).toEqual({
      kind: "thread-file",
      path: "spec.md",
    });
    expect(byId["plan-strict"].target).toEqual({
      kind: "thread-file",
      path: "spec.md",
    });
    expect(byId["reconcile-plan"].target).toEqual({
      kind: "thread-file",
      path: "plan.md",
    });
    expect(byId["implement-plan-with-subagents"].target).toEqual({
      kind: "thread-file",
      path: "plan.md",
    });
  });

  it("declares the exact three-part Git policies incl. commit subjects (AC-12.3)", () => {
    const byId = Object.fromEntries(standardPipeline.stages.map((s) => [s.id, s]));

    expect(byId.spec.gitPolicy).toEqual({
      headMayChange: false,
      allowedChanges: [{ kind: "exact-file", threadRelativePath: "spec.md" }],
      changeRequired: true,
      commitSubjectTemplate: "docs(<thread-folder>): spec",
    });

    expect(byId["reconcile-spec"].gitPolicy).toEqual({
      headMayChange: false,
      allowedChanges: [{ kind: "exact-file", threadRelativePath: "spec.md" }],
      changeRequired: false,
      commitSubjectTemplate: "docs(<thread-folder>): reconcile spec",
    });

    expect(byId["review-spec"].gitPolicy).toEqual({
      headMayChange: false,
      allowedChanges: [],
      changeRequired: false,
      commitSubjectTemplate: null,
    });

    expect(byId["plan-strict"].gitPolicy).toEqual({
      headMayChange: false,
      allowedChanges: [
        { kind: "exact-file", threadRelativePath: "plan.md" },
        { kind: "subtree", threadRelativePath: "plan-tasks" },
      ],
      changeRequired: true,
      commitSubjectTemplate: "docs(<thread-folder>): plan",
    });

    expect(byId["reconcile-plan"].gitPolicy).toEqual({
      headMayChange: false,
      allowedChanges: [
        { kind: "exact-file", threadRelativePath: "plan.md" },
        { kind: "subtree", threadRelativePath: "plan-tasks" },
      ],
      changeRequired: false,
      commitSubjectTemplate: "docs(<thread-folder>): reconcile plan",
    });

    expect(byId["implement-plan-with-subagents"].gitPolicy).toEqual({
      headMayChange: true,
      allowedChanges: [
        { kind: "exact-file", threadRelativePath: "implementation-report.md" },
      ],
      changeRequired: true,
      commitSubjectTemplate: "docs(<thread-folder>): implementation report",
    });
  });

  it("declares the correct queue-resolution behaviors", () => {
    const expected: Record<string, QueueResolution> = {
      spec: "advance",
      "reconcile-spec": "rerun",
      "review-spec": "rerun",
      "plan-strict": "advance",
      "reconcile-plan": "rerun",
      "implement-plan-with-subagents": "rerun",
    };
    for (const stage of standardPipeline.stages) {
      expect(stage.queueResolution).toBe(expected[stage.id]);
    }
  });

  it("round-trips unchanged through JSON", () => {
    const clone = JSON.parse(JSON.stringify(standardPipeline));
    expect(clone).toEqual(standardPipeline);
  });
});

describe("builtInPipelines and knownStageIds", () => {
  it("contains only the standard pipeline", () => {
    expect(Object.keys(builtInPipelines)).toEqual(["standard"]);
    expect(builtInPipelines.standard).toBe(standardPipeline);
  });

  it("collects every stage id across pipelines", () => {
    const ids = knownStageIds(builtInPipelines);
    expect([...ids].sort()).toEqual(
      [
        "spec",
        "reconcile-spec",
        "review-spec",
        "plan-strict",
        "reconcile-plan",
        "implement-plan-with-subagents",
      ].sort(),
    );
  });

  it("unions ids across multiple pipelines", () => {
    const ids = knownStageIds({
      standard: standardPipeline,
      other: { name: "other", stages: [{ ...standardPipeline.stages[0], id: "custom" }] },
    });
    expect(ids.has("custom")).toBe(true);
    expect(ids.has("spec")).toBe(true);
  });
});
