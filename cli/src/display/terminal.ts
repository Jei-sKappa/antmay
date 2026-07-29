import type { HarnessEvent } from "../harness/types.js";
import type { TemporaryWorkspaceProblems } from "../gitops/temporary-workspaces.js";
import type {
  CompositionFailure,
  DependencyProjection,
  SelectedStageIdentity,
} from "../pipeline/composition.js";
import type {
  ProfileSelection,
  RunCondition,
  WaitingInfo,
  WaitingKind,
  WaitingReason,
} from "../state/checkpoint.js";
import {
  describeArtifact,
  describeArtifactDimension,
  formatArtifactMismatch,
} from "../thread/artifacts.js";
import type {
  CurrentStageInfo,
  Display,
  StageDisposition,
} from "./types.js";

/**
 * The stream and rendering context every terminal renderer and standalone
 * render helper shares. `isTTY` and `noColor` decide whether ANSI color codes
 * are emitted; the caller derives `noColor` from a non-empty `NO_COLOR` env.
 */
export interface DisplayOptions {
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
  isTTY: boolean;
  noColor: boolean;
}

/** One run as the list renderer needs it, independent of checkpoint storage. */
export type RunListSummary = {
  condition: RunCondition;
  updatedAt: string;
  runId: string;
  pipelineName: string;
  stage: {
    position: number;
    count: number;
    id?: string;
  };
  currentAgent?: {
    harness: string;
    model: string;
  };
  latestSession?: {
    harness: string;
    id: string;
  };
  threadRelPath: string;
  repoRoot: string;
};

/** Displayed tool-call arguments are truncated to this many characters; the
 * full data always survives untouched in the attempt log. */
const TOOL_ARG_DISPLAY_LIMIT = 160;

/** Prefix every line of live harness output carries, so agent output is
 * distinguishable at a glance from the executor's own lines. */
const AGENT_GUTTER = "│ ";

/**
 * The indent every line an executor writes beneath a stage header carries, so
 * the header owns everything under it. Quoted harness output is left flush and
 * leans on the agent gutter instead, which is this same width and lines the
 * quoted block up with its indented siblings.
 */
const STAGE_INDENT = " ".repeat(AGENT_GUTTER.length);

/** Prefix every line of developer-only diagnostic output carries. */
const DEV_PREFIX = "[DEV] ";

/** Width of the boxed unrestricted-permissions warning, borders included. */
const WARNING_BOX_WIDTH = 62;

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  brightBlue: "\x1b[94m",
  brightWhite: "\x1b[97m",
} as const;

type Ansi = Exclude<keyof typeof ANSI, "reset">;

const RUN_CONDITION: Record<
  RunCondition,
  { label: string; color: Ansi }
> = {
  ready: { label: "READY", color: "cyan" },
  "waiting-for-user": { label: "WAITING FOR USER", color: "yellow" },
  completed: { label: "COMPLETED", color: "green" },
  executing: { label: "EXECUTING (UNVERIFIED)", color: "magenta" },
};

/** The style every `key: value` label carries, so the key reads as a label
 * distinct from its value. */
const KEY_STYLE: readonly Ansi[] = ["brightBlue"];

/** The style every `key: value` value carries, kept a shade quieter than live
 * harness output so the two never read as the same voice. */
const VALUE_STYLE: readonly Ansi[] = ["white"];

/** The style live harness output carries — the brightest text on screen, since
 * it is the one thing a human is actually here to read. */
const AGENT_STYLE: readonly Ansi[] = ["brightWhite"];

/** The style a stage header carries, marking the start of a stage. */
const STAGE_STYLE: readonly Ansi[] = ["bold", "cyan"];

/**
 * How each stage disposition is spoken. The word says what happened and the
 * color says how badly, so a reader with color stripped loses nothing.
 */
const STAGE_DISPOSITION: Record<
  StageDisposition,
  { verb: string; icon: string; color: Ansi }
> = {
  refused: { verb: "refused", icon: "⛔", color: "red" },
  blocked: { verb: "blocked", icon: "🛑", color: "red" },
  failed: { verb: "failed", icon: "❌", color: "red" },
  interrupted: { verb: "interrupted", icon: "⏹️", color: "yellow" },
};

/**
 * The banner each reason a run stopped for is announced with. `group` orders
 * the banners when several hold at once: what the stage did comes before what
 * the queue state is, so the reason nearest the resume command is the one to
 * act on.
 */
const REASON_BANNER: Record<
  WaitingKind,
  { label: string; icon: string; color: Ansi; group: "stage" | "queue" }
> = {
  "outcome-refused": { label: "REFUSED", icon: "⛔", color: "red", group: "stage" },
  "outcome-blocked": { label: "BLOCKED", icon: "🛑", color: "red", group: "stage" },
  "malformed-outcome": {
    label: "FAILED — no terminal outcome",
    icon: "❌",
    color: "red",
    group: "stage",
  },
  "harness-error": {
    label: "FAILED — harness error",
    icon: "❌",
    color: "red",
    group: "stage",
  },
  "idle-timeout": {
    label: "FAILED — idle timeout",
    icon: "❌",
    color: "red",
    group: "stage",
  },
  "git-policy-violation": {
    label: "FAILED — git policy violation",
    icon: "❌",
    color: "red",
    group: "stage",
  },
  "commit-error": {
    label: "FAILED — commit failed",
    icon: "❌",
    color: "red",
    group: "stage",
  },
  // The two artifact-contract banners stay out of the BLOCKED/REFUSED words,
  // which belong to the skill's own terminal tokens: these are the executor's
  // own verdict on the thread's artifact state. Neither says "missing", because
  // a dimension can also hold the wrong shape — a `strict` plan promised where
  // a `brief` one is present is unmet with nothing absent.
  "stage-prerequisite-unmet": {
    label: "STAGE CANNOT START — requirements not met",
    icon: "❌",
    color: "red",
    group: "stage",
  },
  "stage-contract-violation": {
    label: "FAILED — promised artifact state unmet",
    icon: "❌",
    color: "red",
    group: "stage",
  },
  interrupted: { label: "INTERRUPTED", icon: "⏹️", color: "yellow", group: "stage" },
  "pending-queues": {
    label: "WAITING FOR USER",
    icon: "⏸️",
    color: "yellow",
    group: "queue",
  },
  "gate-error": {
    label: "FAILED — queue scan error",
    icon: "❌",
    color: "red",
    group: "queue",
  },
};

/**
 * The label over the lines that close a stopped run. It sits quietly at the same
 * indent as the keys beneath it, marking where a reason stops being described
 * and the run's own instructions begin without breaking the block in two.
 */
const ACTION_HEADER = "What to do";

/** Every `key:` label a closing block can print, so one alignment column serves
 * the identity block, the reason banners, and the closing action lines alike. */
const CLOSING_KEYS = [
  "Run ID",
  "Pipeline",
  "Elapsed",
  "Checkpoint",
  "Where",
  "Problem",
  "Reason",
  "Detail",
  "Pending",
  "Artifacts",
  "Next",
  "Log",
  "Continue",
  "Resume",
  "Result",
] as const;

/** Paints text in the requested styles, or returns it unchanged when color is
 * off. Every renderer in this module gets its painter from here. */
type Painter = (text: string, ...codes: Ansi[]) => string;

function createPainter(options: DisplayOptions): Painter {
  const useColor = options.isTTY && !options.noColor;
  return (text, ...codes) =>
    useColor ? `${codes.map((code) => ANSI[code]).join("")}${text}${ANSI.reset}` : text;
}

/** Write a block as one newline-terminated chunk, exactly as composed. */
function emit(stream: NodeJS.WritableStream, text: string): void {
  stream.write(`${text}\n`);
}

/**
 * Render one `key: value` info line. The key is painted so it reads as a label;
 * padding is applied outside the color codes so values stay aligned at
 * `keyWidth` regardless of whether color is on.
 */
function infoLine(
  paint: Painter,
  indent: string,
  key: string,
  value: string,
  keyWidth: number,
): string {
  const label = `${key}:`;
  const gap = " ".repeat(Math.max(1, keyWidth - label.length + 1));
  return `${indent}${paint(label, ...KEY_STYLE)}${gap}${paint(value, ...VALUE_STYLE)}`;
}

/** The widest `key:` label in a group, used as that group's alignment column. */
function keyWidth(...keys: string[]): number {
  return Math.max(...keys.map((key) => key.length + 1));
}

/** Prefix every line of `text` with the agent gutter. Quoted harness output is
 * always rendered through this, so it reads as quoted rather than as a line the
 * executor authored — antmay only ever speaks in its own unprefixed lines. */
function withGutter(text: string, gutter: string): string {
  return text
    .split("\n")
    .map((line) => `${gutter}${line}`)
    .join("\n");
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(" ");
}

function truncateArgs(args: string): string {
  if (args.length <= TOOL_ARG_DISPLAY_LIMIT) return args;
  return `${args.slice(0, TOOL_ARG_DISPLAY_LIMIT)}…`;
}

/**
 * Write a developer-only diagnostic block, followed by a blank line that keeps
 * it separate from the run's own output. Every line carries the `[DEV]` prefix,
 * so output that exists purely for development is never mistaken for part of an
 * ordinary run.
 */
function emitDev(options: DisplayOptions, text: string): void {
  const paint = createPainter(options);
  emit(options.stdout, `${withGutter(text, paint(DEV_PREFIX, "dim"))}\n`);
}

/**
 * The prominent boxed unrestricted-permissions warning, followed by a blank
 * line. Emitted in yellow to `stderr` and reused verbatim by both the run and
 * resume startup paths whenever the persisted permission choice is
 * unrestricted.
 */
export function printUnrestrictedWarning(options: DisplayOptions): void {
  const paint = createPainter(options);
  const border = "*".repeat(WARNING_BOX_WIDTH);
  const body = [
    "WARNING: running with --dangerously-skip-permissions",
    "The harness runs with no permission prompts: it can read,",
    "modify, and delete files and execute arbitrary commands.",
    "Only use this in an isolated or otherwise trusted setup.",
  ].map((line) => `* ${line.padEnd(WARNING_BOX_WIDTH - 4)} *`);

  emit(
    options.stderr,
    `${paint([border, ...body, border].join("\n"), "yellow")}\n`,
  );
}

/**
 * The developer-only scripted-harness block, printed on new-run and resume
 * startup ahead of the ordinary run details block so it reads as one added note
 * before otherwise-unchanged output. Carries the resolved scenario path;
 * logical harness/model stay in the ordinary details block and stage headers.
 */
export function printScriptedModeStartup(
  options: DisplayOptions,
  scenarioPath: string,
): void {
  const paint = createPainter(options);
  const width = keyWidth("enabled", "config");

  emitDev(
    options,
    [
      paint("Scripted harness", "bold"),
      infoLine(paint, "  ", "enabled", "true", width),
      infoLine(paint, "  ", "config", scenarioPath, width),
    ].join("\n"),
  );
}

/**
 * Render runs as individually labeled list entries. Status and update time form
 * each entry's scannable heading; identifiers, paths, and optional session data
 * keep their own lines so one long value cannot shift the meaning of another.
 */
export function printRunList(
  options: DisplayOptions,
  summaries: readonly RunListSummary[],
): void {
  const paint = createPainter(options);
  const width = keyWidth(
    "Run ID",
    "Pipeline",
    "Stage",
    "Current agent",
    "Latest session",
    "Thread",
    "Workspace",
  );
  const line = (key: string, value: string): string =>
    infoLine(paint, "  ", key, value, width);
  const lines = [paint(`AFK runs (${summaries.length})`, "bold")];

  for (const summary of summaries) {
    const condition = RUN_CONDITION[summary.condition];
    const stage =
      summary.stage.id === undefined
        ? `${summary.stage.position}/${summary.stage.count}`
        : `${summary.stage.position}/${summary.stage.count} · ${summary.stage.id}`;

    lines.push(
      "",
      `${paint(condition.label, "bold", condition.color)}${paint(
        ` · updated ${summary.updatedAt}`,
        "dim",
      )}`,
      line("Run ID", summary.runId),
      line("Pipeline", summary.pipelineName),
      line("Stage", stage),
    );

    if (summary.currentAgent !== undefined) {
      lines.push(
        line(
          "Current agent",
          `${summary.currentAgent.harness} · ${summary.currentAgent.model}`,
        ),
      );
    }
    if (summary.latestSession !== undefined) {
      lines.push(
        line(
          "Latest session",
          `${summary.latestSession.harness} · ${summary.latestSession.id}`,
        ),
      );
    }
    lines.push(
      line("Thread", summary.threadRelPath),
      line("Workspace", summary.repoRoot),
    );
  }

  emit(options.stdout, lines.join("\n"));
}

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

function unmetRequirementsProblem(stageId: string, count: number): string {
  return (
    `${count} requirement${count === 1 ? "" : "s"} for "${stageId}" ` +
    `${count === 1 ? "is" : "are"} not satisfied.`
  );
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

/**
 * The exact prompt submitted to one scripted harness invocation. Printed as
 * developer-only input before the scripted adapter validates or runs the
 * request, so prompt-assembly failures still leave their central evidence on
 * screen without reading as agent output.
 */
export function printScriptedResolvedPrompt(
  options: DisplayOptions,
  prompt: string,
): void {
  const paint = createPainter(options);
  emitDev(options, [paint("Resolved prompt", "bold"), prompt].join("\n"));
}

/**
 * One selected stage as the startup block draws it: what will run, on which
 * agent, against which concrete repository-relative target.
 */
export type StageSummaryEntry = {
  id: string;
  harness: string;
  model: string;
  target: string;
};

/** Every `key:` label the startup block prints, so one alignment column serves
 * the whole block. */
const STARTUP_KEYS = [
  "Run",
  "Pipeline",
  "Profile",
  "From",
  "Thread",
  "Workspace",
  "Permissions",
] as const;

const STARTUP_WIDTH = keyWidth(...STARTUP_KEYS);

/** Pad `text` to `width` outside any color codes, so a column stays aligned
 * whether or not color is on. */
function pad(text: string, width: number): string {
  return " ".repeat(Math.max(0, width - text.length));
}

/**
 * Render the new-run/resume startup details to stdout: the run's identity, the
 * pipeline and execution profile that were selected with the sources they were
 * read from, the `--from` entry point when the invocation named one, and every
 * selected stage in execution order with its resolved harness, model, and
 * concrete target.
 *
 * The block is informational and never prompts, so an unattended run reads it
 * and proceeds. When permissions are unrestricted the prominent warning goes to
 * stderr first, so it leads the startup output rather than trailing it.
 */
export function printRunSummary(
  options: DisplayOptions,
  info: {
    runId: string;
    pipelineName: string;
    pipelineSourcePath: string;
    profileSelection: ProfileSelection;
    fromStage?: string;
    threadRelPath: string;
    workspacePath: string;
    dangerouslySkipPermissions: boolean;
    stages: readonly StageSummaryEntry[];
  },
): void {
  const paint = createPainter(options);

  const permissionMode = info.dangerouslySkipPermissions
    ? "unrestricted (--dangerously-skip-permissions)"
    : "restricted";
  const line = (key: string, value: string): string =>
    infoLine(paint, "  ", key, value, STARTUP_WIDTH);

  if (info.dangerouslySkipPermissions) {
    printUnrestrictedWarning(options);
  }

  // A document's declared name and the source it was read from are independent
  // identities, so both are shown: moving a file changes one and not the other.
  const lines = [
    paint("Run details", "bold"),
    line("Run", info.runId),
    line("Pipeline", `${info.pipelineName} (${info.pipelineSourcePath})`),
    line(
      "Profile",
      info.profileSelection.kind === "profile"
        ? `${info.profileSelection.name} (${info.profileSelection.sourcePath})`
        : "settings only",
    ),
  ];
  if (info.fromStage !== undefined) {
    lines.push(line("From", info.fromStage));
  }
  lines.push(
    line("Thread", info.threadRelPath),
    line("Workspace", info.workspacePath),
    line("Permissions", permissionMode),
  );

  // The stages are a list rather than a value, so they get the sub-block form
  // the closing block's `Pending:` already uses, with their own columns.
  lines.push(`  ${paint("Stages:", ...KEY_STYLE)}`);
  const ordinalWidth = String(info.stages.length).length;
  const idWidth = Math.max(...info.stages.map((stage) => stage.id.length));
  const harnessWidth = Math.max(
    ...info.stages.map((stage) => stage.harness.length),
  );
  const agents = info.stages.map(
    (stage) =>
      `${stage.harness}${pad(stage.harness, harnessWidth)} · ${stage.model}`,
  );
  const agentWidth = Math.max(...agents.map((agent) => agent.length));
  info.stages.forEach((stage, index) => {
    const ordinal = `${String(index + 1).padStart(ordinalWidth)}.`;
    const agent = agents[index]!;
    lines.push(
      `    ${paint(ordinal, "dim")} ` +
        `${paint(stage.id, ...VALUE_STYLE)}${pad(stage.id, idWidth)}  ` +
        `${paint(agent, ...VALUE_STYLE)}${pad(agent, agentWidth)}  ` +
        `${paint("→", "dim")} ${paint(stage.target, ...VALUE_STYLE)}`,
    );
  });

  emit(options.stdout, lines.join("\n"));
}

/** The one alignment column every closing block shares. */
const CLOSING_WIDTH = keyWidth(...CLOSING_KEYS);

/**
 * The identity block every closing block opens with: which run this was, and
 * where its durable state lives. What to do about it follows underneath.
 */
function runSummaryBlock(
  paint: Painter,
  info: {
    runId: string;
    pipelineName: string;
    totalElapsedMs: number;
    checkpointPath: string;
  },
): string[] {
  const line = (key: string, value: string): string =>
    infoLine(paint, "  ", key, value, CLOSING_WIDTH);
  return [
    "",
    paint("Run summary", "bold"),
    line("Run ID", info.runId),
    line("Pipeline", info.pipelineName),
    line("Elapsed", formatDuration(info.totalElapsedMs)),
    line("Checkpoint", info.checkpointPath),
  ];
}

/**
 * Every reason a pause stopped for, ordered for reading: what the stage did,
 * then what the queue state is. Relative order within a group is preserved, so
 * the governing reason still leads its own group.
 */
function orderedReasons(waiting: WaitingInfo): WaitingReason[] {
  const inGroup = (group: "stage" | "queue"): WaitingReason[] =>
    waiting.reasons.filter((reason) => REASON_BANNER[reason.kind].group === group);
  return [...inGroup("stage"), ...inGroup("queue")];
}

/**
 * One reason's banner and its supporting lines. An unrecognizable terminal line
 * is echoed here behind the agent gutter that marks it quoted, because that line
 * is the whole of the complaint.
 */
function prerequisiteReasonBlock(
  paint: Painter,
  reason: WaitingReason,
  currentStage: CurrentStageInfo,
): string[] {
  const banner = REASON_BANNER[reason.kind];
  const line = (key: string, value: string): string =>
    infoLine(paint, "  ", key, value, CLOSING_WIDTH);
  const stage = `stage ${currentStage.position} "${currentStage.id}"`;
  const contract = reason.contract;
  const hasContract = contract !== undefined && contract.length > 0;
  const label = hasContract
    ? banner.label
    : "STAGE CANNOT START — requirements could not be checked";
  const lines = [
    "",
    paint(`${label} ${banner.icon}`, "bold", banner.color),
    line(
      "Where",
      `stage ${currentStage.position} of ${currentStage.count} · ${currentStage.id}`,
    ),
  ];

  if (contract === undefined || contract.length === 0) {
    lines.push(
      line(
        "Problem",
        `The requirements for "${currentStage.id}" could not be checked.`,
      ),
      "",
      `  ${paint("Why:", ...KEY_STYLE)}`,
      `    - ${reason.message}`,
      line(
        "Result",
        `Stage ${currentStage.position} "${currentStage.id}" was not run. The pipeline is paused at this stage.`,
      ),
    );
    return lines;
  }

  lines.push(
    line(
      "Problem",
      unmetRequirementsProblem(currentStage.id, contract.length),
    ),
  );

  for (const mismatch of contract) {
    const dimension = describeArtifactDimension(mismatch.dimension);
    lines.push(
      "",
      paint(`${dimension} requirement`, "bold"),
      `  ${paint("Thread now:", ...KEY_STYLE)}`,
      `    ${describeArtifact(mismatch.dimension, mismatch.observed)}`,
      `  ${paint(
        `Required by stage ${currentStage.position} · ${currentStage.id}:`,
        ...KEY_STYLE,
      )}`,
      `    ${describeArtifact(mismatch.dimension, mismatch.expected)}`,
    );
  }

  lines.push("", `  ${paint("Why:", ...KEY_STYLE)}`);
  for (const mismatch of contract) {
    const dimension = describeArtifactDimension(mismatch.dimension).toLowerCase();
    lines.push(
      `    - The pipeline passed preflight, but the thread's ${dimension} no longer matches what ${stage} requires.`,
    );
  }
  lines.push(
    line(
      "Result",
      `Stage ${currentStage.position} "${currentStage.id}" was not run. The pipeline is paused at this stage.`,
    ),
  );
  return lines;
}

function reasonBlock(
  paint: Painter,
  reason: WaitingReason,
  currentStage: CurrentStageInfo,
): string[] {
  if (reason.kind === "stage-prerequisite-unmet") {
    return prerequisiteReasonBlock(paint, reason, currentStage);
  }

  const banner = REASON_BANNER[reason.kind];
  const line = (key: string, value: string): string =>
    infoLine(paint, "  ", key, value, CLOSING_WIDTH);

  const lines = [
    "",
    paint(`${banner.label} ${banner.icon}`, "bold", banner.color),
    line("Reason", reason.message),
  ];
  if (reason.detail !== undefined) {
    lines.push(line("Detail", reason.detail));
  }
  if (reason.pendingFiles !== undefined && reason.pendingFiles.length > 0) {
    lines.push(`  ${paint("Pending:", ...KEY_STYLE)}`);
    for (const file of reason.pendingFiles) {
      lines.push(`    - ${file}`);
    }
  }
  if (reason.contract !== undefined && reason.contract.length > 0) {
    lines.push(`  ${paint("Artifacts:", ...KEY_STYLE)}`);
    for (const mismatch of reason.contract) {
      lines.push(`    - ${formatArtifactMismatch(mismatch)}`);
    }
  }
  if (reason.kind === "malformed-outcome" && reason.candidateLine !== undefined) {
    lines.push(`  ${paint("Candidate outcome line:", ...KEY_STYLE)}`);
    lines.push(
      `${paint(AGENT_GUTTER, "dim")}${paint(reason.candidateLine, ...AGENT_STYLE)}`,
    );
  }
  return lines;
}

/**
 * Build the terminal `Display`. Normal operational output goes to stdout;
 * warnings and errors go to stderr. Color is emitted only on a TTY with color
 * enabled, carries no meaning on its own, and no spinner or cursor-control
 * sequence is ever written, so piped streams stay clean.
 */
export function createTerminalDisplay(options: DisplayOptions): Display {
  const paint = createPainter(options);

  /** Write harness output behind the agent gutter, so it never reads as an
   * executor line. The gutter and the requested style are applied per line, so
   * multi-line output keeps both all the way down. */
  const emitAgent = (text: string, ...codes: Ansi[]): void => {
    const gutter = paint(AGENT_GUTTER, "dim");
    emit(
      options.stdout,
      text
        .split("\n")
        .map((line) => `${gutter}${paint(line, ...codes)}`)
        .join("\n"),
    );
  };

  return {
    attemptStarted(info) {
      // A first attempt is the ordinary case and says nothing worth a reader's
      // attention; a retry is the exception the header should surface.
      const retry = info.attempt > 1 ? ` · attempt ${info.attempt}` : "";
      const title = `Stage ${info.stagePosition} · ${info.stageId}${retry}`;
      const width = keyWidth("Harness", "Model", "Log");
      emit(
        options.stdout,
        [
          "",
          paint(title, ...STAGE_STYLE),
          infoLine(paint, STAGE_INDENT, "Harness", info.harness, width),
          infoLine(paint, STAGE_INDENT, "Model", info.model, width),
          infoLine(paint, STAGE_INDENT, "Log", info.logAbsPath, width),
          "",
        ].join("\n"),
      );
    },

    harnessEvent(event: HarnessEvent) {
      if (event.type === "text") {
        emitAgent(event.text, ...AGENT_STYLE);
        return;
      }
      const call = `${event.name}(${truncateArgs(event.args)})`;
      emitAgent(`${paint("→", "dim")} ${paint(call, ...AGENT_STYLE)}`);
    },

    heartbeat(elapsedMs) {
      emit(
        options.stdout,
        `${STAGE_INDENT}${paint(
          `· still working — elapsed ${formatDuration(elapsedMs)}`,
          "dim",
        )}`,
      );
    },

    stageSucceeded(info) {
      emit(
        options.stdout,
        [
          "",
          `${STAGE_INDENT}${paint(
            `Stage ${info.stagePosition} done in ${formatDuration(info.durationMs)} ✅`,
            "green",
          )}`,
        ].join("\n"),
      );
    },

    stageStopped(info) {
      const { verb, icon, color } = STAGE_DISPOSITION[info.disposition];
      emit(
        options.stdout,
        [
          "",
          `${STAGE_INDENT}${paint(
            `Stage ${info.stagePosition} ${verb} in ${formatDuration(info.durationMs)} ${icon}`,
            color,
          )}`,
        ].join("\n"),
      );
    },

    runPaused(info) {
      const line = (key: string, value: string): string =>
        infoLine(paint, "  ", key, value, CLOSING_WIDTH);
      const reasons = orderedReasons(info.waiting);

      const lines = runSummaryBlock(paint, info);
      // Several reasons can hold at once, and none of them outranks the others
      // for a reader: each is announced in full.
      if (reasons.length > 1) {
        lines.push("", paint(`Run stopped for ${reasons.length} reasons:`, "bold"));
      }
      for (const reason of reasons) {
        lines.push(...reasonBlock(paint, reason, info.currentStage));
      }

      // The instruction and the command close the run, so the last thing on
      // screen is the thing to type next. They belong to the run rather than to
      // any one reason above them, and the label is what says so.
      lines.push(`  ${paint(ACTION_HEADER, "dim")}`);
      if (info.waiting.nextAction !== undefined) {
        lines.push(line("Next", info.waiting.nextAction));
      }
      if (info.logAbsPath !== null) {
        lines.push(line("Log", info.logAbsPath));
      }
      if (info.continuationCommand !== undefined) {
        lines.push(line("Continue", info.continuationCommand));
      }
      lines.push(line("Resume", info.resumeCommand));
      emit(options.stdout, lines.join("\n"));
    },

    runCompleted(info) {
      const lines = runSummaryBlock(paint, info);
      lines.push(
        "",
        paint(
          `SUCCESS — ${info.stageCount}/${info.stageCount} stages completed ✅`,
          "bold",
          "green",
        ),
      );
      emit(options.stdout, lines.join("\n"));
    },

    runInterrupted(info) {
      const line = (key: string, value: string): string =>
        infoLine(paint, "  ", key, value, CLOSING_WIDTH);
      const lines = runSummaryBlock(paint, info);
      lines.push(
        "",
        paint("INTERRUPTED ⏹️", "bold", "yellow"),
        line(
          "Reason",
          `Stopped by ${info.signal} between stages; the checkpoint is unchanged.`,
        ),
        `  ${paint(ACTION_HEADER, "dim")}`,
        line("Resume", info.resumeCommand),
      );
      emit(options.stdout, lines.join("\n"));
    },

    runFailed(info) {
      const line = (key: string, value: string): string =>
        infoLine(paint, "  ", key, value, CLOSING_WIDTH);
      const lines = runSummaryBlock(paint, info);
      lines.push(
        "",
        paint("FAILED — checkpoint write ❌", "bold", "red"),
        line("Reason", info.message),
      );
      emit(options.stdout, lines.join("\n"));
    },

    warn(message) {
      emit(options.stderr, paint(`warning: ${message}`, "yellow"));
    },
  };
}
