import { afterEach, describe, expect, it, vi } from "vitest";

import { EXIT_SIGHUP, EXIT_SIGINT, EXIT_SIGTERM } from "../cli/exit-codes.js";
import { installSignalHandlers, SignalInterruption } from "./signals.js";

type Installed = {
  state: ReturnType<typeof installSignalHandlers>;
  abort: AbortController;
  registered: Map<string, () => void>;
  writes: string[];
};

/**
 * Install the handlers with `process.on` spied so the registered listeners are
 * captured and invoked directly — never through a real OS signal. The abort
 * controller and stderr sink are fabricated in-process.
 */
function install(): Installed {
  const registered = new Map<string, () => void>();
  vi.spyOn(process, "on").mockImplementation(((event: string, listener: () => void) => {
    registered.set(event, listener);
    return process;
  }) as never);

  const writes: string[] = [];
  const stderr = {
    write: (chunk: unknown): boolean => {
      writes.push(String(chunk));
      return true;
    },
  } as unknown as NodeJS.WritableStream;

  const abort = new AbortController();
  const state = installSignalHandlers({ abort, stderr });
  return { state, abort, registered, writes };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("installSignalHandlers — first signal", () => {
  it("records the signal, writes a stderr notice, and aborts with a SignalInterruption", () => {
    const { state, abort, registered, writes } = install();
    expect(state.signaled()).toBeNull();

    registered.get("SIGINT")!();

    expect(state.signaled()).toBe("SIGINT");
    expect(abort.signal.aborted).toBe(true);
    expect(abort.signal.reason).toBeInstanceOf(SignalInterruption);
    expect((abort.signal.reason as SignalInterruption).signal).toBe("SIGINT");
    expect(writes.join("")).toContain("SIGINT");

    state.uninstall();
  });
});

describe("installSignalHandlers — exit-code mapping", () => {
  it("maps each handled signal to its conventional code", () => {
    const { state } = install();
    expect(state.exitCodeFor("SIGINT")).toBe(EXIT_SIGINT);
    expect(state.exitCodeFor("SIGTERM")).toBe(EXIT_SIGTERM);
    expect(state.exitCodeFor("SIGHUP")).toBe(EXIT_SIGHUP);
    state.uninstall();
  });
});

describe("installSignalHandlers — second signal", () => {
  it("exits immediately with the conventional code without a further abort", () => {
    const { state, registered } = install();
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(((code?: number) => {
        throw new Error(`exit:${code}`);
      }) as never);

    // First signal: records and aborts, no process.exit.
    registered.get("SIGTERM")!();
    expect(exitSpy).not.toHaveBeenCalled();

    // Second signal during cleanup: immediate exit with the conventional code.
    expect(() => registered.get("SIGTERM")!()).toThrow("exit:143");
    expect(exitSpy).toHaveBeenCalledWith(EXIT_SIGTERM);

    state.uninstall();
  });
});
