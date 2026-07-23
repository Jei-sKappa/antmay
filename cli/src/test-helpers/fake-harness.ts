import type {
  AttemptOutcome,
  AttemptRequest,
  HarnessInvoker,
} from "../harness/types.js";

/**
 * One scripted harness invocation. `before` runs a side effect (typically a
 * filesystem mutation or an `AbortController.abort`) before the call resolves.
 * A step either resolves with a fixed `outcome` or, with `hangUntilAbort`, never
 * settles until the request's `AbortSignal` fires, then resolves as `aborted`.
 */
export type FakeHarnessStep = {
  before?: (request: AttemptRequest) => void | Promise<void>;
  outcome?: AttemptOutcome;
  hangUntilAbort?: boolean;
};

/**
 * A scriptable `HarnessInvoker` fake. Each `invoke` consumes the next scripted
 * step; steps beyond the script default to a bare `Outcome: DONE` completion.
 * `calls` records every received request for assertions.
 */
export type FakeHarness = HarnessInvoker & {
  calls: AttemptRequest[];
};

const DEFAULT_DONE: AttemptOutcome = {
  kind: "completed",
  finalText: "Outcome: DONE",
};

const ABORTED_OUTCOME: AttemptOutcome = {
  kind: "failed",
  category: "aborted",
  errorClass: "AbortError",
  errorMessage: "The attempt was aborted by a signal.",
};

export function createFakeHarness(steps: FakeHarnessStep[]): FakeHarness {
  let index = 0;
  const calls: AttemptRequest[] = [];

  return {
    calls,
    async invoke(request: AttemptRequest): Promise<AttemptOutcome> {
      calls.push(request);
      const step = steps[index] ?? {};
      index += 1;

      if (step.before !== undefined) {
        await step.before(request);
      }

      if (step.hangUntilAbort === true) {
        return await new Promise<AttemptOutcome>((resolve) => {
          if (request.signal.aborted) {
            resolve(ABORTED_OUTCOME);
            return;
          }
          request.signal.addEventListener(
            "abort",
            () => resolve(ABORTED_OUTCOME),
            { once: true },
          );
        });
      }

      return step.outcome ?? DEFAULT_DONE;
    },
  };
}
