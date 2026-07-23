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
export type Recipe = {
  name: string;
  stages: StageDescriptor[];
};

/**
 * A fully resolved per-stage execution profile: the harness to drive, the model
 * to request, the opaque profile prompt appended after the stage trigger, and
 * the idle timeout in seconds.
 */
export type StageProfile = {
  harness: HarnessId;
  model: string;
  prompt: string;
  idleTimeoutSeconds: number;
};
