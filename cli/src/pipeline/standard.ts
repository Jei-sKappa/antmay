import type { PathSelector, Pipeline } from "./types.js";

const specFile: PathSelector = { kind: "exact-file", threadRelativePath: "spec.md" };
const planFile: PathSelector = { kind: "exact-file", threadRelativePath: "plan.md" };
const planTasksSubtree: PathSelector = {
  kind: "subtree",
  threadRelativePath: "plan-tasks",
};
const implementationReportFile: PathSelector = {
  kind: "exact-file",
  threadRelativePath: "implementation-report.md",
};

/**
 * The built-in `standard` pipeline: it automates the automatable core of the
 * Standard recipe (`docs/recipes/standard.md`) as six stages in order, each
 * carrying its declarative target, three-part Git policy, and queue-resolution
 * behavior. Commit-subject templates carry the literal placeholder
 * `<thread-folder>`, resolved by the boundary engine.
 *
 * The pipeline is not a transcription of the recipe: it starts at an existing
 * thread, omits every step needing a human (discussion, finish, archival), and
 * runs `implement-plan-with-subagents` where the recipe's step 9 names
 * `implement-plan`.
 */
export const standardPipeline: Pipeline = {
  name: "standard",
  stages: [
    {
      id: "spec",
      skill: "spec",
      target: { kind: "thread-root" },
      gitPolicy: {
        headMayChange: false,
        allowedChanges: [specFile],
        changeRequired: true,
        commitSubjectTemplate: "docs(<thread-folder>): spec",
      },
      queueResolution: "advance",
    },
    {
      id: "reconcile-spec",
      skill: "reconcile-spec",
      target: { kind: "thread-file", path: "spec.md" },
      gitPolicy: {
        headMayChange: false,
        allowedChanges: [specFile],
        changeRequired: false,
        commitSubjectTemplate: "docs(<thread-folder>): reconcile spec",
      },
      queueResolution: "rerun",
    },
    {
      id: "review-spec",
      skill: "review-spec",
      target: { kind: "thread-file", path: "spec.md" },
      gitPolicy: {
        headMayChange: false,
        allowedChanges: [],
        changeRequired: false,
        commitSubjectTemplate: null,
      },
      queueResolution: "rerun",
    },
    {
      id: "plan-strict",
      skill: "plan-strict",
      target: { kind: "thread-file", path: "spec.md" },
      gitPolicy: {
        headMayChange: false,
        allowedChanges: [planFile, planTasksSubtree],
        changeRequired: true,
        commitSubjectTemplate: "docs(<thread-folder>): plan",
      },
      queueResolution: "advance",
    },
    {
      id: "reconcile-plan",
      skill: "reconcile-plan",
      target: { kind: "thread-file", path: "plan.md" },
      gitPolicy: {
        headMayChange: false,
        allowedChanges: [planFile, planTasksSubtree],
        changeRequired: false,
        commitSubjectTemplate: "docs(<thread-folder>): reconcile plan",
      },
      queueResolution: "rerun",
    },
    {
      id: "implement-plan-with-subagents",
      skill: "implement-plan-with-subagents",
      target: { kind: "thread-file", path: "plan.md" },
      gitPolicy: {
        headMayChange: true,
        allowedChanges: [implementationReportFile],
        changeRequired: true,
        commitSubjectTemplate: "docs(<thread-folder>): implementation report",
      },
      queueResolution: "rerun",
    },
  ],
};

/**
 * Every built-in pipeline keyed by name. V0 ships only `standard`.
 */
export const builtInPipelines: Record<string, Pipeline> = {
  standard: standardPipeline,
};

/**
 * The set of every stage ID across the supplied pipelines, for the settings
 * validator to reject stage overrides that target no installed pipeline.
 */
export function knownStageIds(
  pipelines: Record<string, Pipeline>,
): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const pipeline of Object.values(pipelines)) {
    for (const stage of pipeline.stages) {
      ids.add(stage.id);
    }
  }
  return ids;
}
