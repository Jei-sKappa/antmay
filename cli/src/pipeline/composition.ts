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
  CatalogStageId,
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
 * One earlier selected stage whose promised transition changes a dependency
 * that the failing stage needs. Positions retain both source-pipeline identity
 * and selected-suffix identity so a `--from` refusal can explain both.
 */
export type ProjectedTransition = {
  stageId: CatalogStageId;
  pipelinePosition: number;
  selectedPosition: number;
  value: boolean | PlanState;
};

/**
 * One unsatisfied dependency projected from the thread before the run through
 * every earlier selected transition that changes it.
 */
export type DependencyProjection = ArtifactMismatch & {
  initial: boolean | PlanState;
  transitions: ProjectedTransition[];
};

export type SelectedStageIdentity = {
  stageId: CatalogStageId;
  pipelinePosition: number;
  selectedPosition: number;
};

/**
 * Every composition refusal is structured data. Rendering belongs to the
 * terminal layer, while composition owns the causal facts the renderer needs.
 */
export type CompositionFailure =
  | {
      kind: "entry-point-not-selected";
      requestedStage: string;
      pipelineStages: Array<{
        stageId: CatalogStageId;
        pipelinePosition: number;
      }>;
    }
  | {
      kind: "stage-prerequisite-unmet";
      stage: SelectedStageIdentity;
      pipelineStageCount: number;
      selectedStageCount: number;
      fromStage: string | null;
      earlierStages: SelectedStageIdentity[];
      dependencies: DependencyProjection[];
    };

/**
 * The result of composing a pipeline document against a thread. Composition
 * stops at the first impossible stage, so a refusal carries that stage's
 * structured diagnostic rather than a survey of the whole selection.
 */
export type CompositionResult =
  | { ok: true; stages: PreparedStage[] }
  | { ok: false; failure: CompositionFailure };

type SelectedEntry = {
  entry: PipelineStageEntry;
  pipelinePosition: number;
};

function stageIdentity(
  selected: SelectedEntry,
  selectedPosition: number,
): SelectedStageIdentity {
  return {
    stageId: selected.entry.stage,
    pipelinePosition: selected.pipelinePosition,
    selectedPosition,
  };
}

/**
 * Trace each unmet dependency from the thread's inspected value through every
 * earlier stage promise that changes it. The last transition, when present,
 * equals the mismatch's projected observed value.
 */
function projectDependencies(
  unmet: readonly ArtifactMismatch[],
  initialState: ArtifactState,
  earlierEntries: readonly SelectedEntry[],
): DependencyProjection[] {
  return unmet.map((mismatch) => {
    const transitions = earlierEntries.flatMap(
      (selected, earlierIndex): ProjectedTransition[] => {
        const value = STAGE_CATALOG[selected.entry.stage].promises[mismatch.dimension];
        if (value === undefined) {
          return [];
        }
        return [
          {
            stageId: selected.entry.stage,
            pipelinePosition: selected.pipelinePosition,
            selectedPosition: earlierIndex + 1,
            value,
          },
        ];
      },
    );
    return {
      ...mismatch,
      initial: initialState[mismatch.dimension],
      transitions,
    };
  });
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
  | { ok: true; entries: readonly SelectedEntry[] }
  | { ok: false; failure: CompositionFailure } {
  const all = document.stages.map((entry, index) => ({
    entry,
    pipelinePosition: index + 1,
  }));
  if (fromStage === null) {
    return { ok: true, entries: all };
  }
  const index = document.stages.findIndex((entry) => entry.stage === fromStage);
  if (index === -1) {
    return {
      ok: false,
      failure: {
        kind: "entry-point-not-selected",
        requestedStage: fromStage,
        pipelineStages: all.map((selected) => ({
          stageId: selected.entry.stage,
          pipelinePosition: selected.pipelinePosition,
        })),
      },
    };
  }
  return { ok: true, entries: all.slice(index) };
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
    return { ok: false, failure: selection.failure };
  }

  const prepared: PreparedStage[] = [];
  let state = artifactState;

  for (const [index, selected] of selection.entries.entries()) {
    const entry = selected.entry;
    const stage = STAGE_CATALOG[entry.stage];

    const unmet = evaluateArtifactPrerequisite(state, stage.prerequisite);
    if (unmet.length > 0) {
      return {
        ok: false,
        failure: {
          kind: "stage-prerequisite-unmet",
          stage: stageIdentity(selected, index + 1),
          pipelineStageCount: document.stages.length,
          selectedStageCount: selection.entries.length,
          fromStage,
          earlierStages: selection.entries
            .slice(0, index)
            .map((earlier, earlierIndex) =>
              stageIdentity(earlier, earlierIndex + 1),
            ),
          dependencies: projectDependencies(
            unmet,
            artifactState,
            selection.entries.slice(0, index),
          ),
        },
      };
    }

    const target = resolveStageTargetRule(stage.targetRule, threadRelPath, state);
    if (!target.ok) {
      throw new Error(
        `Trusted catalog stage "${stage.id}" has an unusable target: ${target.error}.`,
      );
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
