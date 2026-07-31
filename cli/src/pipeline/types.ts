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
