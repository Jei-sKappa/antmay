import type { HarnessEvent } from "../harness/types.js";
import type { WaitingInfo, WaitingKind, WaitingReason } from "../state/checkpoint.js";
import { waitingReasons } from "../state/checkpoint.js";
import type { Display, StageDisposition } from "./types.js";

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
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  brightBlue: "\x1b[94m",
  brightWhite: "\x1b[97m",
} as const;

type Ansi = Exclude<keyof typeof ANSI, "reset">;

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

/** Every `key:` label a closing block can print, so one alignment column serves
 * the identity block, the reason banners, and the closing action lines alike. */
const CLOSING_KEYS = [
  "Run ID",
  "Recipe",
  "Elapsed",
  "Checkpoint",
  "Reason",
  "Detail",
  "Pending",
  "Next",
  "Log",
  "Resume",
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
 * Render the compact new-run/resume startup details to stdout — run ID,
 * recipe, thread, workspace, permission mode, and the ordered stage IDs. When
 * permissions are unrestricted the prominent warning goes to stderr first, so
 * it leads the startup output rather than trailing it.
 */
export function printRunSummary(
  options: DisplayOptions,
  info: {
    runId: string;
    recipeName: string;
    threadRelPath: string;
    workspacePath: string;
    dangerouslySkipPermissions: boolean;
    stageIds: readonly string[];
  },
): void {
  const paint = createPainter(options);

  const permissionMode = info.dangerouslySkipPermissions
    ? "unrestricted (--dangerously-skip-permissions)"
    : "restricted";
  const width = keyWidth(
    "Run",
    "Recipe",
    "Thread",
    "Workspace",
    "Permissions",
    "Stages",
  );
  const line = (key: string, value: string): string =>
    infoLine(paint, "  ", key, value, width);

  if (info.dangerouslySkipPermissions) {
    printUnrestrictedWarning(options);
  }

  emit(
    options.stdout,
    [
      paint("Run details", "bold"),
      line("Run", info.runId),
      line("Recipe", info.recipeName),
      line("Thread", info.threadRelPath),
      line("Workspace", info.workspacePath),
      line("Permissions", permissionMode),
      line("Stages", info.stageIds.join(", ")),
    ].join("\n"),
  );
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
    recipeName: string;
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
    line("Recipe", info.recipeName),
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
  const all = waitingReasons(waiting);
  const inGroup = (group: "stage" | "queue"): WaitingReason[] =>
    all.filter((reason) => REASON_BANNER[reason.kind].group === group);
  return [...inGroup("stage"), ...inGroup("queue")];
}

/**
 * One reason's banner and its supporting lines. An unrecognizable terminal line
 * is echoed here behind the agent gutter that marks it quoted, because that line
 * is the whole of the complaint.
 */
function reasonBlock(paint: Painter, reason: WaitingReason): string[] {
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
        lines.push(...reasonBlock(paint, reason));
      }

      // The instruction and the command close the run, so the last thing on
      // screen is the thing to type next.
      lines.push("");
      if (info.waiting.nextAction !== undefined) {
        lines.push(line("Next", info.waiting.nextAction));
      }
      if (info.logAbsPath !== null) {
        lines.push(line("Log", info.logAbsPath));
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
        "",
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
