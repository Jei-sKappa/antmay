import { describe, expect, it } from "vitest";

import {
  builtInRecipes,
  knownStageIds,
  standardRecipe,
} from "./standard.js";
import type { QueueResolution } from "./types.js";

describe("standardRecipe — stage table (AC-6.1)", () => {
  it("has exactly six stages in the declared order", () => {
    expect(standardRecipe.name).toBe("standard");
    expect(standardRecipe.stages.map((s) => s.id)).toEqual([
      "spec",
      "reconcile-spec",
      "review-spec",
      "plan-strict",
      "reconcile-plan",
      "implement-plan-with-subagents",
    ]);
  });

  it("each stage's skill matches its id", () => {
    for (const stage of standardRecipe.stages) {
      expect(stage.skill).toBe(stage.id);
    }
  });

  it("declares the correct targets", () => {
    const byId = Object.fromEntries(standardRecipe.stages.map((s) => [s.id, s]));
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
    const byId = Object.fromEntries(standardRecipe.stages.map((s) => [s.id, s]));

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
      allowedChanges: [],
      changeRequired: false,
      commitSubjectTemplate: null,
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
    for (const stage of standardRecipe.stages) {
      expect(stage.queueResolution).toBe(expected[stage.id]);
    }
  });

  it("round-trips unchanged through JSON", () => {
    const clone = JSON.parse(JSON.stringify(standardRecipe));
    expect(clone).toEqual(standardRecipe);
  });
});

describe("builtInRecipes and knownStageIds", () => {
  it("contains only the standard recipe", () => {
    expect(Object.keys(builtInRecipes)).toEqual(["standard"]);
    expect(builtInRecipes.standard).toBe(standardRecipe);
  });

  it("collects every stage id across recipes", () => {
    const ids = knownStageIds(builtInRecipes);
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

  it("unions ids across multiple recipes", () => {
    const ids = knownStageIds({
      standard: standardRecipe,
      other: { name: "other", stages: [{ ...standardRecipe.stages[0], id: "custom" }] },
    });
    expect(ids.has("custom")).toBe(true);
    expect(ids.has("spec")).toBe(true);
  });
});
