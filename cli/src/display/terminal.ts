import type { HarnessEvent } from "../harness/types.js";
import type { WaitingInfo } from "../state/checkpoint.js";
import type { Display } from "./types.js";

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

/** Displayed tool-call arguments are truncated to this many characters; the
 * full data always survives untouched in the attempt log. */
const TOOL_ARG_DISPLAY_LIMIT = 160;

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
} as const;

type Ansi = Exclude<keyof typeof ANSI, "reset">;

/**
 * Structural guard for AC-1.5: no rendered output line may begin with
 * `Outcome:`. Any candidate line that would (e.g. an echoed malformed-outcome
 * line carrying `Outcome: DONEish`) is prefixed with a space so the guarantee
 * holds even for adversarial waiting objects.
 */
function guardLine(line: string): string {
  return line.startsWith("Outcome:") ? ` ${line}` : line;
}

/** Split a block into lines, guard each, and write it as one newline-terminated
 * chunk. Color codes wrap whole labels the renderer controls, never arbitrary
 * echoed content, so the guard's literal prefix check is sufficient. */
function emit(stream: NodeJS.WritableStream, text: string): void {
  const guarded = text.split("\n").map(guardLine).join("\n");
  stream.write(`${guarded}\n`);
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
 * The prominent multi-line unrestricted-permissions warning. Emitted to
 * `stderr` and reused verbatim by both the run and resume startup paths
 * whenever the persisted permission choice is unrestricted.
 */
export function printUnrestrictedWarning(stderr: NodeJS.WritableStream): void {
  emit(
    stderr,
    [
      "************************************************************",
      "  WARNING: running with --dangerously-skip-permissions",
      "  The harness runs with no permission prompts: it can read,",
      "  modify, and delete files and execute arbitrary commands.",
      "  Only use this in an isolated or otherwise trusted setup.",
      "************************************************************",
    ].join("\n"),
  );
}

/**
 * Render the compact new-run/resume startup summary to stdout — run ID,
 * recipe, thread, workspace, permission mode, and stage count — and emit the
 * prominent unrestricted warning to stderr when permissions are unrestricted.
 */
export function printRunSummary(
  options: DisplayOptions,
  info: {
    runId: string;
    recipeName: string;
    threadRelPath: string;
    workspacePath: string;
    dangerouslySkipPermissions: boolean;
    stageCount: number;
  },
): void {
  const useColor = options.isTTY && !options.noColor;
  const paint = (text: string, code: Ansi): string =>
    useColor ? `${ANSI[code]}${text}${ANSI.reset}` : text;

  const permissionMode = info.dangerouslySkipPermissions
    ? "unrestricted (--dangerously-skip-permissions)"
    : "restricted";

  emit(
    options.stdout,
    [
      paint("Run summary", "bold"),
      `  Run:         ${info.runId}`,
      `  Recipe:      ${info.recipeName}`,
      `  Thread:      ${info.threadRelPath}`,
      `  Workspace:   ${info.workspacePath}`,
      `  Permissions: ${permissionMode}`,
      `  Stages:      ${info.stageCount}`,
    ].join("\n"),
  );

  if (info.dangerouslySkipPermissions) {
    printUnrestrictedWarning(options.stderr);
  }
}

/**
 * Build the terminal `Display`. Normal operational output goes to stdout;
 * warnings and errors go to stderr. Color is emitted only on a TTY with color
 * enabled, carries no meaning on its own, and no spinner or cursor-control
 * sequence is ever written, so piped streams stay clean.
 */
export function createTerminalDisplay(options: DisplayOptions): Display {
  const useColor = options.isTTY && !options.noColor;
  const paint = (text: string, code: Ansi): string =>
    useColor ? `${ANSI[code]}${text}${ANSI.reset}` : text;

  return {
    attemptStarted(info) {
      emit(
        options.stdout,
        [
          paint(
            `▶ Stage ${info.stagePosition} [${info.stageId}]`,
            "cyan",
          ),
          `  Harness: ${info.harness}/${info.model}`,
          `  Attempt: ${info.attempt}`,
          `  Log:     ${info.logAbsPath}`,
        ].join("\n"),
      );
    },

    harnessEvent(event: HarnessEvent) {
      if (event.type === "text") {
        emit(options.stdout, event.text);
        return;
      }
      emit(
        options.stdout,
        `${paint("→", "dim")} ${event.name}(${truncateArgs(event.args)})`,
      );
    },

    heartbeat(elapsedMs) {
      emit(
        options.stdout,
        paint(`· still working — elapsed ${formatDuration(elapsedMs)}`, "dim"),
      );
    },

    stageSucceeded(info) {
      emit(
        options.stdout,
        paint(
          `✓ Stage ${info.stagePosition} succeeded in ${formatDuration(info.durationMs)}`,
          "green",
        ),
      );
    },

    runPaused(info: {
      waiting: WaitingInfo;
      runId: string;
      logAbsPath: string | null;
      resumeCommand: string;
      checkpointPath: string;
    }) {
      const lines: string[] = [
        paint("Waiting for user", "yellow"),
        `  Reason: ${info.waiting.message}`,
      ];
      if (info.waiting.pendingFiles && info.waiting.pendingFiles.length > 0) {
        lines.push("  Pending:");
        for (const file of info.waiting.pendingFiles) {
          lines.push(`    - ${file}`);
        }
      }
      if (info.logAbsPath !== null) {
        lines.push(`  Log: ${info.logAbsPath}`);
      }
      lines.push(`  Run: ${info.runId}`);
      lines.push(`  Resume: ${info.resumeCommand}`);
      emit(options.stdout, lines.join("\n"));

      // Echo any candidate outcome line raw so a human sees exactly what the
      // harness produced; `emit`'s per-line guard keeps it from ever beginning
      // the rendered line with `Outcome:`.
      if (info.waiting.candidateLine !== undefined) {
        emit(options.stdout, "  Candidate outcome line:");
        emit(options.stdout, info.waiting.candidateLine);
      }
    },

    runCompleted(info) {
      emit(
        options.stdout,
        [
          paint("Completed", "green"),
          `  Run:        ${info.runId}`,
          `  Recipe:     ${info.recipeName}`,
          `  Elapsed:    ${formatDuration(info.totalElapsedMs)}`,
          `  Checkpoint: ${info.checkpointPath}`,
        ].join("\n"),
      );
    },

    warn(message) {
      emit(options.stderr, paint(`warning: ${message}`, "yellow"));
    },
  };
}
