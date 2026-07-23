import { appendFileSync, readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The real agent/sandbox factories are kept; only `run` is replaced so the
// invoker's error normalization can be driven with synthetic rejections.
vi.mock("@ai-hero/sandcastle", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@ai-hero/sandcastle")>();
  return { ...actual, run: vi.fn() };
});

import { run } from "@ai-hero/sandcastle";

import { createAttemptLog, attemptLogPaths } from "../state/logs.js";
import type { AttemptRequest, HarnessEvent } from "./types.js";
import {
  buildSandcastleRunOptions,
  createSandcastleInvoker,
  mapAgentStreamEvent,
} from "./sandcastle.js";

const runMock = vi.mocked(run);

function makeRequest(overrides: Partial<AttemptRequest> = {}): AttemptRequest {
  return {
    harness: "codex",
    model: "gpt-5",
    prompt: "$spec `docs/threads/260723121015Z-demo`.",
    idleTimeoutSeconds: 900,
    dangerouslySkipPermissions: false,
    workspace: { cwd: "/repo", sandbox: "none", branchStrategy: "head" },
    logFilePath: "/tmp/attempt.log",
    onEvent: () => {},
    signal: new AbortController().signal,
    ...overrides,
  };
}

const EXPECTED_OPTION_KEYS = [
  "agent",
  "sandbox",
  "cwd",
  "prompt",
  "maxIterations",
  "completionSignal",
  "completionTimeoutSeconds",
  "idleTimeoutSeconds",
  "branchStrategy",
  "logging",
  "signal",
].sort();

const ABSENT_OPTIONS = [
  "promptFile",
  "hooks",
  "promptArgs",
  "copyToWorktree",
  "output",
  "resumeSession",
  "forkSession",
  "timeouts",
  "name",
];

describe("buildSandcastleRunOptions", () => {
  it("maps the fixed non-agent options field-by-field", () => {
    const signal = new AbortController().signal;
    const options = buildSandcastleRunOptions(
      makeRequest({
        signal,
        idleTimeoutSeconds: 1234,
        workspace: { cwd: "/work/dir", sandbox: "none", branchStrategy: "head" },
        prompt: "hello world",
      }),
    );

    expect(options.cwd).toBe("/work/dir");
    expect(options.prompt).toBe("hello world");
    expect(options.maxIterations).toBe(1);
    expect(options.completionSignal).toEqual([
      "Outcome: DONE",
      "Outcome: BLOCKED",
      "Outcome: REFUSED",
    ]);
    expect(options.completionTimeoutSeconds).toBe(60);
    expect(options.idleTimeoutSeconds).toBe(1234);
    expect(options.branchStrategy).toEqual({ type: "head" });
    expect(options.sandbox.name).toBe("no-sandbox");
    expect(options.signal).toBe(signal);
  });

  it("passes distinct prompt values through unchanged", () => {
    expect(buildSandcastleRunOptions(makeRequest({ prompt: "" })).prompt).toBe(
      "",
    );
    const multi = "line one\nline two";
    expect(
      buildSandcastleRunOptions(makeRequest({ prompt: multi })).prompt,
    ).toBe(multi);
  });

  it("sets exactly the allowed options and nothing else", () => {
    const options = buildSandcastleRunOptions(makeRequest());
    expect(Object.keys(options).sort()).toEqual(EXPECTED_OPTION_KEYS);
    for (const key of ABSENT_OPTIONS) {
      expect(key in options).toBe(false);
    }
  });

  describe("codex agent + permission policy", () => {
    it("default mode uses auto-review with session capture off", () => {
      const options = buildSandcastleRunOptions(
        makeRequest({ harness: "codex", model: "gpt-5" }),
      );
      expect(options.agent.name).toBe("codex");
      expect(options.agent.captureSessions).toBe(false);
      const command = options.agent.buildPrintCommand({
        prompt: "p",
        dangerouslySkipPermissions: false,
      }).command;
      expect(command).toContain('approvals_reviewer="auto_review"');
      expect(command).toContain("-a on-request");
    });

    it("dangerous mode omits approvalsReviewer, keeping capture off", () => {
      const options = buildSandcastleRunOptions(
        makeRequest({ harness: "codex", dangerouslySkipPermissions: true }),
      );
      expect(options.agent.captureSessions).toBe(false);
      const command = options.agent.buildPrintCommand({
        prompt: "p",
        dangerouslySkipPermissions: true,
      }).command;
      expect(command).toContain("--dangerously-bypass-approvals-and-sandbox");
      expect(command).not.toContain("auto_review");
    });
  });

  describe("claude-code agent + permission policy", () => {
    it("default mode uses permissionMode auto with session capture off", () => {
      const options = buildSandcastleRunOptions(
        makeRequest({ harness: "claude-code", model: "claude-opus-4-8" }),
      );
      expect(options.agent.name).toBe("claude-code");
      expect(options.agent.captureSessions).toBe(false);
      // dangerouslySkipPermissions:true here proves permissionMode overrides it.
      const command = options.agent.buildPrintCommand({
        prompt: "p",
        dangerouslySkipPermissions: true,
      }).command;
      expect(command).toContain("--permission-mode auto");
      expect(command).not.toContain("--dangerously-skip-permissions");
    });

    it("dangerous mode omits permissionMode, keeping capture off", () => {
      const options = buildSandcastleRunOptions(
        makeRequest({
          harness: "claude-code",
          dangerouslySkipPermissions: true,
        }),
      );
      expect(options.agent.captureSessions).toBe(false);
      const command = options.agent.buildPrintCommand({
        prompt: "p",
        dangerouslySkipPermissions: true,
      }).command;
      expect(command).toContain("--dangerously-skip-permissions");
      expect(command).not.toContain("--permission-mode");
    });
  });
});

describe("mapAgentStreamEvent", () => {
  it("maps text events to text HarnessEvents", () => {
    expect(mapAgentStreamEvent({ type: "text", message: "hi" })).toEqual({
      type: "text",
      text: "hi",
    });
  });

  it("maps toolCall events to tool-call HarnessEvents", () => {
    expect(
      mapAgentStreamEvent({
        type: "toolCall",
        name: "Bash",
        formattedArgs: "ls -la",
      }),
    ).toEqual({ type: "tool-call", name: "Bash", args: "ls -la" });
  });

  it("drops raw and unrecognized events", () => {
    expect(mapAgentStreamEvent({ type: "raw" })).toBeNull();
    expect(mapAgentStreamEvent({ type: "text" })).toBeNull();
    expect(mapAgentStreamEvent({ type: "toolCall", name: "Bash" })).toBeNull();
  });

  it("bridges onAgentStreamEvent to onEvent, dropping raw lines", () => {
    const events: HarnessEvent[] = [];
    const options = buildSandcastleRunOptions(
      makeRequest({ onEvent: (event) => events.push(event) }),
    );
    const logging = options.logging;
    expect(logging?.type).toBe("file");
    if (logging?.type !== "file" || !logging.onAgentStreamEvent) {
      throw new Error("expected file logging with a stream handler");
    }
    logging.onAgentStreamEvent({
      type: "text",
      message: "chunk",
      iteration: 0,
      timestamp: new Date(),
    });
    logging.onAgentStreamEvent({
      type: "raw",
      line: "{json}",
      iteration: 0,
      timestamp: new Date(),
    });
    logging.onAgentStreamEvent({
      type: "toolCall",
      name: "Bash",
      formattedArgs: "echo hi",
      iteration: 0,
      timestamp: new Date(),
    });
    expect(events).toEqual([
      { type: "text", text: "chunk" },
      { type: "tool-call", name: "Bash", args: "echo hi" },
    ]);
  });
});

describe("createSandcastleInvoker error normalization", () => {
  beforeEach(() => {
    runMock.mockReset();
  });

  it("returns completed with the run's stdout as finalText", async () => {
    runMock.mockResolvedValue({ stdout: "final answer" } as never);
    const outcome = await createSandcastleInvoker().invoke(makeRequest());
    expect(outcome).toEqual({ kind: "completed", finalText: "final answer" });
  });

  it("classifies an aborted signal as aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    runMock.mockRejectedValue(new Error("The operation was aborted"));
    const outcome = await createSandcastleInvoker().invoke(
      makeRequest({ signal: controller.signal }),
    );
    expect(outcome).toEqual({
      kind: "failed",
      category: "aborted",
      errorClass: "Error",
      errorMessage: "The operation was aborted",
    });
  });

  it("classifies an AbortError name as aborted even without an aborted signal", async () => {
    const error = new Error("aborted");
    error.name = "AbortError";
    runMock.mockRejectedValue(error);
    const outcome = await createSandcastleInvoker().invoke(makeRequest());
    expect(outcome).toMatchObject({ kind: "failed", category: "aborted" });
  });

  it("classifies the idle-timeout error as idle-timeout", async () => {
    class AgentIdleTimeoutError extends Error {
      readonly _tag = "AgentIdleTimeoutError";
      constructor(message: string) {
        super(message);
        this.name = "AgentIdleTimeoutError";
      }
    }
    runMock.mockRejectedValue(new AgentIdleTimeoutError("Agent idle for 900s"));
    const outcome = await createSandcastleInvoker().invoke(makeRequest());
    expect(outcome).toEqual({
      kind: "failed",
      category: "idle-timeout",
      errorClass: "AgentIdleTimeoutError",
      errorMessage: "Agent idle for 900s",
    });
  });

  it("classifies any other rejection as provider-error", async () => {
    runMock.mockRejectedValue(new TypeError("boom"));
    const outcome = await createSandcastleInvoker().invoke(makeRequest());
    expect(outcome).toEqual({
      kind: "failed",
      category: "provider-error",
      errorClass: "TypeError",
      errorMessage: "boom",
    });
  });
});

describe("file logging integration", () => {
  let runDir: string;

  beforeEach(async () => {
    runDir = await mkdtemp(path.join(tmpdir(), "antmay-sc-"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("appends verbose output after the pre-written header, header first", async () => {
    const paths = attemptLogPaths(runDir, 1, "spec", 1);
    await createAttemptLog(paths, {
      runId: "20260723T121500123Z-0a1b2c3d",
      stageId: "spec",
      stageOrdinal: 1,
      attempt: 1,
      harness: "codex",
      model: "gpt-5",
      harnessVersion: "codex-cli 0.12.0",
      repoRoot: "/repo",
      threadRelPath: "docs/threads/260723121015Z-demo",
      startedAt: "2026-07-23T12:15:00.123Z",
    });

    const options = buildSandcastleRunOptions(
      makeRequest({ logFilePath: paths.absPath }),
    );
    const logging = options.logging;
    if (logging?.type !== "file") {
      throw new Error("expected file logging");
    }
    expect(logging.path).toBe(paths.absPath);
    expect(logging.verbose).toBe(true);

    // Simulate Sandcastle's verbose raw-line sink appending to the same file.
    appendFileSync(logging.path, "{stream line one}\n");
    appendFileSync(logging.path, "{stream line two}\n");

    const contents = readFileSync(paths.absPath, "utf8");
    expect(contents.startsWith("Run: 20260723T121500123Z-0a1b2c3d\n")).toBe(
      true,
    );
    const headerEnd = contents.indexOf("\n\n");
    expect(headerEnd).toBeGreaterThan(0);
    const appended = contents.slice(headerEnd + 2);
    expect(appended).toBe("{stream line one}\n{stream line two}\n");
  });
});
