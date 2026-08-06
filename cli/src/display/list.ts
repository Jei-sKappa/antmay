import type { RunCondition } from "../state/checkpoint/types.js";
import type { Ansi, DisplayOptions } from "./format.js";
import { createPainter, emit, infoLine, keyWidth } from "./format.js";

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

const RUN_CONDITION: Record<
  RunCondition,
  { label: string; color: Ansi }
> = {
  ready: { label: "READY", color: "cyan" },
  "waiting-for-user": { label: "WAITING FOR USER", color: "yellow" },
  completed: { label: "COMPLETED", color: "green" },
  executing: { label: "EXECUTING (UNVERIFIED)", color: "magenta" },
};

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
