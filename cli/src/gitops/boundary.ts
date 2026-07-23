import { resolveSelector } from "../recipe/targets.js";
import type { GitPolicy } from "../recipe/types.js";
import { runGit } from "./git.js";

/**
 * The literal placeholder a commit-subject template carries for the thread
 * folder name. The engine substitutes it with the caller-supplied folder name;
 * it never derives, parses, or branches on recipe/stage/skill identity.
 */
const THREAD_FOLDER_TOKEN = "<thread-folder>";

/**
 * The verdict of evaluating a finalized boundary against a declarative policy.
 * A pass carries the validated observed paths to stage; a failure names the
 * offending rule or paths.
 */
export type BoundaryEvaluation =
  | { ok: true; changedPaths: string[] }
  | { ok: false; kind: "git-policy-violation"; message: string };

/**
 * The result of finalizing a passing boundary: a committed diff with its exact
 * subject, a commit-free advance, or a commit error carrying diagnostics.
 */
export type FinalizeResult =
  | { kind: "committed"; subject: string }
  | { kind: "advanced-without-commit" }
  | { kind: "commit-error"; message: string };

/**
 * Options governing the two attempt-versus-resume differences in boundary
 * evaluation. Defaults model a normal harness attempt.
 */
export type EvaluateBoundaryOptions = {
  /**
   * Whether the `headMayChange: false` rule is enforced. `true` (default) on a
   * normal attempt; `false` on boundary-finalization resume, where `HEAD`
   * movement across the pause belongs to the user and is diagnostic only.
   */
  enforceHead?: boolean;
  /**
   * Whether a `changeRequired` policy is satisfied by an empty worktree. `false`
   * (default) on a normal attempt; `true` on resume, so a user who deliberately
   * committed the intended diff satisfies the boundary with a clean worktree.
   */
  allowRequiredChangeToBeAlreadyCommitted?: boolean;
};

type ResolvedSelector = { kind: "exact-file" | "subtree"; path: string };

/**
 * Whether `observedPath` falls within `selector`: exact-file equality, or the
 * subtree prefix followed by a `/` boundary.
 */
function selectorMatches(
  selector: ResolvedSelector,
  observedPath: string,
): boolean {
  if (selector.kind === "exact-file") {
    return observedPath === selector.path;
  }
  return (
    observedPath === selector.path ||
    observedPath.startsWith(`${selector.path}/`)
  );
}

/**
 * Evaluate a finalized boundary against a declarative Git policy, returning the
 * validated changed paths or a typed `git-policy-violation`. Three independent
 * rules are checked: the `HEAD` rule (judged attempt-start → boundary only,
 * when enforced), path selectors bounding the observed changes, and the
 * change-required rule. The engine reads only policy data and paths — never
 * recipe, stage, or skill names.
 */
export function evaluateBoundary(
  policy: GitPolicy,
  threadRelPath: string,
  observedPaths: string[],
  headAtStart: string,
  headAtBoundary: string,
  options: EvaluateBoundaryOptions = {},
): BoundaryEvaluation {
  const enforceHead = options.enforceHead ?? true;
  const allowRequiredChangeToBeAlreadyCommitted =
    options.allowRequiredChangeToBeAlreadyCommitted ?? false;

  if (
    enforceHead &&
    !policy.headMayChange &&
    headAtStart !== headAtBoundary
  ) {
    return {
      ok: false,
      kind: "git-policy-violation",
      message: `HEAD moved during the attempt (${headAtStart} → ${headAtBoundary}) but this stage forbids HEAD movement`,
    };
  }

  const resolved: ResolvedSelector[] = [];
  for (const selector of policy.allowedChanges) {
    const result = resolveSelector(selector, threadRelPath);
    if (!result.ok) {
      return {
        ok: false,
        kind: "git-policy-violation",
        message: `unresolvable allowed-change selector: ${result.error}`,
      };
    }
    resolved[resolved.length] = result.selector;
  }

  if (resolved.length === 0 && observedPaths.length > 0) {
    return {
      ok: false,
      kind: "git-policy-violation",
      message: `stage requires a clean boundary but observed changes: ${observedPaths.join(", ")}`,
    };
  }

  const outOfBounds = observedPaths.filter(
    (observedPath) =>
      !resolved.some((selector) => selectorMatches(selector, observedPath)),
  );
  if (outOfBounds.length > 0) {
    return {
      ok: false,
      kind: "git-policy-violation",
      message: `observed changes outside the stage's allowed selectors: ${outOfBounds.join(", ")}`,
    };
  }

  if (
    policy.changeRequired &&
    observedPaths.length === 0 &&
    !allowRequiredChangeToBeAlreadyCommitted
  ) {
    return {
      ok: false,
      kind: "git-policy-violation",
      message: "stage requires at least one allowed change but the boundary is empty",
    };
  }

  return { ok: true, changedPaths: [...observedPaths] };
}

/**
 * Read the staged path set of `repoRoot` via a NUL-delimited plumbing form so
 * filenames with whitespace, quotes, or newlines round-trip intact.
 */
async function stagedPaths(repoRoot: string): Promise<string[]> {
  const result = await runGit(repoRoot, [
    "diff",
    "--cached",
    "--name-only",
    "-z",
  ]);
  if (result.code !== 0) {
    throw new Error(
      `git diff --cached failed (code ${result.code}): ${result.stderr.trim()}`,
    );
  }
  return result.stdout.split("\0").filter((field) => field.length > 0);
}

/**
 * Finalize a passing boundary. An empty validated set or a `null`
 * commit-subject template advances without staging or committing — never an
 * empty commit. Otherwise the validated observed paths are staged, the staged
 * set is re-verified to equal the validated set, and the diff is committed with
 * the exact declared subject (the `<thread-folder>` placeholder replaced by the
 * full `threadFolder` name). The executor commits with hooks active and
 * touches only the current branch tip forward; a non-zero commit exit surfaces
 * as a `commit-error` carrying stderr.
 */
export async function finalizeBoundary(
  repoRoot: string,
  policy: GitPolicy,
  threadFolder: string,
  evaluation: { ok: true; changedPaths: string[] },
): Promise<FinalizeResult> {
  if (evaluation.changedPaths.length === 0) {
    return { kind: "advanced-without-commit" };
  }
  if (policy.commitSubjectTemplate === null) {
    return { kind: "advanced-without-commit" };
  }

  const subject = policy.commitSubjectTemplate.split(THREAD_FOLDER_TOKEN).join(
    threadFolder,
  );

  const validated = [...evaluation.changedPaths].sort();

  const addResult = await runGit(repoRoot, ["add", "--", ...validated]);
  if (addResult.code !== 0) {
    return {
      kind: "commit-error",
      message: `git add failed (code ${addResult.code}): ${addResult.stderr.trim()}`,
    };
  }

  const staged = (await stagedPaths(repoRoot)).sort();
  const stagedEqualsValidated =
    staged.length === validated.length &&
    staged.every((entry, index) => entry === validated[index]);
  if (!stagedEqualsValidated) {
    return {
      kind: "commit-error",
      message: `staged set does not equal the validated set — validated: [${validated.join(", ")}]; staged: [${staged.join(", ")}]`,
    };
  }

  const commitResult = await runGit(repoRoot, ["commit", "-m", subject]);
  if (commitResult.code !== 0) {
    return {
      kind: "commit-error",
      message: `git commit failed (code ${commitResult.code}): ${commitResult.stderr.trim() || commitResult.stdout.trim()}`,
    };
  }

  return { kind: "committed", subject };
}
