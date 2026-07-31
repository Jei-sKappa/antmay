import { resolveSelector } from "../pipeline/targets.js";
import type { GitPolicy } from "../pipeline/types.js";
import { runGit, splitNul } from "./git.js";
import { collectBoundaryStatus, readHead } from "./status.js";

/**
 * The literal placeholder a commit-subject template carries for the thread
 * folder name. The engine substitutes it with the caller-supplied folder name;
 * it never derives, parses, or branches on pipeline/stage/skill identity.
 */
const THREAD_FOLDER_TOKEN = "<thread-folder>";

/**
 * The interval one attempt is answerable for: the tip it was launched from and
 * the tip it left behind. A stage's `headMayChange` rule is judged across
 * exactly this pair, so movement an earlier attempt caused, or that a human
 * caused across a pause, can never be charged to it.
 */
export type AttemptInterval = {
  headAtStart: string;
  headAfterAttempt: string;
};

/**
 * Which boundary a finalization is. The context fixes the interval the `HEAD`
 * rule is judged across and whether an already committed change may satisfy
 * `changeRequired`.
 *
 * - `attempt` finalizes a boundary as soon as its attempt reported `DONE`.
 * - `after-contract-repair` finalizes a preserved `DONE` whose promised artifact
 *   state a human has since repaired, so this is the first and only judgement of
 *   that attempt's own `HEAD` rule.
 * - `boundary-retry` re-runs a boundary that was already judged under that rule,
 *   so the only movement left to see happened across the pause and belongs to
 *   the human who caused it.
 */
export type GitBoundaryContext =
  | { kind: "attempt"; attempt: AttemptInterval }
  | {
      kind: "after-contract-repair";
      attempt: AttemptInterval;
      pausedAtHead: string;
    }
  | { kind: "boundary-retry"; pausedAtHead: string };

/**
 * One complete finalization request: the repository and thread whose boundary is
 * observed, the stage's declarative Git policy, the thread folder name a commit
 * subject renders from, and the context this finalization is.
 */
export type GitBoundaryRequest = {
  repoRoot: string;
  threadRelPath: string;
  threadFolder: string;
  policy: GitPolicy;
  context: GitBoundaryContext;
};

/**
 * Whether the boundary produced the stage's declared commit, and its exact
 * subject. A clean boundary and a policy with no commit subject both finalize
 * without one.
 */
export type BoundaryCommit =
  | { kind: "committed"; subject: string }
  | { kind: "none" };

/**
 * `HEAD` movement between the tip a pause recorded and the tip this
 * finalization found. It belongs to whoever moved it while the run was stopped,
 * so it is carried as evidence and violates nothing.
 */
export type PausedHeadMovement = { pausedAtHead: string; observedHead: string };

/**
 * What every finalization observed, whatever it then decided: the boundary
 * status set it judged, the tip it left behind — the boundary commit's, when it
 * made one — and any movement across a pause.
 */
export type GitBoundaryObservation = {
  observedPaths: string[];
  headAfterFinalization: string;
  headMovedWhilePaused?: PausedHeadMovement;
};

/**
 * The verdict of one finalization: the boundary is finalized, the policy refused
 * it, or the declared commit could not be made. Every variant carries the same
 * observations, because the transition owner has to persist Git evidence on the
 * attempt or recovery it asked about either way.
 */
export type GitBoundaryResult =
  | (GitBoundaryObservation & { kind: "finalized"; commit: BoundaryCommit })
  | (GitBoundaryObservation & { kind: "git-policy-violation"; message: string })
  | (GitBoundaryObservation & { kind: "commit-error"; message: string });

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
 * The `headMayChange` rule, judged across the interval the context makes this
 * boundary answerable for. A retry judges none: that boundary was already
 * judged under the rule during the run.
 */
function headRuleViolation(
  policy: GitPolicy,
  context: GitBoundaryContext,
): string | null {
  if (policy.headMayChange || context.kind === "boundary-retry") return null;
  const { headAtStart, headAfterAttempt } = context.attempt;
  if (headAtStart === headAfterAttempt) return null;
  return `HEAD moved during the attempt (${headAtStart} → ${headAfterAttempt}) but this stage forbids HEAD movement`;
}

/** The movement between a pause's recorded tip and the current one, if any. */
async function pausedMovement(
  repoRoot: string,
  pausedAtHead: string,
): Promise<PausedHeadMovement | undefined> {
  const observedHead = await readHead(repoRoot);
  if (observedHead === pausedAtHead) return undefined;
  return { pausedAtHead, observedHead };
}

/**
 * The declarative policy applied to one observed boundary. Three independent
 * rules are checked: the `HEAD` rule for the interval this context owns, the
 * path selectors bounding the observed changes, and the change-required rule.
 * Returns the violation message, or `null` when the observed set is the
 * validated set. Reads only policy data and paths — never pipeline, stage, or
 * skill names.
 */
function policyViolation(
  policy: GitPolicy,
  threadRelPath: string,
  observedPaths: string[],
  context: GitBoundaryContext,
): string | null {
  const headMoved = headRuleViolation(policy, context);
  if (headMoved !== null) return headMoved;

  const resolved: ResolvedSelector[] = [];
  for (const selector of policy.allowedChanges) {
    const result = resolveSelector(selector, threadRelPath);
    if (!result.ok) {
      return `unresolvable allowed-change selector: ${result.error}`;
    }
    resolved[resolved.length] = result.selector;
  }

  if (resolved.length === 0 && observedPaths.length > 0) {
    return `stage requires a clean boundary but observed changes: ${observedPaths.join(", ")}`;
  }

  const outOfBounds = observedPaths.filter(
    (observedPath) =>
      !resolved.some((selector) => selectorMatches(selector, observedPath)),
  );
  if (outOfBounds.length > 0) {
    return `observed changes outside the stage's allowed selectors: ${outOfBounds.join(", ")}`;
  }

  // A recovery finalizes a boundary whose intended diff a human may already have
  // committed deliberately, so there an empty observation satisfies the rule.
  if (
    policy.changeRequired &&
    observedPaths.length === 0 &&
    context.kind === "attempt"
  ) {
    return "stage requires at least one allowed change but the boundary is empty";
  }

  return null;
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
  return splitNul(result.stdout);
}

/**
 * Stage and commit the validated set. An empty set or a `null` commit-subject
 * template commits nothing — never an empty commit. Otherwise the validated
 * paths are staged, the staged set is re-verified to equal them exactly, and the
 * diff is committed with the exact declared subject (the `<thread-folder>`
 * placeholder replaced by the full `threadFolder` name). The executor commits
 * with hooks active and touches only the current branch tip forward; a non-zero
 * commit exit surfaces as an error carrying stderr.
 */
async function commitValidated(
  repoRoot: string,
  policy: GitPolicy,
  threadFolder: string,
  validatedPaths: string[],
): Promise<BoundaryCommit | { kind: "error"; message: string }> {
  if (validatedPaths.length === 0 || policy.commitSubjectTemplate === null) {
    return { kind: "none" };
  }

  const subject = policy.commitSubjectTemplate
    .split(THREAD_FOLDER_TOKEN)
    .join(threadFolder);

  const validated = [...validatedPaths].sort();

  const addResult = await runGit(repoRoot, ["add", "--", ...validated]);
  if (addResult.code !== 0) {
    return {
      kind: "error",
      message: `git add failed (code ${addResult.code}): ${addResult.stderr.trim()}`,
    };
  }

  const staged = (await stagedPaths(repoRoot)).sort();
  const stagedEqualsValidated =
    staged.length === validated.length &&
    staged.every((entry, index) => entry === validated[index]);
  if (!stagedEqualsValidated) {
    return {
      kind: "error",
      message: `staged set does not equal the validated set — validated: [${validated.join(", ")}]; staged: [${staged.join(", ")}]`,
    };
  }

  const commitResult = await runGit(repoRoot, ["commit", "-m", subject]);
  if (commitResult.code !== 0) {
    return {
      kind: "error",
      message: `git commit failed (code ${commitResult.code}): ${commitResult.stderr.trim() || commitResult.stdout.trim()}`,
    };
  }

  return { kind: "committed", subject };
}

/**
 * Finalize one stage boundary: observe the tip and the complete staged,
 * unstaged, deleted, and untracked path set, apply the stage's Git policy to
 * them, stage exactly the validated paths, verify the staged set equals them,
 * make the declared commit when the policy configures one, and read the tip this
 * left behind.
 *
 * The whole Git protocol lives here, so a caller supplies the request and reads
 * the structured verdict. This module never persists a checkpoint, advances a
 * stage, resolves a queue, or renders prose: turning a result into a durable
 * transition and into what a reader sees belongs to the transition owner.
 */
export async function finalizeGitBoundary(
  request: GitBoundaryRequest,
): Promise<GitBoundaryResult> {
  const { repoRoot, threadRelPath, threadFolder, policy, context } = request;

  // A recovery measures the tip its pause recorded against the tip it finds, so
  // movement across the pause is reported as evidence rather than judged.
  const movement =
    context.kind === "attempt"
      ? undefined
      : await pausedMovement(repoRoot, context.pausedAtHead);

  const observedPaths = await collectBoundaryStatus(repoRoot);

  // The tip is read once the work is done, so every verdict reports where this
  // finalization left it — the boundary commit's tip when it made one.
  const observe = async (): Promise<GitBoundaryObservation> => ({
    observedPaths,
    headAfterFinalization: await readHead(repoRoot),
    ...(movement !== undefined ? { headMovedWhilePaused: movement } : {}),
  });

  const violation = policyViolation(
    policy,
    threadRelPath,
    observedPaths,
    context,
  );
  if (violation !== null) {
    return {
      kind: "git-policy-violation",
      message: violation,
      ...(await observe()),
    };
  }

  const commit = await commitValidated(
    repoRoot,
    policy,
    threadFolder,
    observedPaths,
  );
  if (commit.kind === "error") {
    return { kind: "commit-error", message: commit.message, ...(await observe()) };
  }

  return { kind: "finalized", commit, ...(await observe()) };
}
