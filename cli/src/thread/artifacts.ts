import type { Dirent, Stats } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";

import { isPlainObject } from "../shared/validation.js";

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

/**
 * The plain-language phrase for every value of every artifact-state dimension.
 *
 * The type is a mapped type over `ArtifactState`, so a new dimension or a new
 * legal value for one has no phrase until it is written here and the typecheck
 * says so. Nothing falls back to the raw value.
 */
type ArtifactDescriptions = {
  [Dimension in keyof ArtifactState]: {
    [Value in `${ArtifactState[Dimension]}`]: string;
  };
};

/**
 * The short name of each artifact-state dimension, used as a heading wherever
 * the terminal explains a prerequisite or promised transition.
 */
const ARTIFACT_DIMENSION_NAMES: Record<keyof ArtifactState, string> = {
  validThread: "Thread",
  proposal: "Proposal",
  spec: "Spec",
  plan: "Plan",
  implementationReport: "Implementation report",
};

/**
 * What each artifact state means on disk, as a phrase naming the concrete file
 * or folder and the shape it has to be in.
 *
 * Every phrase is a bare noun phrase, so the same words read correctly both
 * inside a sentence ("it requires …, but the thread has …") and as a row of a
 * list. A present artifact means a non-empty regular file, so its absent phrase
 * covers a missing file and an empty one alike.
 */
const ARTIFACT_DESCRIPTIONS: ArtifactDescriptions = {
  validThread: {
    true: "a thread folder holding a non-empty seed.md and decisions.md",
    false: "no thread folder holding a non-empty seed.md and decisions.md",
  },
  proposal: {
    true: "a non-empty proposal.md",
    false: "no proposal.md",
  },
  spec: {
    true: "a non-empty spec.md",
    false: "no spec.md",
  },
  plan: {
    absent: "no plan.md and no plan-tasks/ folder",
    brief: "a non-empty plan.md and no plan-tasks/ folder",
    strict:
      "a non-empty plan.md and a plan-tasks/ folder holding at least one " +
      "non-empty .md task file",
    malformed:
      "a plan.md and plan-tasks/ folder combination that does not form a " +
      "usable plan",
  },
  implementationReport: {
    true: "a non-empty implementation-report.md",
    false: "no implementation-report.md",
  },
};

/**
 * The kind of value one artifact-state dimension holds. It is what decides
 * whether a serialized pattern or mismatch may carry a boolean or a plan state
 * for that dimension.
 */
type ArtifactValueKind = "boolean" | "plan-state";

/**
 * The value kind of every artifact-state dimension. Typed as a total record, so
 * a new dimension has no kind until it is written here — and this is the one
 * dimension list the domain keeps, so every membership test reads it.
 */
const ARTIFACT_VALUE_KINDS: Record<keyof ArtifactState, ArtifactValueKind> = {
  validThread: "boolean",
  proposal: "boolean",
  spec: "boolean",
  plan: "plan-state",
  implementationReport: "boolean",
};

/**
 * Every legal plan state, read off the description table's own plan row. That
 * row is total by construction, so the states a validator accepts and the states
 * a phrase exists for can never disagree.
 */
const PLAN_STATES: ReadonlySet<string> = new Set(
  Object.keys(ARTIFACT_DESCRIPTIONS.plan),
);

/** Whether an untrusted string names an artifact-state dimension. */
function isArtifactDimension(value: string): value is keyof ArtifactState {
  return Object.hasOwn(ARTIFACT_VALUE_KINDS, value);
}

/**
 * Whether `value` is a legal value for the named dimension: a plan state for a
 * plan-state dimension, and a boolean for every other.
 */
function isArtifactDimensionValue(
  dimension: keyof ArtifactState,
  value: unknown,
): boolean {
  if (ARTIFACT_VALUE_KINDS[dimension] === "plan-state") {
    return typeof value === "string" && PLAN_STATES.has(value);
  }
  return typeof value === "boolean";
}

/** What a dimension's value has to be, as the tail of a validation error. */
function valueRequirementOf(dimension: keyof ArtifactState): string {
  return ARTIFACT_VALUE_KINDS[dimension] === "plan-state"
    ? "must be a known plan state."
    : "must be a boolean.";
}

/**
 * Validate an untrusted serialized artifact-state pattern — a stage's
 * prerequisite or its promised transition, as read back from a document the
 * executor did not write. Every named dimension must carry its own value type,
 * and no other key may appear.
 *
 * Errors are qualified with `label`, so a caller places the pattern in its own
 * document without this domain knowing what that document is.
 */
export function validateSerializedArtifactPattern(
  value: unknown,
  label: string,
): string[] {
  if (!isPlainObject(value)) {
    return [`${label} must be an object.`];
  }
  const errors: string[] = [];
  for (const key of Object.keys(value)) {
    if (!isArtifactDimension(key)) {
      errors.push(`${label}.${key} is not an artifact-state dimension.`);
      continue;
    }
    if (!isArtifactDimensionValue(key, value[key])) {
      errors.push(`${label}.${key} ${valueRequirementOf(key)}`);
    }
  }
  return errors;
}

/**
 * Validate an untrusted serialized record of unmet contract dimensions: a
 * non-empty list, each entry naming one artifact-state dimension and carrying an
 * expected and an observed value of that dimension's own type.
 */
export function validateSerializedArtifactMismatches(
  value: unknown,
  label: string,
): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [`${label} must be a non-empty array.`];
  }
  const errors: string[] = [];
  value.forEach((entry, index) => {
    const entryLabel = `${label}[${index}]`;
    if (!isPlainObject(entry)) {
      errors.push(`${entryLabel} must be an object.`);
      return;
    }
    const dimension = entry.dimension;
    if (typeof dimension !== "string" || !isArtifactDimension(dimension)) {
      errors.push(`${entryLabel}.dimension is not an artifact-state dimension.`);
      return;
    }
    for (const side of ["expected", "observed"] as const) {
      if (!isArtifactDimensionValue(dimension, entry[side])) {
        errors.push(
          `${entryLabel}.${side} must be a valid value for the "${dimension}" dimension.`,
        );
      }
    }
  });
  return errors;
}

/**
 * The phrase describing one dimension holding one value. Total by construction:
 * the signature admits only a value the dimension can actually hold, and every
 * such pair has an entry in the table.
 */
export function describeArtifact<Dimension extends keyof ArtifactState>(
  dimension: Dimension,
  value: ArtifactState[Dimension],
): string {
  // The signature pairs each dimension with its own value type, so the row this
  // reads always exists even though the lookup erases the correlation.
  const phrases = ARTIFACT_DESCRIPTIONS[dimension] as Record<string, string>;
  return phrases[`${value}`];
}

/** The short terminal heading for one artifact-state dimension. */
export function describeArtifactDimension(
  dimension: keyof ArtifactState,
): string {
  return ARTIFACT_DIMENSION_NAMES[dimension];
}

/**
 * One unmet dimension as a single readable row: the artifact the contract asked
 * for, then the one the thread actually holds.
 */
export function formatArtifactMismatch(mismatch: ArtifactMismatch): string {
  return (
    `expected ${describeArtifact(mismatch.dimension, mismatch.expected)}, ` +
    `found ${describeArtifact(mismatch.dimension, mismatch.observed)}`
  );
}

/**
 * One side of a set of unmet contract dimensions, spelled as the phrases a
 * contract diagnostic reads with — so a sentence built from this and a list
 * built from `formatArtifactMismatch` describe the same artifacts in the same
 * words.
 */
export function describeContractSide(
  unmet: readonly ArtifactMismatch[],
  side: "expected" | "observed",
): string {
  return unmet
    .map((mismatch) => describeArtifact(mismatch.dimension, mismatch[side]))
    .join(", ");
}

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
