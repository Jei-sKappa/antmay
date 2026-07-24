import { EXIT_SIGHUP, EXIT_SIGINT, EXIT_SIGTERM } from "../cli/exit-codes.js";

/** The three interruption signals the executor handles, and their conventional
 * `128 + signum` process exit codes. */
const SIGNALS: readonly NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGHUP"];

const EXIT_CODES: Record<string, number> = {
  SIGINT: EXIT_SIGINT,
  SIGTERM: EXIT_SIGTERM,
  SIGHUP: EXIT_SIGHUP,
};

/**
 * The typed abort reason recorded when an OS signal interrupts a run. The runner
 * recognizes this exact reason on the `AbortSignal` to classify an aborted
 * attempt as an interruption (rather than a harness error) and to recover the
 * originating signal name.
 */
export class SignalInterruption extends Error {
  readonly signal: NodeJS.Signals;
  constructor(signal: NodeJS.Signals) {
    super(`The run was interrupted by ${signal}.`);
    this.name = "SignalInterruption";
    this.signal = signal;
  }
}

/**
 * The live handle the command holds over the installed signal handlers.
 * `signaled` reports the first received signal (or `null`), `exitCodeFor` maps a
 * signal to its conventional process exit code, and `uninstall` detaches the
 * handlers on any ordinary return path.
 */
export type SignalState = {
  signaled: () => NodeJS.Signals | null;
  exitCodeFor: (sig: NodeJS.Signals) => number;
  uninstall: () => void;
};

/**
 * Install `SIGINT`/`SIGTERM`/`SIGHUP` handlers that drive a graceful stop. The
 * first signal writes a brief stderr notice, records the signal, and aborts the
 * run with a `SignalInterruption` reason so the in-flight attempt unwinds; a
 * second signal arriving during that cleanup exits the process immediately with
 * the conventional code, abandoning any remaining cleanup.
 */
export function installSignalHandlers(deps: {
  abort: AbortController;
  stderr: NodeJS.WritableStream;
}): SignalState {
  const { abort, stderr } = deps;
  let received: NodeJS.Signals | null = null;

  const exitCodeFor = (sig: NodeJS.Signals): number => EXIT_CODES[sig] ?? EXIT_SIGINT;

  const listeners = new Map<NodeJS.Signals, () => void>();

  const handle = (sig: NodeJS.Signals): void => {
    if (received !== null) {
      // A second signal during cleanup abandons the graceful stop.
      process.exit(exitCodeFor(sig));
      return;
    }
    received = sig;
    stderr.write(
      `\nReceived ${sig}; finishing the current attempt and pausing. ` +
        `Send the signal again to exit immediately.\n`,
    );
    abort.abort(new SignalInterruption(sig));
  };

  for (const sig of SIGNALS) {
    const listener = (): void => handle(sig);
    listeners.set(sig, listener);
    process.on(sig, listener);
  }

  const uninstall = (): void => {
    for (const [sig, listener] of listeners) {
      process.off(sig, listener);
    }
  };

  return { signaled: () => received, exitCodeFor, uninstall };
}
