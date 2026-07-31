import type {
  ArtifactPrerequisite,
  ArtifactTransition,
} from "../thread/artifacts.js";
import type {
  CatalogStageId,
  GitPolicy,
  PathSelector,
  QueueResolution,
  StageTargetRule,
} from "./types.js";

/**
 * One trusted catalog entry: the unattended adapter around a single
 * completion-oriented Antmay skill. It owns the skill name the harness trigger
 * is rendered from, the declarative target rule, the artifact prerequisite and
 * promised transition, the bounded Git policy, and the queue resolution.
 *
 * A catalog stage is plain JSON: it holds no functions, so a checkpoint can
 * persist it verbatim and a resume can reload it without re-deriving behavior.
 * Pipeline documents select and order these entries; they never copy or widen
 * any field.
 */
export type CatalogStage = {
  id: CatalogStageId;
  skill: string;
  targetRule: StageTargetRule;
  prerequisite: ArtifactPrerequisite;
  promises: ArtifactTransition;
  gitPolicy: GitPolicy;
  queueResolution: QueueResolution;
};

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

const specTarget: StageTargetRule = {
  kind: "fixed",
  target: { kind: "thread-file", path: "spec.md" },
};
const planTarget: StageTargetRule = {
  kind: "fixed",
  target: { kind: "thread-file", path: "plan.md" },
};

/**
 * The Git and queue policy shared by the three implementation stages: the skill
 * makes its own per-task code commits, so `HEAD` moves during the attempt, and
 * the uncommitted `implementation-report.md` is the only tracked change left for
 * the executor boundary.
 */
const implementationPolicy: GitPolicy = {
  headMayChange: true,
  allowedChanges: [implementationReportFile],
  changeRequired: true,
  commitSubjectTemplate: "docs(<thread-folder>): implementation report",
};

/**
 * The prerequisite and promise shared by the two strict-plan implementation
 * stages.
 */
const strictPlanImplementation: Omit<CatalogStage, "id" | "skill"> = {
  targetRule: planTarget,
  prerequisite: { validThread: true, plan: "strict" },
  promises: { implementationReport: true },
  gitPolicy: implementationPolicy,
  queueResolution: "rerun",
};

/**
 * The trusted stage catalog: every stage the executor can run unattended, keyed
 * by its stage ID. The release set is these nine stages; the proposal and
 * Roadmap capabilities are not catalog stages.
 *
 * Each entry fixes safety-critical behavior a user document cannot override:
 * where the skill is pointed, what artifact state it needs, what artifact state
 * it must leave behind, how far its tracked changes may reach, and how it
 * resumes after a pending-queue pause.
 */
export const STAGE_CATALOG: Readonly<Record<CatalogStageId, CatalogStage>> = {
  spec: {
    id: "spec",
    skill: "spec",
    targetRule: { kind: "fixed", target: { kind: "thread-root" } },
    prerequisite: { validThread: true },
    promises: { spec: true },
    gitPolicy: {
      headMayChange: false,
      allowedChanges: [specFile],
      changeRequired: true,
      commitSubjectTemplate: "docs(<thread-folder>): spec",
    },
    queueResolution: "advance",
  },
  "reconcile-spec": {
    id: "reconcile-spec",
    skill: "reconcile-spec",
    targetRule: specTarget,
    prerequisite: { validThread: true, spec: true },
    promises: { spec: true },
    gitPolicy: {
      headMayChange: false,
      allowedChanges: [specFile],
      changeRequired: false,
      commitSubjectTemplate: "docs(<thread-folder>): reconcile spec",
    },
    queueResolution: "rerun",
  },
  "review-spec": {
    id: "review-spec",
    skill: "review-spec",
    targetRule: specTarget,
    prerequisite: { validThread: true, spec: true },
    promises: { spec: true },
    gitPolicy: {
      headMayChange: false,
      allowedChanges: [],
      changeRequired: false,
      commitSubjectTemplate: null,
    },
    queueResolution: "rerun",
  },
  "plan-brief": {
    id: "plan-brief",
    skill: "plan-brief",
    // The one state-sensitive target in the catalog: a spec already present in
    // the thread or promised by an earlier selected stage is the more precise
    // input, so `spec → plan-brief` hands the planner `spec.md`.
    targetRule: {
      kind: "when-spec-present",
      whenPresent: { kind: "thread-file", path: "spec.md" },
      otherwise: { kind: "thread-root" },
    },
    prerequisite: { validThread: true },
    promises: { plan: "brief" },
    gitPolicy: {
      headMayChange: false,
      // The `plan-tasks/` subtree is allowed so the skill may delete obsolete
      // strict-plan tasks once it has accepted explicit replacement
      // authorization from the stage instructions.
      allowedChanges: [planFile, planTasksSubtree],
      changeRequired: true,
      commitSubjectTemplate: "docs(<thread-folder>): plan",
    },
    queueResolution: "advance",
  },
  "plan-strict": {
    id: "plan-strict",
    skill: "plan-strict",
    targetRule: specTarget,
    prerequisite: { validThread: true, spec: true },
    promises: { plan: "strict" },
    gitPolicy: {
      headMayChange: false,
      allowedChanges: [planFile, planTasksSubtree],
      changeRequired: true,
      commitSubjectTemplate: "docs(<thread-folder>): plan",
    },
    queueResolution: "advance",
  },
  "reconcile-plan": {
    id: "reconcile-plan",
    skill: "reconcile-plan",
    targetRule: planTarget,
    prerequisite: { validThread: true, spec: true, plan: "strict" },
    promises: { plan: "strict" },
    gitPolicy: {
      headMayChange: false,
      allowedChanges: [planFile, planTasksSubtree],
      changeRequired: false,
      commitSubjectTemplate: "docs(<thread-folder>): reconcile plan",
    },
    queueResolution: "rerun",
  },
  implement: {
    id: "implement",
    skill: "implement",
    targetRule: planTarget,
    prerequisite: { validThread: true, plan: "brief" },
    promises: { implementationReport: true },
    gitPolicy: implementationPolicy,
    queueResolution: "rerun",
  },
  "implement-plan": {
    id: "implement-plan",
    skill: "implement-plan",
    ...strictPlanImplementation,
  },
  "implement-plan-with-subagents": {
    id: "implement-plan-with-subagents",
    skill: "implement-plan-with-subagents",
    ...strictPlanImplementation,
  },
};

/**
 * Every catalog stage ID, in catalog order.
 */
export const CATALOG_STAGE_IDS: readonly CatalogStageId[] = Object.keys(
  STAGE_CATALOG,
) as CatalogStageId[];

/**
 * Whether `value` names a catalog stage. Narrows an untrusted string from a
 * pipeline, profile, or settings document to a `CatalogStageId`.
 */
export function isCatalogStageId(value: string): value is CatalogStageId {
  return Object.hasOwn(STAGE_CATALOG, value);
}
