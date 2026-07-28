import { Writable } from "node:stream";

import { describe, expect, it } from "vitest";

import { governedBy } from "../test-helpers/waiting.js";
import type { Display, StageDisposition } from "./types.js";
import {
  createTerminalDisplay,
  printRunSummary,
  printScriptedModeStartup,
  printScriptedResolvedPrompt,
  printUnrestrictedWarning,
  type DisplayOptions,
} from "./terminal.js";

/** An in-memory writable stream that accumulates everything written to it. */
class Capture extends Writable {
  chunks: string[] = [];
  override _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    this.chunks.push(chunk.toString());
    callback();
  }
  get text(): string {
    return this.chunks.join("");
  }
  get lines(): string[] {
    return this.text.split("\n");
  }
}

function makeOptions(
  overrides: Partial<Pick<DisplayOptions, "isTTY" | "noColor">> = {},
): { options: DisplayOptions; out: Capture; err: Capture } {
  const out = new Capture();
  const err = new Capture();
  const options: DisplayOptions = {
    stdout: out,
    stderr: err,
    isTTY: false,
    noColor: true,
    ...overrides,
  };
  return { options, out, err };
}

const ANSI_PATTERN = /\x1b\[\d+m/;

describe("attemptStarted", () => {
  const attempt = {
    stagePosition: "2/5",
    stageId: "plan",
    harness: "codex",
    model: "gpt-5",
    attempt: 1,
    logAbsPath: "/runs/r1/logs/2-plan-1.log",
  };

  it("prints stage position/ID, harness, model, and log path to stdout", () => {
    const { options, out, err } = makeOptions();
    createTerminalDisplay(options).attemptStarted(attempt);
    expect(out.text).toContain("2/5");
    expect(out.text).toContain("plan");
    expect(out.text).toContain("Harness: codex");
    expect(out.text).toContain("Model:   gpt-5");
    expect(out.text).toContain("/runs/r1/logs/2-plan-1.log");
    expect(err.text).toBe("");
  });

  it("says nothing about the attempt on a first attempt", () => {
    const { options, out } = makeOptions();
    createTerminalDisplay(options).attemptStarted(attempt);
    expect(out.text).not.toContain("attempt");
  });

  it("names the attempt number on a retry", () => {
    const { options, out } = makeOptions();
    createTerminalDisplay(options).attemptStarted({ ...attempt, attempt: 3 });
    expect(out.text).toContain("attempt 3");
  });

  it("indents every line under the stage header, leaving the header flush", () => {
    const { options, out } = makeOptions();
    createTerminalDisplay(options).attemptStarted(attempt);
    const lines = out.lines.filter((line) => line.length > 0);
    expect(lines[0]).toBe("Stage 2/5 · plan");
    for (const line of lines.slice(1)) {
      expect(line.startsWith("  ")).toBe(true);
    }
  });
});

describe("stage-body indentation", () => {
  /** Everything the executor writes under a stage header is indented to the
   * gutter's width; quoted harness output leans on the gutter instead. */
  it("indents the executor's own stage lines and leaves harness output flush", () => {
    const { options, out } = makeOptions();
    const display = createTerminalDisplay(options);
    display.heartbeat(5 * 60 * 1000);
    display.stageSucceeded({ stagePosition: "1/5", durationMs: 1000 });
    display.stageStopped({
      stagePosition: "2/5",
      durationMs: 1000,
      disposition: "blocked",
    });
    display.harnessEvent({ type: "text", text: "hello from the model" });

    for (const line of out.lines.filter((line) => line.length > 0)) {
      const indented = line.startsWith("  ");
      const quoted = line.startsWith("│ ");
      expect(indented || quoted).toBe(true);
      // The gutter is exactly as wide as the indent, so the two columns align.
      expect(indented && quoted).toBe(false);
    }
  });
});

describe("harnessEvent", () => {
  it("renders assistant text as-is to stdout", () => {
    const { options, out } = makeOptions();
    createTerminalDisplay(options).harnessEvent({
      type: "text",
      text: "hello from the model",
    });
    expect(out.text).toContain("│ hello from the model");
  });

  it("renders a tool call as one concise line with truncated arguments", () => {
    const { options, out } = makeOptions();
    const longArgs = "x".repeat(500);
    createTerminalDisplay(options).harnessEvent({
      type: "tool-call",
      name: "Bash",
      args: longArgs,
    });
    const rendered = out.text;
    expect(rendered).toContain("│ ");
    expect(rendered).toContain("Bash(");
    expect(rendered).toContain("…");
    // Truncation happens in the display only: the full 500-char payload is not
    // present in the rendered line.
    expect(rendered).not.toContain(longArgs);
    // Concise: a single rendered line for the tool call.
    expect(out.text.trimEnd().split("\n")).toHaveLength(1);
  });
});

describe("heartbeat", () => {
  it("prints elapsed time to stdout", () => {
    const { options, out, err } = makeOptions();
    createTerminalDisplay(options).heartbeat(5 * 60 * 1000);
    expect(out.text).toContain("5m");
    expect(err.text).toBe("");
  });
});

describe("stageSucceeded", () => {
  it("prints position and duration, with the success mark trailing", () => {
    const { options, out } = makeOptions();
    createTerminalDisplay(options).stageSucceeded({
      stagePosition: "1/5",
      durationMs: 90_000,
    });
    expect(out.text).toContain("Stage 1/5 done in 1m 30s ✅");
  });
});

describe("stageStopped", () => {
  const stopped = (disposition: StageDisposition): string => {
    const { options, out } = makeOptions();
    createTerminalDisplay(options).stageStopped({
      stagePosition: "2/6",
      durationMs: 41_000,
      disposition,
    });
    return out.text;
  };

  it("names each disposition with its own word and mark", () => {
    expect(stopped("refused")).toContain("Stage 2/6 refused in 41s ⛔");
    expect(stopped("blocked")).toContain("Stage 2/6 blocked in 41s 🛑");
    expect(stopped("failed")).toContain("Stage 2/6 failed in 41s ❌");
    expect(stopped("interrupted")).toContain("Stage 2/6 interrupted in 41s ⏹️");
  });

  it("gives blocked and failed distinguishable marks", () => {
    expect(stopped("blocked")).not.toContain("❌");
    expect(stopped("failed")).not.toContain("🛑");
  });
});

describe("runPaused", () => {
  const waiting = governedBy({
    kind: "pending-queues",
    message: "Two pending decisions must be settled before continuing.",
    pendingFiles: ["docs/threads/t/.pending-decisions/a.md"],
  });

  const paused = (
    info: Partial<Parameters<Display["runPaused"]>[0]> = {},
  ): { out: Capture; err: Capture } => {
    const { options, out, err } = makeOptions();
    createTerminalDisplay(options).runPaused({
      waiting,
      runId: "260723T00Z-run",
      pipelineName: "standard",
      totalElapsedMs: 64_000,
      logAbsPath: "/runs/r1/logs/1-x-1.log",
      resumeCommand: "antmay afk resume 260723T00Z-run",
      checkpointPath: "/runs/r1/state.json",
      ...info,
    });
    return { out, err };
  };

  it("names the Waiting for user banner and prints reason, pending, log, run, resume", () => {
    const { out, err } = paused();
    expect(out.text).toContain("WAITING FOR USER ⏸️");
    expect(out.text).toContain(waiting.reasons[0].message);
    expect(out.text).toContain("docs/threads/t/.pending-decisions/a.md");
    expect(out.text).toContain("/runs/r1/logs/1-x-1.log");
    expect(out.text).toContain("260723T00Z-run");
    expect(out.text).toContain("antmay afk resume 260723T00Z-run");
    expect(err.text).toBe("");
  });

  it("closes the run with the same identity a completed run reports", () => {
    const { out } = paused();
    expect(out.text).toContain("Run summary");
    expect(out.text).toContain("Pipeline:");
    expect(out.text).toContain("standard");
    expect(out.text).toContain("1m 4s");
    expect(out.text).toContain("/runs/r1/state.json");
  });

  it("leaves the resume command as the last thing on screen", () => {
    const { out } = paused();
    const lines = out.text.trimEnd().split("\n");
    expect(lines[lines.length - 1]).toContain(
      "Resume:     antmay afk resume 260723T00Z-run",
    );
  });

  it("announces every reason a pause stopped for, stage reason before queue reason", () => {
    const { out } = paused({
      waiting: {
        reasons: [
          {
            kind: "pending-queues",
            message: "A pending bundle file awaits human resolution.",
            pendingFiles: ["docs/threads/t/.pending-decisions/a.md"],
          },
          {
            kind: "outcome-refused",
            message: "The stage reported Outcome: REFUSED and paused for human attention.",
            detail: "Spec section 3 contradicts the seed",
          },
        ],
      },
    });
    expect(out.text).toContain("Run stopped for 2 reasons:");
    expect(out.text).toContain("REFUSED ⛔");
    expect(out.text).toContain("WAITING FOR USER ⏸️");
    expect(out.text).toContain("Spec section 3 contradicts the seed");
    // The stage's own result is read first; the queue reason sits next to the
    // command that acts on it.
    expect(out.text.indexOf("REFUSED ⛔")).toBeLessThan(
      out.text.indexOf("WAITING FOR USER ⏸️"),
    );
  });

  it("says nothing about a reason count when only one reason holds", () => {
    const { out } = paused();
    expect(out.text).not.toContain("reasons:");
  });

  it("labels the closing lines in place, leaving no unexplained gap", () => {
    const { out } = paused({
      waiting: governedBy(
        {
          kind: "outcome-blocked",
          message:
            "The stage reported Outcome: BLOCKED and paused for human attention.",
          detail: "needs input",
        },
        { nextAction: "Revert or commit the changes before resuming." },
      ),
    });
    const lines = out.lines;
    // Every blank line is a block opener: the line after it introduces a
    // section, never a bare `key: value` continuation of the block above.
    lines.forEach((line, index) => {
      if (line.length > 0 || index === lines.length - 1) return;
      const next = lines[index + 1];
      expect(next.startsWith("  ")).toBe(false);
      expect(next.length).toBeGreaterThan(0);
    });
    // The label sits at the keys' own indent and needs no gap to set it apart.
    expect(lines).toContain("  What to do");
    expect(out.text.indexOf("What to do")).toBeLessThan(out.text.indexOf("Next:"));
  });

  it("gives the agent's reason and the human's next action their own lines", () => {
    const { out } = paused({
      waiting: governedBy(
        {
          kind: "outcome-blocked",
          message:
            "The stage reported Outcome: BLOCKED and paused for human attention.",
          detail: "Fake pause; no files changed",
        },
        { nextAction: "Revert or commit the changes before resuming." },
      ),
    });
    expect(out.text).toContain("Detail:");
    expect(out.text).toContain("Fake pause; no files changed");
    expect(out.text).toContain("Next:");
    expect(out.text).toContain("Revert or commit the changes before resuming.");
    // The reason states what happened and nothing else.
    const reason = out.lines.find((line) => line.includes("Reason:"));
    expect(reason).toContain("paused for human attention.");
    expect(reason).not.toContain("Fake pause");
    expect(reason).not.toContain("Revert or commit");
  });

  it("omits detail and next-action lines when the pause carries neither", () => {
    const { out } = paused({
      waiting: governedBy({ kind: "gate-error", message: "gate failed" }),
    });
    expect(out.text).not.toContain("Detail:");
    expect(out.text).not.toContain("Next:");
  });

  it("omits the log line when no attempt was allocated", () => {
    const { out } = paused({
      waiting: governedBy({ kind: "gate-error", message: "gate failed" }),
      logAbsPath: null,
    });
    expect(out.text).not.toContain("Log:");
  });

  it("renders Continue after Log and before Resume when a continuation command is supplied", () => {
    const { out } = paused({
      continuationCommand: "codex resume 'sess-1'",
    });
    expect(out.text).toContain("Continue:   codex resume 'sess-1'");
    expect(out.text).toContain("Log:");
    expect(out.text).toContain("Resume:");
    expect(out.text).not.toContain("Harness:");
    expect(out.text).not.toMatch(/clean.?worktree/i);
    const continueAt = out.text.indexOf("Continue:");
    const resumeAt = out.text.indexOf("Resume:");
    const logAt = out.text.indexOf("Log:");
    expect(logAt).toBeGreaterThan(-1);
    expect(continueAt).toBeGreaterThan(logAt);
    expect(resumeAt).toBeGreaterThan(continueAt);
    const lines = out.text.trimEnd().split("\n");
    expect(lines[lines.length - 1]).toContain(
      "Resume:     antmay afk resume 260723T00Z-run",
    );
  });

  it("omits Continue when no continuation command is provided", () => {
    const { out } = paused();
    expect(out.text).not.toContain("Continue:");
    expect(out.text).toContain("Log:");
    expect(out.text).toContain("Resume:");
    expect(out.text).not.toMatch(/clean.?worktree/i);
  });

  it("echoes a malformed candidate line verbatim, behind the gutter that marks it as quoted", () => {
    const { out } = paused({
      waiting: governedBy({
        kind: "malformed-outcome",
        message: "The final line was not a recognized outcome.",
        candidateLine: "Outcome: DONEish",
      }),
    });
    // The candidate text is surfaced verbatim, quoted rather than authored: it
    // is never a line antmay appears to have written itself.
    expect(out.text).toContain("│ Outcome: DONEish");
    expect(out.lines.some((line) => line.startsWith("Outcome:"))).toBe(false);
  });

  it("announces an unmet prerequisite and lists every artifact it names", () => {
    const { out } = paused({
      waiting: governedBy(
        {
          kind: "stage-prerequisite-unmet",
          message:
            "The stage cannot start: it requires a non-empty spec.md, " +
            "a non-empty plan.md and a plan-tasks/ folder holding at least one " +
            "non-empty .md task file, but the thread's current artifact state " +
            "has no spec.md, a non-empty plan.md and no plan-tasks/ folder.",
          contract: [
            { dimension: "spec", expected: true, observed: false },
            { dimension: "plan", expected: "strict", observed: "brief" },
          ],
        },
        {
          nextAction:
            "Restore the artifacts listed above and leave the worktree clean, then resume.",
        },
      ),
      logAbsPath: null,
    });
    expect(out.text).toContain("FAILED — stage prerequisite unmet ❌");
    expect(out.text).toContain("Artifacts:");
    // Each row reads as the concrete files it is about, in the same words the
    // sentence above it used.
    expect(out.text).toContain("- expected a non-empty spec.md, found no spec.md");
    expect(out.text).toContain(
      "- expected a non-empty plan.md and a plan-tasks/ folder holding at least " +
        "one non-empty .md task file, found a non-empty plan.md and no " +
        "plan-tasks/ folder",
    );
    // The action line is the pause's own instruction, not a restatement of the
    // rows: restore what the list named, leave the tree clean, resume.
    expect(out.text).toContain("Next:");
    expect(out.text).toContain(
      "Restore the artifacts listed above and leave the worktree clean, then resume.",
    );
  });

  it("announces a promised artifact the stage never left behind", () => {
    const { out } = paused({
      waiting: governedBy({
        kind: "stage-contract-violation",
        message: "The stage reported DONE without leaving the state it promises.",
        contract: [
          { dimension: "implementationReport", expected: true, observed: false },
        ],
      }),
    });
    expect(out.text).toContain("FAILED — promised artifact state unmet ❌");
    expect(out.text).toContain(
      "- expected a non-empty implementation-report.md, found no implementation-report.md",
    );
    // The rendering names files, never the executor's internal dimension keys.
    expect(out.text).not.toContain("implementationReport");
  });

  it("lists no artifact block for a reason that carries no contract", () => {
    const { out } = paused();
    expect(out.text).not.toContain("Artifacts:");
  });

  it("does not echo a candidate line the reason already accounts for", () => {
    const { out } = paused({
      waiting: governedBy({
        kind: "outcome-blocked",
        message:
          "The stage reported Outcome: BLOCKED and paused for human attention.",
        detail: "needs input",
        candidateLine: "Outcome: BLOCKED — needs input",
      }),
    });
    expect(out.text).not.toContain("Candidate outcome line:");
    expect(out.text).not.toContain("│ Outcome: BLOCKED");
  });
});

describe("runCompleted", () => {
  it("prints the identity block and closes on the success banner", () => {
    const { options, out } = makeOptions();
    createTerminalDisplay(options).runCompleted({
      runId: "run-1",
      pipelineName: "standard",
      totalElapsedMs: 3_723_000,
      checkpointPath: "/runs/run-1/state.json",
      stageCount: 6,
    });
    expect(out.text).toContain("Run summary");
    expect(out.text).toContain("run-1");
    expect(out.text).toContain("standard");
    expect(out.text).toContain("1h 2m 3s");
    expect(out.text).toContain("/runs/run-1/state.json");
    const lines = out.text.trimEnd().split("\n");
    expect(lines[lines.length - 1]).toBe("SUCCESS — 6/6 stages completed ✅");
  });

  it("paints the success banner green on a color-enabled TTY", () => {
    const { options, out } = makeOptions({ isTTY: true, noColor: false });
    createTerminalDisplay(options).runCompleted({
      runId: "run-1",
      pipelineName: "standard",
      totalElapsedMs: 1000,
      checkpointPath: "/runs/run-1/state.json",
      stageCount: 6,
    });
    expect(out.text).toContain("\x1b[32m");
  });
});

describe("runInterrupted", () => {
  it("reports the signal, says the checkpoint is unchanged, and ends on resume", () => {
    const { options, out } = makeOptions();
    createTerminalDisplay(options).runInterrupted({
      runId: "run-2",
      pipelineName: "standard",
      totalElapsedMs: 5000,
      checkpointPath: "/runs/run-2/state.json",
      resumeCommand: "antmay afk resume run-2",
      signal: "SIGINT",
    });
    expect(out.text).toContain("Run summary");
    expect(out.text).toContain("INTERRUPTED ⏹️");
    expect(out.text).toContain("SIGINT");
    expect(out.text).toContain("checkpoint is unchanged");
    const lines = out.text.trimEnd().split("\n");
    expect(lines[lines.length - 1]).toContain("antmay afk resume run-2");
  });
});

describe("runFailed", () => {
  it("names the checkpoint-write failure and offers no resume command", () => {
    const { options, out, err } = makeOptions();
    createTerminalDisplay(options).runFailed({
      runId: "run-3",
      pipelineName: "standard",
      totalElapsedMs: 5000,
      checkpointPath: "/runs/run-3/state.json",
      message: "ENOSPC writing state.json",
    });
    expect(out.text).toContain("FAILED — checkpoint write ❌");
    expect(out.text).toContain("ENOSPC writing state.json");
    // The state on disk is not known to reflect the run, so no resume is offered.
    expect(out.text).not.toContain("Resume:");
    expect(err.text).toBe("");
  });
});

describe("warn", () => {
  it("routes warnings to stderr, not stdout", () => {
    const { options, out, err } = makeOptions();
    createTerminalDisplay(options).warn("disk is nearly full");
    expect(err.text).toContain("disk is nearly full");
    expect(out.text).toBe("");
  });
});

describe("color discipline", () => {
  it("emits no ANSI codes when not a TTY", () => {
    const { options, out } = makeOptions({ isTTY: false, noColor: false });
    createTerminalDisplay(options).stageSucceeded({
      stagePosition: "1/1",
      durationMs: 1000,
    });
    expect(ANSI_PATTERN.test(out.text)).toBe(false);
  });

  it("emits no ANSI codes when noColor is set even on a TTY", () => {
    const { options, out } = makeOptions({ isTTY: true, noColor: true });
    createTerminalDisplay(options).stageSucceeded({
      stagePosition: "1/1",
      durationMs: 1000,
    });
    expect(ANSI_PATTERN.test(out.text)).toBe(false);
  });

  it("emits ANSI codes on a TTY with color enabled", () => {
    const { options, out } = makeOptions({ isTTY: true, noColor: false });
    createTerminalDisplay(options).stageSucceeded({
      stagePosition: "1/1",
      durationMs: 1000,
    });
    expect(ANSI_PATTERN.test(out.text)).toBe(true);
    // Color carries no meaning: the content survives with codes stripped.
    expect(out.text.replace(new RegExp(ANSI_PATTERN, "g"), "")).toContain("1/1");
  });
});

describe("printRunSummary", () => {
  type SummaryInfo = Parameters<typeof printRunSummary>[1];
  const info: SummaryInfo = {
    runId: "run-9",
    pipelineName: "standard",
    pipelineSourcePath: "/cfg/pipelines/standard.json",
    profileSelection: { kind: "settings-only" } as const,
    threadRelPath: "docs/threads/t",
    workspacePath: "/repo",
    dangerouslySkipPermissions: false,
    stages: [
      {
        id: "spec",
        harness: "codex",
        model: "gpt-5",
        target: "docs/threads/t/",
      },
      {
        id: "reconcile-spec",
        harness: "claude-code",
        model: "claude-sonnet-5",
        target: "docs/threads/t/spec.md",
      },
    ],
  };

  /** The block with color codes removed, as a list of lines. */
  function render(overrides: Partial<SummaryInfo> = {}): string[] {
    const { options, out } = makeOptions();
    printRunSummary(options, { ...info, ...overrides });
    return out.text.replace(new RegExp(ANSI_PATTERN, "g"), "").split("\n");
  }

  it("prints the run identity, thread, workspace, and permission mode", () => {
    const { options, out, err } = makeOptions();
    printRunSummary(options, info);
    expect(out.text).toContain("run-9");
    expect(out.text).toContain("docs/threads/t");
    expect(out.text).toContain("/repo");
    expect(out.text).toContain("restricted");
    // No unrestricted warning when permissions are restricted.
    expect(err.text).toBe("");
  });

  it("prints the pipeline's declared name with the source it was read from", () => {
    expect(render()).toContainEqual(
      expect.stringContaining("standard (/cfg/pipelines/standard.json)"),
    );
  });

  it("reports `settings only` when no execution profile was selected", () => {
    const profileLine = render().find((line) => line.includes("Profile:"));
    expect(profileLine).toContain("settings only");
  });

  it("prints a selected profile's declared name with its source", () => {
    const profileLine = render({
      profileSelection: {
        kind: "profile",
        name: "quality",
        sourcePath: "/cfg/profiles/quality.json",
      },
    }).find((line) => line.includes("Profile:"));
    expect(profileLine).toContain("quality (/cfg/profiles/quality.json)");
  });

  it("omits the entry-point line when the invocation named no `--from`", () => {
    expect(render().some((line) => line.includes("From:"))).toBe(false);
  });

  it("prints the entry point when the invocation named one", () => {
    const fromLine = render({ fromStage: "reconcile-spec" }).find((line) =>
      line.includes("From:"),
    );
    expect(fromLine).toContain("reconcile-spec");
  });

  it("lists every stage in execution order with its harness, model, and target", () => {
    const lines = render();
    const first = lines.findIndex((line) => line.includes("1. spec"));
    const second = lines.findIndex((line) => line.includes("2. reconcile-spec"));
    expect(first).toBeGreaterThan(-1);
    expect(second).toBe(first + 1);
    expect(lines[first]).toContain("codex · gpt-5");
    expect(lines[first]).toContain("→ docs/threads/t/");
    expect(lines[second]).toContain("claude-code · claude-sonnet-5");
    expect(lines[second]).toContain("→ docs/threads/t/spec.md");
  });

  it("aligns the stage columns so the targets share one column", () => {
    const lines = render();
    const rows = lines.filter((line) => /^ {4}\d+\. /.test(line));
    expect(rows.length).toBe(2);
    const arrows = new Set(rows.map((row) => row.indexOf("→")));
    expect(arrows.size).toBe(1);
  });

  it("asks nothing: the block ends without a prompt", () => {
    const { options, out, err } = makeOptions();
    printRunSummary(options, info);
    expect(out.text).not.toMatch(/[?]\s*$/);
    expect(out.text).not.toMatch(/\b(y\/n|confirm|continue\?)\b/i);
    expect(err.text).toBe("");
  });

  it("emits the prominent unrestricted warning to stderr when unrestricted", () => {
    const { options, out, err } = makeOptions();
    printRunSummary(options, { ...info, dangerouslySkipPermissions: true });
    expect(out.text).toContain("unrestricted");
    expect(err.text).toContain("WARNING");
    expect(err.text).toContain("--dangerously-skip-permissions");
    // Prominent: spans multiple lines.
    expect(err.text.trimEnd().split("\n").length).toBeGreaterThan(1);
  });
});

describe("printUnrestrictedWarning", () => {
  it("writes the boxed multi-line warning to stderr", () => {
    const { options, out, err } = makeOptions();
    printUnrestrictedWarning(options);
    expect(err.text).toContain("WARNING");
    // Boxed: every line is bordered by `*` and shares one width.
    const lines = err.text.trimEnd().split("\n");
    expect(lines.length).toBeGreaterThan(1);
    const widths = new Set(lines.map((line) => line.length));
    expect(widths.size).toBe(1);
    for (const line of lines) {
      expect(line.startsWith("*")).toBe(true);
      expect(line.endsWith("*")).toBe(true);
    }
    expect(out.text).toBe("");
  });

  it("paints the warning yellow on a color-enabled TTY", () => {
    const { options, err } = makeOptions({ isTTY: true, noColor: false });
    printUnrestrictedWarning(options);
    expect(err.text).toContain("\x1b[33m");
  });
});

describe("printScriptedModeStartup", () => {
  it("prints the scripted-harness block with every line marked [DEV]", () => {
    const { options, out } = makeOptions();
    printScriptedModeStartup(options, "/cfg/scripted-harness.json");
    const lines = out.lines.filter((line) => line.length > 0);
    expect(lines).toEqual([
      "[DEV] Scripted harness",
      "[DEV]   enabled: true",
      "[DEV]   config:  /cfg/scripted-harness.json",
    ]);
  });
});

describe("printScriptedResolvedPrompt", () => {
  it("prints a readable single-line prompt to stdout with [DEV] markers", () => {
    const { options, out, err } = makeOptions();
    printScriptedResolvedPrompt(options, "$spec `docs/threads/demo`.");

    expect(out.lines.filter((line) => line.startsWith("[DEV]"))).toEqual([
      "[DEV] Resolved prompt",
      "[DEV] $spec `docs/threads/demo`.",
    ]);
    expect(err.text).toBe("");
  });

  it("preserves natural multiline input with every physical line marked [DEV]", () => {
    const { options, out, err } = makeOptions();
    printScriptedResolvedPrompt(
      options,
      "$spec `docs/threads/demo`.\nPrefer small changes.\n",
    );

    expect(out.lines.filter((line) => line.startsWith("[DEV]"))).toEqual([
      "[DEV] Resolved prompt",
      "[DEV] $spec `docs/threads/demo`.",
      "[DEV] Prefer small changes.",
      "[DEV] ",
    ]);
    expect(out.text).not.toContain("\\n");
    expect(err.text).toBe("");
  });
});
