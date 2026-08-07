import type { HarnessRuntimeLoader } from "../harness/runtime.js";
import type { installSignalHandlers } from "../runner/signals.js";

/**
 * Injected dependencies shared by `runCommand` and `resumeCommand`. Path and
 * settings decisions root on `env`, `cwd`, and `homedir`; `harnessRuntime` is
 * the lazy adapter-family seam tests fake; streams and `color` drive display.
 * `createAbortController` and `installSignals` are the signal-ownership seams:
 * production uses a fresh controller and the real installer, while tests inject
 * controlled implementations without emitting real process signals. `clock`
 * overrides the wall clock in tests.
 */
export type CommandDeps = {
  env: NodeJS.ProcessEnv;
  cwd: string;
  homedir: string | undefined;
  harnessRuntime: HarnessRuntimeLoader;
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
  color: boolean;
  clock?: () => Date;
  createAbortController?: () => AbortController;
  installSignals?: typeof installSignalHandlers;
};
