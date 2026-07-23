import { asAttachmentHandle } from "@antmay/core";
import { describe, expect, it } from "vitest";
import {
  HerdrAdapter,
  HerdrAdapterError,
  herdrProgram,
  resolveHerdrExecutable,
} from "../src/adapters/herdr";
import type { SpawnSpec } from "../src/adapters/types";
import type {
  ProcessRunner,
  ProcessRunOptions,
  ProcessRunResult,
} from "../src/process/process-runner";

type Call = { program: string; args: string[]; cwd?: string };

type Responder = (program: string, args: readonly string[]) => ProcessRunResult;

class ScriptedRunner implements ProcessRunner {
  readonly calls: Call[] = [];
  constructor(
    private readonly responder: Responder,
    private readonly located: Record<string, string | null> = {},
  ) {}
  run(
    program: string,
    args: readonly string[],
    options?: ProcessRunOptions,
  ): ProcessRunResult {
    this.calls.push({ program, args: [...args], cwd: options?.cwd });
    return this.responder(program, args);
  }
  locate(program: string): string | null {
    return this.located[program] ?? null;
  }
}

const ok = (stdout = ""): ProcessRunResult => ({ code: 0, stdout, stderr: "" });
const fail = (stderr = "boom"): ProcessRunResult => ({
  code: 1,
  stdout: "",
  stderr,
});

const PANE_JSON = JSON.stringify({ result: { pane: { pane_id: "w1:p1" } } });
const PANE_WITH_TERMINAL_JSON = JSON.stringify({
  result: { pane: { pane_id: "w1:p1", terminal_id: "term_abc123" } },
});

function spawnSpec(overrides: Partial<SpawnSpec> = {}): SpawnSpec {
  return {
    command: "/bin/claude",
    args: ["--session-id", "abc"],
    cwd: "/repo",
    env: { FOO: "bar" },
    initialInput: "/implement /repo/thread",
    ...overrides,
  };
}

// A responder that succeeds through the whole spawn sequence.
function happyResponder(): Responder {
  return (_program, args) => {
    if (args[0] === "pane" && args[1] === "split") {
      return ok(PANE_JSON);
    }
    return ok();
  };
}

describe("herdrProgram / resolveHerdrExecutable", () => {
  it("defaults to the PATH-resolved herdr binary", () => {
    expect(herdrProgram()).toBe("herdr");
    const runner = new ScriptedRunner(happyResponder(), {
      herdr: "/usr/bin/herdr",
    });
    expect(resolveHerdrExecutable(runner)).toBe("/usr/bin/herdr");
  });

  it("honors the injectable ANTMAY_HERDR_BIN override", () => {
    const env = { ANTMAY_HERDR_BIN: "/opt/herdr" };
    expect(herdrProgram(env)).toBe("/opt/herdr");
    const runner = new ScriptedRunner(happyResponder(), {
      "/opt/herdr": "/opt/herdr",
    });
    expect(resolveHerdrExecutable(runner, env)).toBe("/opt/herdr");
  });

  it("returns null when herdr cannot be located", () => {
    const runner = new ScriptedRunner(happyResponder(), {});
    expect(resolveHerdrExecutable(runner)).toBeNull();
  });
});

describe("HerdrAdapter.spawn", () => {
  it("runs the external herdr binary with exact argv, cwd, and env — no shell", () => {
    const runner = new ScriptedRunner(happyResponder());
    const adapter = new HerdrAdapter(runner, {
      ANTMAY_HERDR_BIN: "/opt/herdr",
    });
    const result = adapter.spawn(spawnSpec());

    expect(result.handle).toBe(asAttachmentHandle("w1:p1"));
    // Every call went to the injected external executable, never a shell.
    expect(runner.calls.every((c) => c.program === "/opt/herdr")).toBe(true);
    expect(runner.calls.map((c) => c.args)).toEqual([
      [
        "pane",
        "split",
        "--current",
        "--direction",
        "down",
        "--no-focus",
        "--cwd",
        "/repo",
        "--env",
        "FOO=bar",
      ],
      ["pane", "run", "w1:p1", "/bin/claude --session-id abc"],
      [
        "wait",
        "agent-status",
        "w1:p1",
        "--status",
        "idle",
        "--timeout",
        "30000",
      ],
      ["pane", "run", "w1:p1", "/implement /repo/thread"],
    ]);
  });

  it("carries the initial invocation as one literal argv element", () => {
    const runner = new ScriptedRunner(happyResponder());
    const adapter = new HerdrAdapter(runner);
    const hostile = "/implement /repo/thread ; rm -rf / && $(whoami)";
    adapter.spawn(spawnSpec({ initialInput: hostile }));
    const submit = runner.calls.at(-1);
    expect(submit?.args).toEqual(["pane", "run", "w1:p1", hostile]);
  });

  it("throws with no retained handle when pane creation itself fails", () => {
    const runner = new ScriptedRunner(() => fail("no server"));
    const adapter = new HerdrAdapter(runner);
    try {
      adapter.spawn(spawnSpec());
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(HerdrAdapterError);
      expect((error as HerdrAdapterError).retainedHandle).toBeNull();
    }
  });

  it("throws with no retained handle when split yields no pane id", () => {
    const runner = new ScriptedRunner((_p, args) =>
      args[1] === "split" ? ok("{}") : ok(),
    );
    const adapter = new HerdrAdapter(runner);
    try {
      adapter.spawn(spawnSpec());
      expect.unreachable();
    } catch (error) {
      expect((error as HerdrAdapterError).retainedHandle).toBeNull();
    }
  });

  it("reports the retained pane after a partial failure past pane creation", () => {
    const runner = new ScriptedRunner((_p, args) => {
      if (args[1] === "split") {
        return ok(PANE_JSON);
      }
      if (args[0] === "wait") {
        return fail("timeout");
      }
      return ok();
    });
    const adapter = new HerdrAdapter(runner);
    try {
      adapter.spawn(spawnSpec());
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(HerdrAdapterError);
      const err = error as HerdrAdapterError;
      expect(err.retainedHandle).toBe(asAttachmentHandle("w1:p1"));
      expect(err.message).toContain("w1:p1");
    }
  });
});

describe("HerdrAdapter observation operations", () => {
  const handle = asAttachmentHandle("w1:p1");

  it("send submits input via pane run", () => {
    const runner = new ScriptedRunner(() => ok());
    new HerdrAdapter(runner).send(handle, "hello there");
    expect(runner.calls[0]?.args).toEqual([
      "pane",
      "run",
      "w1:p1",
      "hello there",
    ]);
  });

  it("read returns pane output and defaults to recent-unwrapped", () => {
    const runner = new ScriptedRunner(() => ok("recent pane text"));
    const result = new HerdrAdapter(runner).read(handle);
    expect(runner.calls[0]?.args).toEqual([
      "pane",
      "read",
      "w1:p1",
      "--source",
      "recent-unwrapped",
    ]);
    expect(result.output).toBe("recent pane text");
  });

  it("liveness reports alive with an advisory agent-state enrichment", () => {
    const json = JSON.stringify({
      result: { pane: { pane_id: "w1:p1", agent_status: "working" } },
    });
    const runner = new ScriptedRunner(() => ok(json));
    const result = new HerdrAdapter(runner).liveness(handle);
    expect(runner.calls[0]?.args).toEqual(["pane", "get", "w1:p1"]);
    expect(result.alive).toBe(true);
    expect(result.enrichments?.agentState).toBe("working");
  });

  it("liveness reports not-alive when the pane is gone", () => {
    const runner = new ScriptedRunner(() => fail("no such pane"));
    const result = new HerdrAdapter(runner).liveness(handle);
    expect(result.alive).toBe(false);
    expect(result.enrichments).toBeUndefined();
  });

  it("enumerate lists pane handles from herdr pane list", () => {
    const json = JSON.stringify({
      result: { panes: [{ pane_id: "w1:p1" }, { pane_id: "w2:p3" }] },
    });
    const runner = new ScriptedRunner(() => ok(json));
    const handles = new HerdrAdapter(runner).enumerate();
    expect(runner.calls[0]?.args).toEqual(["pane", "list"]);
    expect(handles).toEqual([
      asAttachmentHandle("w1:p1"),
      asAttachmentHandle("w2:p3"),
    ]);
  });

  it("attach resolves the pane terminal and joins it through the interactive runner", () => {
    const runner = new ScriptedRunner(() => ok(PANE_WITH_TERMINAL_JSON));
    const interactiveRunner = new ScriptedRunner(() => ok());
    new HerdrAdapter(runner, {}, { interactiveRunner }).attach(handle);
    expect(runner.calls.map((call) => call.args)).toEqual([
      ["pane", "get", "w1:p1"],
    ]);
    expect(interactiveRunner.calls.map((call) => call.args)).toEqual([
      ["terminal", "attach", "term_abc123"],
    ]);
  });

  it("attach throws with the retained handle when the pane is unavailable", () => {
    const runner = new ScriptedRunner(() => fail("gone"));
    try {
      new HerdrAdapter(runner).attach(handle);
      expect.unreachable();
    } catch (error) {
      expect((error as HerdrAdapterError).retainedHandle).toBe(handle);
    }
  });

  it("attach throws with the retained handle when pane metadata has no terminal id", () => {
    const runner = new ScriptedRunner(() => ok(PANE_JSON));
    try {
      new HerdrAdapter(runner).attach(handle);
      expect.unreachable();
    } catch (error) {
      expect((error as HerdrAdapterError).retainedHandle).toBe(handle);
      expect((error as Error).message).toContain("returned no terminal id");
    }
  });

  it("attach preserves the pane handle when terminal attachment fails", () => {
    const runner = new ScriptedRunner(() => ok(PANE_WITH_TERMINAL_JSON));
    const interactiveRunner = new ScriptedRunner(() => fail("terminal gone"));
    try {
      new HerdrAdapter(runner, {}, { interactiveRunner }).attach(handle);
      expect.unreachable();
    } catch (error) {
      expect((error as HerdrAdapterError).retainedHandle).toBe(handle);
      expect((error as Error).message).toContain("terminal gone");
    }
  });
});
