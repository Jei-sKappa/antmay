import type { ProfileSelection } from "../state/checkpoint.js";
import type { DisplayOptions } from "./format.js";
import {
  KEY_STYLE,
  VALUE_STYLE,
  createPainter,
  emit,
  infoLine,
  keyWidth,
  pad,
  withGutter,
} from "./format.js";

/** Width of the boxed unrestricted-permissions warning, borders included. */
const WARNING_BOX_WIDTH = 62;

/** Prefix every line of developer-only diagnostic output carries. */
const DEV_PREFIX = "[DEV] ";

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
