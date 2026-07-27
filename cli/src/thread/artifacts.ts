import type { Dirent, Stats } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";

import type {
  ArtifactPrerequisite,
  ArtifactState,
  ArtifactTransition,
  PartialArtifactState,
  PlanState,
} from "../pipeline/types.js";

/**
 * The result of inspecting a thread's artifacts. A failure that prevents
 * constructing the state at all surfaces as `{ ok: false }` so a caller can
 * never mistake an unreadable thread for an empty one.
 */
export type ArtifactInspection =
  | { ok: true; state: ArtifactState }
  | { ok: false; message: string };

/**
 * One dimension on which an artifact state failed to match a declarative
 * pattern, carrying what the pattern required and what was observed.
 */
export type ArtifactMismatch = {
  dimension: keyof ArtifactState;
  expected: boolean | PlanState;
  observed: boolean | PlanState;
};

const GENESIS_FILES = ["seed.md", "decisions.md"] as const;
const PROPOSAL_FILE = "proposal.md";
const SPEC_FILE = "spec.md";
const PLAN_INDEX_FILE = "plan.md";
const PLAN_TASKS_DIR = "plan-tasks";
const IMPLEMENTATION_REPORT_FILE = "implementation-report.md";

/**
 * `lstat` a path, mapping "the path does not exist" — including a missing parent
 * directory — to `null`. Every other filesystem error is thrown to the caller.
 */
async function lstatOrNull(absPath: string): Promise<Stats | null> {
  try {
    return await fs.lstat(absPath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") {
      return null;
    }
    throw error;
  }
}

/**
 * Whether `absPath` is a non-empty regular file — the only shape that counts as
 * a present artifact. A missing path, a directory, a symlink, and an empty file
 * are all absent. Content is never read, so nothing here depends on what the
 * file says.
 */
async function isNonEmptyRegularFile(absPath: string): Promise<boolean> {
  const stat = await lstatOrNull(absPath);
  return stat !== null && stat.isFile() && stat.size > 0;
}

/**
 * Classify the plan topology under `threadAbs` into its bounded structural
 * state. The strict index's task list is never parsed: a task file is
 * recognized by being a non-empty regular `.md` entry, and nothing about
 * ordinals or cross-file consistency is checked.
 *
 * Every failure to read the topology is `malformed` rather than an inspection
 * error, because an unreadable plan must not be routed to either implementation
 * shape.
 */
async function inspectPlanState(threadAbs: string): Promise<PlanState> {
  try {
    const indexStat = await lstatOrNull(path.join(threadAbs, PLAN_INDEX_FILE));
    const tasksStat = await lstatOrNull(path.join(threadAbs, PLAN_TASKS_DIR));

    if (indexStat === null && tasksStat === null) {
      return "absent";
    }
    const indexPresent =
      indexStat !== null && indexStat.isFile() && indexStat.size > 0;
    if (tasksStat === null) {
      return indexPresent ? "brief" : "malformed";
    }
    if (!tasksStat.isDirectory() || !indexPresent) {
      return "malformed";
    }

    const entries: Dirent[] = await fs.readdir(path.join(threadAbs, PLAN_TASKS_DIR), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) {
        continue;
      }
      if (await isNonEmptyRegularFile(path.join(threadAbs, PLAN_TASKS_DIR, entry.name))) {
        return "strict";
      }
    }
    return "malformed";
  } catch {
    return "malformed";
  }
}

/**
 * Inspect a resolved active thread into its canonical artifact state.
 *
 * The thread counts as valid when its folder is a directory holding both
 * genesis files as non-empty regular files; `proposal.md`, `spec.md`, and
 * `implementation-report.md` count as present under the same non-empty regular
 * file rule; and the plan is classified by topology alone. No Markdown prose,
 * plan index entry, task ordinal, or decision record is ever parsed, and
 * `proposal.md` is never required.
 */
export async function inspectArtifactState(
  repoRoot: string,
  threadRelPath: string,
): Promise<ArtifactInspection> {
  const threadAbs = path.join(repoRoot, threadRelPath);

  try {
    const threadStat = await lstatOrNull(threadAbs);
    const [seed, decisions] = await Promise.all(
      GENESIS_FILES.map((name) => isNonEmptyRegularFile(path.join(threadAbs, name))),
    );
    const validThread =
      threadStat !== null && threadStat.isDirectory() && seed && decisions;

    return {
      ok: true,
      state: {
        validThread,
        proposal: await isNonEmptyRegularFile(path.join(threadAbs, PROPOSAL_FILE)),
        spec: await isNonEmptyRegularFile(path.join(threadAbs, SPEC_FILE)),
        plan: await inspectPlanState(threadAbs),
        implementationReport: await isNonEmptyRegularFile(
          path.join(threadAbs, IMPLEMENTATION_REPORT_FILE),
        ),
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: `Cannot inspect the thread's artifacts at ${threadAbs}: ${(error as Error).message}`,
    };
  }
}

/**
 * Every dimension on which `state` fails to equal the pattern. An empty array
 * means the pattern holds; dimensions the pattern omits are never reported.
 */
function mismatches(
  state: ArtifactState,
  pattern: PartialArtifactState,
): ArtifactMismatch[] {
  const found: ArtifactMismatch[] = [];
  for (const [dimension, expected] of Object.entries(pattern) as Array<
    [keyof ArtifactState, boolean | PlanState | undefined]
  >) {
    if (expected === undefined) {
      continue;
    }
    const observed = state[dimension];
    if (observed !== expected) {
      found.push({ dimension, expected, observed });
    }
  }
  return found;
}

/**
 * Evaluate a stage's declarative prerequisite against an artifact state, whether
 * simulated during composition or freshly inspected before an attempt. Returns
 * every unmet dimension, so a diagnostic can name what was required and what was
 * there.
 */
export function evaluateArtifactPrerequisite(
  state: ArtifactState,
  prerequisite: ArtifactPrerequisite,
): ArtifactMismatch[] {
  return mismatches(state, prerequisite);
}

/**
 * Apply a stage's promised transition to a simulated artifact state, leaving
 * every dimension the transition does not name exactly as it was.
 */
export function applyArtifactTransition(
  state: ArtifactState,
  transition: ArtifactTransition,
): ArtifactState {
  const next = { ...state };
  for (const [dimension, value] of Object.entries(transition) as Array<
    [keyof ArtifactState, boolean | PlanState | undefined]
  >) {
    if (value === undefined) {
      continue;
    }
    // Each dimension's value type is fixed by the pattern type, so the write is
    // type-safe per key even though the loop erases the correlation.
    (next as Record<string, boolean | PlanState>)[dimension] = value;
  }
  return next;
}

/**
 * Evaluate a stage's promised postcondition against freshly inspected concrete
 * state after a recognized `DONE`. Returns every dimension the attempt failed to
 * leave in its promised shape.
 */
export function evaluatePromisedState(
  state: ArtifactState,
  promised: ArtifactTransition,
): ArtifactMismatch[] {
  return mismatches(state, promised);
}
