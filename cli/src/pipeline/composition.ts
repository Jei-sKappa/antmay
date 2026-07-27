import {
  applyArtifactTransition,
  evaluateArtifactPrerequisite,
  type ArtifactMismatch,
} from "../thread/artifacts.js";
import { STAGE_CATALOG } from "./catalog.js";
import type { CatalogStage } from "./catalog.js";
import { resolveStageTargetRule } from "./targets.js";
import type {
  ArtifactState,
  PipelineDocument,
  PipelineStageEntry,
  PlanState,
} from "./types.js";

/**
 * One selected stage prepared for execution: the trusted catalog definition it
 * selects, its concrete repository-relative target resolved against the
 * simulated state at its position, and the portable instructions its pipeline
 * entry attached.
 *
 * The instructions ride alongside the catalog definition and never inside it,
 * so opaque author text cannot reach any contract the catalog owns.
 */
export type PreparedStage = {
  stage: CatalogStage;
  target: string;
  instructions?: string;
};

/**
 * The result of composing a pipeline document against a thread. Composition
 * stops at the first impossible stage, so a rejection carries that one
 * diagnostic rather than a survey of the whole selection.
 */
export type CompositionResult =
  | { ok: true; stages: PreparedStage[] }
  | { ok: false; errors: string[] };

/**
 * Render one artifact-state dimension and value as the phrase a diagnostic
 * reads with.
 */
function describeDimension(
  dimension: keyof ArtifactState,
  value: boolean | PlanState,
): string {
  switch (dimension) {
    case "validThread":
      return value === true ? "a valid thread" : "no valid thread";
    case "proposal":
      return value === true ? "a proposal" : "no proposal";
    case "spec":
      return value === true ? "a spec" : "no spec";
    case "implementationReport":
      return value === true ? "an implementation report" : "no implementation report";
    case "plan":
      return `plan state "${value as PlanState}"`;
  }
}

function describeExpected(unmet: readonly ArtifactMismatch[]): string {
  return unmet
    .map((mismatch) => describeDimension(mismatch.dimension, mismatch.expected))
    .join(" and ");
}

function describeObserved(unmet: readonly ArtifactMismatch[]): string {
  return unmet
    .map((mismatch) => describeDimension(mismatch.dimension, mismatch.observed))
    .join(" and ");
}

/**
 * Explain why the stage at `index` of the selection cannot run: what it
 * required, what the state at that point actually holds, and which earlier
 * selected stages bear on the dimensions that failed.
 *
 * The state is the thread's own when nothing precedes the stage and the
 * simulated state otherwise, so the diagnostic never implies a preceding stage
 * produced something no selected stage promised.
 */
function describeImpossibleStage(
  stage: CatalogStage,
  index: number,
  unmet: readonly ArtifactMismatch[],
  entries: readonly PipelineStageEntry[],
): string[] {
  const position = index + 1;
  const origin =
    index === 0 ? "the thread's current state" : "the simulated state at that point";
  const lines = [
    `Stage "${stage.id}" (selected position ${position}) cannot run: it requires ` +
      `${describeExpected(unmet)}, but ${origin} has ${describeObserved(unmet)}.`,
  ];

  if (index === 0) {
    lines.push(
      "No earlier stage is selected, so that state must already exist in the thread.",
    );
    return lines;
  }

  const failedDimensions = new Set(unmet.map((mismatch) => mismatch.dimension));
  const relevant = entries.slice(0, index).flatMap((entry, earlier) => {
    const promised = (
      Object.entries(STAGE_CATALOG[entry.stage].promises) as Array<
        [keyof ArtifactState, boolean | PlanState | undefined]
      >
    )
      .filter(
        ([dimension, value]) =>
          value !== undefined && failedDimensions.has(dimension),
      )
      .map(([dimension, value]) =>
        describeDimension(dimension, value as boolean | PlanState),
      );
    if (promised.length === 0) {
      return [];
    }
    return [
      `"${entry.stage}" (position ${earlier + 1}) promises ${promised.join(" and ")}`,
    ];
  });

  lines.push(
    relevant.length === 0
      ? "No earlier selected stage produces that state, so it must already exist in the thread."
      : `Earlier selected stages leaving that state: ${relevant.join("; ")}.`,
  );
  return lines;
}

/**
 * Select the entries the run executes: every entry when `fromStage` is `null`,
 * and otherwise the named entry together with every later one, in document
 * order. A `fromStage` the document does not select is refused by name.
 */
function selectEntries(
  document: PipelineDocument,
  fromStage: string | null,
):
  | { ok: true; entries: readonly PipelineStageEntry[] }
  | { ok: false; errors: string[] } {
  if (fromStage === null) {
    return { ok: true, entries: document.stages };
  }
  const index = document.stages.findIndex((entry) => entry.stage === fromStage);
  if (index === -1) {
    const available = document.stages.map((entry) => `"${entry.stage}"`).join(", ");
    return {
      ok: false,
      errors: [
        `Stage "${fromStage}" is not in pipeline "${document.name}"; its stages are ${available}.`,
      ],
    };
  }
  return { ok: true, entries: document.stages.slice(index) };
}

/**
 * Compose a validated pipeline document into the ordered executable stages of
 * one run.
 *
 * `artifactState` is the thread's freshly inspected concrete state, and it is
 * the only starting point: a stage skipped by `--from` never runs, so nothing it
 * would have promised is credited. Each selected stage is checked against the
 * state as simulated at its position, then applies its own promised transition
 * for the stages after it, leaving every dimension it does not name untouched.
 * Targets resolve against that same simulated state, which is what makes
 * `spec → plan-brief` point at `spec.md` while a direct `plan-brief` points at
 * the thread root.
 *
 * The walk stops at the first impossible stage and prepares nothing further.
 */
export function composePipeline(
  document: PipelineDocument,
  artifactState: ArtifactState,
  threadRelPath: string,
  fromStage: string | null,
): CompositionResult {
  const selection = selectEntries(document, fromStage);
  if (!selection.ok) {
    return { ok: false, errors: selection.errors };
  }

  const prepared: PreparedStage[] = [];
  let state = artifactState;

  for (const [index, entry] of selection.entries.entries()) {
    const stage = STAGE_CATALOG[entry.stage];

    const unmet = evaluateArtifactPrerequisite(state, stage.prerequisite);
    if (unmet.length > 0) {
      return {
        ok: false,
        errors: describeImpossibleStage(stage, index, unmet, selection.entries),
      };
    }

    const target = resolveStageTargetRule(stage.targetRule, threadRelPath, state);
    if (!target.ok) {
      return {
        ok: false,
        errors: [`Stage "${stage.id}" has an unusable target: ${target.error}.`],
      };
    }

    const preparedStage: PreparedStage = { stage, target: target.path };
    if (entry.instructions !== undefined) {
      preparedStage.instructions = entry.instructions;
    }
    prepared.push(preparedStage);

    state = applyArtifactTransition(state, stage.promises);
  }

  return { ok: true, stages: prepared };
}
