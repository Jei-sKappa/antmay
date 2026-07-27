import type { HarnessId } from "../config/settings.js";

/**
 * A declarative stage target. Either the thread root itself, or a single file
 * addressed by a thread-relative path. Targets are plain JSON so a descriptor
 * can be snapshotted into the checkpoint verbatim.
 */
export type StageTarget =
  | { kind: "thread-root" }
  | { kind: "thread-file"; path: string };

/**
 * The identifier of one trusted catalog stage. The catalog is closed: a pipeline
 * document may select and order these entries but may not define new ones.
 */
export type CatalogStageId =
  | "spec"
  | "reconcile-spec"
  | "review-spec"
  | "plan-brief"
  | "plan-strict"
  | "reconcile-plan"
  | "implement"
  | "implement-plan"
  | "implement-plan-with-subagents";

/**
 * The bounded structural shape of a thread's plan artifact:
 *
 * - `absent` — neither `plan.md` nor `plan-tasks/` exists;
 * - `brief` — `plan.md` is a non-empty regular file and `plan-tasks/` is absent;
 * - `strict` — `plan.md` is a non-empty regular file and `plan-tasks/` is a
 *   directory holding at least one non-empty regular Markdown task file;
 * - `malformed` — every other observable combination, including an inspection
 *   failure.
 */
export type PlanState = "absent" | "brief" | "strict" | "malformed";

/**
 * The canonical artifact state of one thread. Every dimension is a bounded
 * structural fact: presence means a non-empty regular file, and plan state is
 * the topology above. No dimension expresses whether an artifact's content is
 * semantically adequate — that judgment belongs to the invoked skill.
 */
export type ArtifactState = {
  validThread: boolean;
  proposal: boolean;
  spec: boolean;
  plan: PlanState;
  implementationReport: boolean;
};

/**
 * A declarative, serializable pattern over the artifact state: each named
 * dimension must equal the given value, and every omitted dimension is
 * unconstrained.
 */
export type PartialArtifactState = {
  validThread?: boolean;
  proposal?: boolean;
  spec?: boolean;
  plan?: PlanState;
  implementationReport?: boolean;
};

/**
 * The artifact state a catalog stage requires before it may be invoked. Checked
 * against the simulated state during composition and against fresh concrete
 * state immediately before every attempt.
 */
export type ArtifactPrerequisite = PartialArtifactState;

/**
 * The artifact state a catalog stage promises after a recognized `DONE`. Applied
 * to the simulated state during composition — leaving every dimension it does
 * not name untouched — and verified against fresh concrete state before the
 * stage boundary is applied.
 */
export type ArtifactTransition = PartialArtifactState;

/**
 * A declarative rule producing a stage's target from the artifact state.
 * `fixed` always yields the same target; `when-spec-present` yields
 * `whenPresent` when the state has a spec and `otherwise` when it does not.
 */
export type StageTargetRule =
  | { kind: "fixed"; target: StageTarget }
  | {
      kind: "when-spec-present";
      whenPresent: StageTarget;
      otherwise: StageTarget;
    };

/**
 * A declarative path selector used by the Git-boundary engine to describe which
 * post-DONE changes a stage permits. `exact-file` matches a single file;
 * `subtree` matches a directory and all its descendants. Both carry a
 * thread-relative path.
 */
export type PathSelector = {
  kind: "exact-file" | "subtree";
  threadRelativePath: string;
};

/**
 * A stage's declarative Git policy with three independent parts:
 *
 * - `headMayChange` — whether `HEAD` may move during a harness attempt;
 * - `allowedChanges` — the selectors bounding permitted post-DONE changes; an
 *   empty array means the post-DONE boundary must be clean;
 * - `changeRequired` — whether at least one allowed change must be present;
 * - `commitSubjectTemplate` — the exact executor commit subject, containing the
 *   literal placeholder `<thread-folder>`, or `null` for no executor commit.
 */
export type GitPolicy = {
  headMayChange: boolean;
  allowedChanges: PathSelector[];
  changeRequired: boolean;
  commitSubjectTemplate: string | null;
};

/**
 * How a stage resumes after a `pending-queues` pause that followed its DONE
 * finalization: `advance` moves to the next stage, `rerun` re-enters the same
 * stage.
 */
export type QueueResolution = "advance" | "rerun";

/**
 * One ordered entry of a pipeline document: the catalog stage it selects, plus
 * the optional portable instructions the author attached to that selection.
 *
 * An entry is a selection, never a definition: it carries no target, Git,
 * queue, prerequisite, output, agent, or timing field, and its instructions are
 * opaque text the CLI never interprets.
 */
export type PipelineStageEntry = {
  stage: CatalogStageId;
  instructions?: string;
};

/**
 * A validated pipeline document.
 *
 * `name` is the identity the document declares for display, and `sourcePath` is
 * the absolute source it was read from. The two are deliberately independent:
 * moving or renaming the file changes the provenance and not the identity.
 */
export type PipelineDocument = {
  name: string;
  sourcePath: string;
  stages: PipelineStageEntry[];
};

/**
 * One serializable stage descriptor consumed by the generic runner. Carries no
 * functions so the checkpoint can persist it verbatim.
 */
export type StageDescriptor = {
  id: string;
  skill: string;
  target: StageTarget;
  gitPolicy: GitPolicy;
  queueResolution: QueueResolution;
};

/**
 * An ordered array of stage descriptors under a stable name.
 */
export type Pipeline = {
  name: string;
  stages: StageDescriptor[];
};

/**
 * A fully resolved per-stage execution profile: the harness to drive, the model
 * to request, the opaque profile prompt appended after the stage trigger, the
 * idle timeout in seconds, and how often a live attempt reports that it is still
 * working.
 */
export type StageProfile = {
  harness: HarnessId;
  model: string;
  prompt: string;
  idleTimeoutSeconds: number;
  heartbeatSeconds: number;
};
