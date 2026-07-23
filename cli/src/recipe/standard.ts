import type { PathSelector, Recipe } from "./types.js";

const specFile: PathSelector = { kind: "exact-file", threadRelativePath: "spec.md" };
const planFile: PathSelector = { kind: "exact-file", threadRelativePath: "plan.md" };
const planTasksSubtree: PathSelector = {
  kind: "subtree",
  threadRelativePath: "plan-tasks",
};

/**
 * The built-in `standard` recipe: the six Modular Agentic Workflow stages in
 * order, each carrying its declarative target, three-part Git policy, and
 * queue-resolution behavior. Commit-subject templates carry the literal
 * placeholder `<thread-folder>`, resolved by the boundary engine.
 */
export const standardRecipe: Recipe = {
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
        allowedChanges: [],
        changeRequired: false,
        commitSubjectTemplate: null,
      },
      queueResolution: "rerun",
    },
  ],
};

/**
 * Every built-in recipe keyed by name. V0 ships only `standard`.
 */
export const builtInRecipes: Record<string, Recipe> = {
  standard: standardRecipe,
};

/**
 * The set of every stage ID across the supplied recipes, for the settings
 * validator to reject stage overrides that target no installed recipe.
 */
export function knownStageIds(
  recipes: Record<string, Recipe>,
): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const recipe of Object.values(recipes)) {
    for (const stage of recipe.stages) {
      ids.add(stage.id);
    }
  }
  return ids;
}
