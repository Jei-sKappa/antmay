import type { TemporaryWorkspaceProblems } from "../gitops/temporary-workspaces.js";
import type {
  CompositionFailure,
  DependencyProjection,
  SelectedStageIdentity,
} from "../pipeline/composition.js";
import {
  describeArtifact,
  describeArtifactDimension,
} from "../thread/artifacts.js";
import type { DisplayOptions } from "./format.js";
import {
  KEY_STYLE,
  createPainter,
  emit,
  infoLine,
  keyWidth,
  unmetRequirementsProblem,
} from "./format.js";

type TemporaryWorkspaceRefusalBase = {
  pipelineName: string;
  threadRelPath: string;
  repoRoot: string;
  problems: TemporaryWorkspaceProblems;
};

/** Context that distinguishes refusing a new run from refusing a resume. */
export type TemporaryWorkspaceRefusalInfo =
  | (TemporaryWorkspaceRefusalBase & { mode: "run" })
  | (TemporaryWorkspaceRefusalBase & {
      mode: "resume";
      runId: string;
    });

function relativeToThread(threadRelPath: string, trackedPath: string): string {
  const prefix = `${threadRelPath}/`;
  return trackedPath.startsWith(prefix)
    ? trackedPath.slice(prefix.length)
    : trackedPath;
}

/**
 * Render an unsafe temporary-workspace refusal to stderr. The Git checker owns
 * the repository facts; this renderer supplies command context, separates each
 * problem from its correction, and states what durable work did not happen.
 */
export function printTemporaryWorkspaceRefusal(
  options: DisplayOptions,
  info: TemporaryWorkspaceRefusalInfo,
): void {
  const paint = createPainter(options);
  const width = keyWidth(
    "Run ID",
    "Pipeline",
    "Thread",
    "Check",
    "Problem",
    "Result",
    "Resume",
  );
  const line = (key: string, value: string): string =>
    infoLine(paint, "  ", key, value, width);
  const lines = [
    paint(
      info.mode === "run"
        ? "Pipeline cannot start ❌"
        : "Run cannot resume ❌",
      "bold",
      "red",
    ),
  ];

  if (info.mode === "resume") {
    lines.push(line("Run ID", info.runId));
  }
  lines.push(
    line("Pipeline", info.pipelineName),
    line("Thread", info.threadRelPath),
    line("Check", "Temporary workspace Git safety"),
    line("Problem", "Antmay's temporary workspaces are not Git-safe."),
  );

  if (info.problems.uncovered.length > 0) {
    lines.push(
      "",
      paint("Missing ignore coverage", "bold"),
      `  ${paint("Directories:", ...KEY_STYLE)}`,
      ...info.problems.uncovered.map(
        (workspace) =>
          `    - ${relativeToThread(info.threadRelPath, workspace.directory)}/`,
      ),
      "",
      `  ${paint("Fix:", ...KEY_STYLE)}`,
      `    Add these lines to ${info.repoRoot}/.gitignore:`,
      ...info.problems.uncovered.map(
        (workspace) => `      ${workspace.repositoryRule}`,
      ),
    );
  }

  if (info.problems.trackedPaths.length > 0) {
    lines.push(
      "",
      paint("Tracked temporary content", "bold"),
      `  ${paint("Files:", ...KEY_STYLE)}`,
      ...info.problems.trackedPaths.map(
        (trackedPath) =>
          `    - ${relativeToThread(info.threadRelPath, trackedPath)}`,
      ),
      "",
      `  ${paint("Fix:", ...KEY_STYLE)}`,
    );

    if (info.problems.trackedDirectories.length > 0) {
      lines.push(
        `    Run from ${info.repoRoot}:`,
        `      git rm -r --cached -- ${info.problems.trackedDirectories.join(" ")}`,
        "    Then commit the removal.",
      );
    } else {
      lines.push(
        "    Review and untrack the files above, then commit the removal.",
      );
    }
  }

  lines.push(
    "",
    `  ${paint("Why:", ...KEY_STYLE)}`,
    "    - Antmay writes temporary work-in-progress files into these directories.",
    "    - Git must ignore them and track nothing inside them.",
    "    - Files written during a run can otherwise make a later stage fail its Git boundary.",
    line(
      "Result",
      info.mode === "run"
        ? "No run was created and no stages were run."
        : "Checkpoint unchanged. No lock was acquired and no stage was run.",
    ),
  );

  if (info.mode === "resume") {
    lines.push(line("Resume", `antmay afk resume ${info.runId}`));
  }

  emit(options.stderr, lines.join("\n"));
}

/** Identity shared by every pipeline-composition refusal. */
export type CompositionRefusalInfo = {
  pipelineName: string;
  pipelineSourcePath: string;
  failure: CompositionFailure;
};

function pipelineStageLabel(
  stage: SelectedStageIdentity,
  pipelineStageCount: number,
): string {
  return `pipeline stage ${stage.pipelinePosition} of ${pipelineStageCount} · ${stage.stageId}`;
}

function dependencyCause(
  dependency: DependencyProjection,
  failure: Extract<CompositionFailure, { kind: "stage-prerequisite-unmet" }>,
): string {
  const dimension = describeArtifactDimension(dependency.dimension).toLowerCase();
  const requiredBy = `stage ${failure.stage.pipelinePosition} "${failure.stage.stageId}"`;
  const transitions = dependency.transitions;

  if (transitions.length === 0) {
    return failure.earlierStages.length === 0
      ? `The thread's ${dimension} does not satisfy the prerequisite for ${requiredBy}, and this is the first selected stage.`
      : `The thread's ${dimension} does not satisfy the prerequisite for ${requiredBy}, and no earlier selected stage changes it.`;
  }

  const last = transitions.at(-1)!;
  const priorCompatible = [
    {
      stageId: null,
      pipelinePosition: 0,
      value: dependency.initial,
    },
    ...transitions.slice(0, -1),
  ]
    .reverse()
    .find((point) => point.value === dependency.expected);

  if (priorCompatible !== undefined) {
    const origin =
      priorCompatible.stageId === null
        ? "already in the thread before the run"
        : `projected after stage ${priorCompatible.pipelinePosition} "${priorCompatible.stageId}"`;
    return (
      `Stage ${last.pipelinePosition} "${last.stageId}" would replace the compatible ` +
      `${dimension} ${origin} with one that does not satisfy the prerequisite for ${requiredBy}.`
    );
  }

  return (
    `Stage ${last.pipelinePosition} "${last.stageId}" is the last earlier stage ` +
    `to change the ${dimension}; its projected output does not satisfy the prerequisite for ${requiredBy}.`
  );
}

/**
 * Render a pipeline-composition refusal to stderr. The block makes the
 * executor's dependency projection explicit: the thread before the run, each
 * relevant earlier transition, and what the failing stage requires. Nothing
 * has been allocated or invoked when this is printed.
 */
export function printCompositionRefusal(
  options: DisplayOptions,
  info: CompositionRefusalInfo,
): void {
  const paint = createPainter(options);
  const width = keyWidth(
    "Pipeline",
    "Source",
    "Where",
    "Selection",
    "Problem",
    "Result",
  );
  const line = (key: string, value: string): string =>
    infoLine(paint, "  ", key, value, width);
  const lines = [
    paint("Pipeline cannot start ❌", "bold", "red"),
    line("Pipeline", info.pipelineName),
    line("Source", info.pipelineSourcePath),
  ];

  if (info.failure.kind === "entry-point-not-selected") {
    lines.push(
      line("Where", `--from ${info.failure.requestedStage}`),
      line(
        "Problem",
        "The requested entry point is not selected by this pipeline.",
      ),
      "",
      `  ${paint("Pipeline stages:", ...KEY_STYLE)}`,
      ...info.failure.pipelineStages.map(
        (stage) => `    ${stage.pipelinePosition}. ${stage.stageId}`,
      ),
      "",
      `  ${paint("Why:", ...KEY_STYLE)}`,
      `    - --from selects a suffix beginning at a stage in the pipeline, but ` +
        `"${info.failure.requestedStage}" does not occur in this one.`,
      line("Result", "No stages were run."),
    );
    emit(options.stderr, lines.join("\n"));
    return;
  }

  const failure = info.failure;
  lines.push(
    line("Where", pipelineStageLabel(failure.stage, failure.pipelineStageCount)),
  );
  if (failure.fromStage !== null) {
    lines.push(
      line(
        "Selection",
        `selected stage ${failure.stage.selectedPosition} of ${failure.selectedStageCount} from --from ${failure.fromStage}`,
      ),
    );
  }
  const count = failure.dependencies.length;
  lines.push(
    line("Problem", unmetRequirementsProblem(failure.stage.stageId, count)),
  );

  for (const dependency of failure.dependencies) {
    const dimension = describeArtifactDimension(dependency.dimension);
    lines.push(
      "",
      paint(
        `${dimension} projection (assuming earlier selected stages succeed)`,
        "bold",
      ),
      `  ${paint("Thread before run:", ...KEY_STYLE)}`,
      `    ${describeArtifact(dependency.dimension, dependency.initial)}`,
    );

    if (dependency.transitions.length === 0) {
      const earlier = failure.earlierStages;
      const explanation =
        earlier.length === 0
          ? "none — this is the first selected stage"
          : `none — ${earlier
              .map((stage) => `stage ${stage.pipelinePosition} "${stage.stageId}"`)
              .join(", ")} ${earlier.length === 1 ? "does" : "do"} not change the ${dimension.toLowerCase()}`;
      lines.push(
        `  ${paint("Earlier stage changes:", ...KEY_STYLE)}`,
        `    ${explanation}`,
      );
    } else {
      for (const transition of dependency.transitions) {
        lines.push(
          `  ${paint(
            `After stage ${transition.pipelinePosition} · ${transition.stageId}:`,
            ...KEY_STYLE,
          )}`,
          `    ${describeArtifact(dependency.dimension, transition.value)}`,
        );
      }
    }

    lines.push(
      `  ${paint(
        `Required by stage ${failure.stage.pipelinePosition} · ${failure.stage.stageId}:`,
        ...KEY_STYLE,
      )}`,
      `    ${describeArtifact(dependency.dimension, dependency.expected)}`,
    );
  }

  lines.push("", `  ${paint("Why:", ...KEY_STYLE)}`);
  for (const dependency of failure.dependencies) {
    lines.push(`    - ${dependencyCause(dependency, failure)}`);
  }
  lines.push(line("Result", "No stages were run."));
  emit(options.stderr, lines.join("\n"));
}
