import { describe, expect, it } from "vitest";

import { renderStagePrompt } from "../harness/prompt.js";
import { CATALOG_STAGE_IDS, STAGE_CATALOG, isCatalogStageId } from "./catalog.js";
import type { CatalogStage } from "./catalog.js";
import type {
  ArtifactPrerequisite,
  ArtifactTransition,
  GitPolicy,
  PathSelector,
  QueueResolution,
  StageTargetRule,
} from "./types.js";

const specFile: PathSelector = { kind: "exact-file", threadRelativePath: "spec.md" };
const planFile: PathSelector = { kind: "exact-file", threadRelativePath: "plan.md" };
const planTasks: PathSelector = { kind: "subtree", threadRelativePath: "plan-tasks" };
const reportFile: PathSelector = {
  kind: "exact-file",
  threadRelativePath: "implementation-report.md",
};

const specTargetRule: StageTargetRule = {
  kind: "fixed",
  target: { kind: "thread-file", path: "spec.md" },
};
const planTargetRule: StageTargetRule = {
  kind: "fixed",
  target: { kind: "thread-file", path: "plan.md" },
};
const implementationPolicy: GitPolicy = {
  headMayChange: true,
  allowedChanges: [reportFile],
  changeRequired: true,
  commitSubjectTemplate: "docs(<thread-folder>): implementation report",
};

describe("STAGE_CATALOG — release stage set (AC-2.2)", () => {
  it("exports exactly the nine catalog stages in order", () => {
    expect(CATALOG_STAGE_IDS).toEqual([
      "spec",
      "reconcile-spec",
      "review-spec",
      "plan-brief",
      "plan-strict",
      "reconcile-plan",
      "implement",
      "implement-plan",
      "implement-plan-with-subagents",
    ]);
    expect(Object.keys(STAGE_CATALOG)).toEqual([...CATALOG_STAGE_IDS]);
  });

  it("contains no proposal or Roadmap stage", () => {
    for (const deferred of [
      "propose",
      "reconcile-proposal",
      "roadmap",
      "reconcile-roadmap",
      "review-roadmap",
    ]) {
      expect(isCatalogStageId(deferred)).toBe(false);
      expect(Object.hasOwn(STAGE_CATALOG, deferred)).toBe(false);
    }
  });

  it("recognizes every catalog id and rejects unknown strings", () => {
    for (const id of CATALOG_STAGE_IDS) {
      expect(isCatalogStageId(id)).toBe(true);
    }
    expect(isCatalogStageId("")).toBe(false);
    expect(isCatalogStageId("Spec")).toBe(false);
    expect(isCatalogStageId("toString")).toBe(false);
  });

  it("keys every entry by its own id and drives its trigger from its skill", () => {
    for (const id of CATALOG_STAGE_IDS) {
      const stage = STAGE_CATALOG[id];
      expect(stage.id).toBe(id);
      // The catalog owns the base trigger data: the skill name the harness
      // trigger is rendered from.
      expect(stage.skill).toBe(id);
      expect(renderStagePrompt("codex", stage.skill, "docs/threads/t/spec.md", "")).toBe(
        `$${id} \`docs/threads/t/spec.md\`.`,
      );
      expect(
        renderStagePrompt("claude-code", stage.skill, "docs/threads/t/spec.md", ""),
      ).toBe(`/${id} \`docs/threads/t/spec.md\`.`);
    }
  });
});

describe("STAGE_CATALOG — target rules (AC-2.3)", () => {
  it("fixes every target except plan-brief", () => {
    expect(STAGE_CATALOG.spec.targetRule).toEqual({
      kind: "fixed",
      target: { kind: "thread-root" },
    });
    expect(STAGE_CATALOG["reconcile-spec"].targetRule).toEqual(specTargetRule);
    expect(STAGE_CATALOG["review-spec"].targetRule).toEqual(specTargetRule);
    expect(STAGE_CATALOG["plan-strict"].targetRule).toEqual(specTargetRule);
    expect(STAGE_CATALOG["reconcile-plan"].targetRule).toEqual(planTargetRule);
    expect(STAGE_CATALOG.implement.targetRule).toEqual(planTargetRule);
    expect(STAGE_CATALOG["implement-plan"].targetRule).toEqual(planTargetRule);
    expect(STAGE_CATALOG["implement-plan-with-subagents"].targetRule).toEqual(
      planTargetRule,
    );
  });

  it("makes plan-brief state-sensitive on spec presence", () => {
    expect(STAGE_CATALOG["plan-brief"].targetRule).toEqual({
      kind: "when-spec-present",
      whenPresent: { kind: "thread-file", path: "spec.md" },
      otherwise: { kind: "thread-root" },
    });
  });
});

describe("STAGE_CATALOG — artifact contracts (AC-2.3)", () => {
  it("declares the canonical prerequisite of every stage", () => {
    const expected: Record<string, ArtifactPrerequisite> = {
      spec: { validThread: true },
      "reconcile-spec": { validThread: true, spec: true },
      "review-spec": { validThread: true, spec: true },
      "plan-brief": { validThread: true },
      "plan-strict": { validThread: true, spec: true },
      "reconcile-plan": { validThread: true, spec: true, plan: "strict" },
      implement: { validThread: true, plan: "brief" },
      "implement-plan": { validThread: true, plan: "strict" },
      "implement-plan-with-subagents": { validThread: true, plan: "strict" },
    };
    for (const id of CATALOG_STAGE_IDS) {
      expect(STAGE_CATALOG[id].prerequisite).toEqual(expected[id]);
    }
  });

  it("requires no proposal and no implementation report anywhere", () => {
    for (const id of CATALOG_STAGE_IDS) {
      expect(STAGE_CATALOG[id].prerequisite.proposal).toBeUndefined();
      expect(STAGE_CATALOG[id].prerequisite.implementationReport).toBeUndefined();
    }
  });

  it("declares the promised transition of every stage", () => {
    const expected: Record<string, ArtifactTransition> = {
      spec: { spec: true },
      "reconcile-spec": { spec: true },
      "review-spec": { spec: true },
      "plan-brief": { plan: "brief" },
      "plan-strict": { plan: "strict" },
      "reconcile-plan": { plan: "strict" },
      implement: { implementationReport: true },
      "implement-plan": { implementationReport: true },
      "implement-plan-with-subagents": { implementationReport: true },
    };
    for (const id of CATALOG_STAGE_IDS) {
      expect(STAGE_CATALOG[id].promises).toEqual(expected[id]);
    }
  });

  it("keeps the two plan variants distinguishable in both directions", () => {
    expect(STAGE_CATALOG["plan-brief"].promises).toEqual({ plan: "brief" });
    expect(STAGE_CATALOG["plan-strict"].promises).toEqual({ plan: "strict" });
    expect(STAGE_CATALOG.implement.prerequisite.plan).toBe("brief");
    expect(STAGE_CATALOG["implement-plan"].prerequisite.plan).toBe("strict");
    // plan-brief tolerates any starting plan shape: it constrains no plan state.
    expect(STAGE_CATALOG["plan-brief"].prerequisite.plan).toBeUndefined();
  });
});

describe("STAGE_CATALOG — Git policies (AC-2.3)", () => {
  it("declares the exact three-part Git policy of every stage", () => {
    const expected: Record<string, GitPolicy> = {
      spec: {
        headMayChange: false,
        allowedChanges: [specFile],
        changeRequired: true,
        commitSubjectTemplate: "docs(<thread-folder>): spec",
      },
      "reconcile-spec": {
        headMayChange: false,
        allowedChanges: [specFile],
        changeRequired: false,
        commitSubjectTemplate: "docs(<thread-folder>): reconcile spec",
      },
      "review-spec": {
        headMayChange: false,
        allowedChanges: [],
        changeRequired: false,
        commitSubjectTemplate: null,
      },
      "plan-brief": {
        headMayChange: false,
        allowedChanges: [planFile, planTasks],
        changeRequired: true,
        commitSubjectTemplate: "docs(<thread-folder>): plan",
      },
      "plan-strict": {
        headMayChange: false,
        allowedChanges: [planFile, planTasks],
        changeRequired: true,
        commitSubjectTemplate: "docs(<thread-folder>): plan",
      },
      "reconcile-plan": {
        headMayChange: false,
        allowedChanges: [planFile, planTasks],
        changeRequired: false,
        commitSubjectTemplate: "docs(<thread-folder>): reconcile plan",
      },
      implement: implementationPolicy,
      "implement-plan": implementationPolicy,
      "implement-plan-with-subagents": implementationPolicy,
    };
    for (const id of CATALOG_STAGE_IDS) {
      expect(STAGE_CATALOG[id].gitPolicy).toEqual(expected[id]);
    }
  });

  it("lets plan-brief delete obsolete strict-plan tasks through the subtree selector", () => {
    expect(STAGE_CATALOG["plan-brief"].gitPolicy.allowedChanges).toContainEqual(
      planTasks,
    );
  });

  it("moves HEAD only for the three implementation stages", () => {
    const moving = CATALOG_STAGE_IDS.filter(
      (id) => STAGE_CATALOG[id].gitPolicy.headMayChange,
    );
    expect(moving).toEqual([
      "implement",
      "implement-plan",
      "implement-plan-with-subagents",
    ]);
  });

  it("bounds every allowed change to a known thread artifact", () => {
    const allowed = new Set(["spec.md", "plan.md", "plan-tasks", "implementation-report.md"]);
    for (const id of CATALOG_STAGE_IDS) {
      for (const selector of STAGE_CATALOG[id].gitPolicy.allowedChanges) {
        expect(allowed.has(selector.threadRelativePath)).toBe(true);
      }
    }
  });
});

describe("STAGE_CATALOG — queue resolution (AC-2.3)", () => {
  it("declares the queue resolution of every stage", () => {
    const expected: Record<string, QueueResolution> = {
      spec: "advance",
      "reconcile-spec": "rerun",
      "review-spec": "rerun",
      "plan-brief": "advance",
      "plan-strict": "advance",
      "reconcile-plan": "rerun",
      implement: "rerun",
      "implement-plan": "rerun",
      "implement-plan-with-subagents": "rerun",
    };
    for (const id of CATALOG_STAGE_IDS) {
      expect(STAGE_CATALOG[id].queueResolution).toBe(expected[id]);
    }
  });
});

describe("STAGE_CATALOG — serializability (AC-3.4, DR5)", () => {
  it("round-trips unchanged through JSON", () => {
    const clone = JSON.parse(JSON.stringify(STAGE_CATALOG));
    expect(clone).toEqual(STAGE_CATALOG);
  });

  it("holds no executable value anywhere in a definition", () => {
    const seen: unknown[] = [];
    const walk = (value: unknown): void => {
      expect(typeof value).not.toBe("function");
      if (value !== null && typeof value === "object") {
        seen.push(value);
        for (const nested of Object.values(value)) {
          walk(nested);
        }
      }
    };
    walk(STAGE_CATALOG);
    expect(seen.length).toBeGreaterThan(0);
  });

  it("keeps every stage's own shape complete after a round-trip", () => {
    const clone: Record<string, CatalogStage> = JSON.parse(
      JSON.stringify(STAGE_CATALOG),
    );
    for (const id of CATALOG_STAGE_IDS) {
      expect(Object.keys(clone[id]).sort()).toEqual([
        "gitPolicy",
        "id",
        "prerequisite",
        "promises",
        "queueResolution",
        "skill",
        "targetRule",
      ]);
    }
  });
});
