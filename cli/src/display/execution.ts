import type { HarnessEvent } from "../harness/types.js";
import type {
  WaitingInfo,
  WaitingKind,
  WaitingReason,
} from "../state/checkpoint.js";
import {
  describeArtifact,
  describeArtifactDimension,
  formatArtifactMismatch,
} from "../thread/artifacts.js";
import type { Ansi, DisplayOptions, Painter } from "./format.js";
import {
  KEY_STYLE,
  createPainter,
  emit,
  formatDuration,
  infoLine,
  keyWidth,
  truncateArgs,
  unmetRequirementsProblem,
} from "./format.js";
import type {
  CurrentStageInfo,
  ExecutionDisplay,
  StageDisposition,
} from "./types.js";

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
  paused: { verb: "paused", icon: "⏸️", color: "yellow" },
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
  "unexpected-head-movement": {
    label: "HEAD MOVED — review advised",
    icon: "⚠️",
    color: "yellow",
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
 * Build the terminal `ExecutionDisplay`. Normal operational output goes to
 * stdout; warnings and errors go to stderr. Color is emitted only on a TTY with
 * color enabled, carries no meaning on its own, and no spinner or cursor-control
 * sequence is ever written, so piped streams stay clean.
 */
export function createTerminalExecutionDisplay(
  options: DisplayOptions,
): ExecutionDisplay {
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
