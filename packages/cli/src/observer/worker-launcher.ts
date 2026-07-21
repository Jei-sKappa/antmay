// Launch the private observer worker as a detached, parent-independent process.
// The worker is spawned with the CURRENT Node executable (`process.execPath`) so
// it runs on the exact runtime the CLI itself uses, pointed at the packaged
// `dist/worker.js` module, with its run identity handed over through the
// package-internal `ANTMAY_WORKER_RUN_ID` contract. `detached: true`, ignored
// stdio, and `unref()` sever every tie to the spawning CLI, so the worker
// survives the parent's exit and the parent never waits on it.

import { spawn as nodeSpawn, type SpawnOptions } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RunId } from "@antmay/core";
import { WORKER_RUN_ID_ENV } from "../worker";

/** The minimal child-process handle the launcher relies on. */
export type LaunchedChild = {
  readonly pid?: number | undefined;
  unref(): void;
};

/** The spawn seam, satisfied by `node:child_process.spawn` in production. */
export type SpawnFn = (
  command: string,
  args: readonly string[],
  options: SpawnOptions,
) => LaunchedChild;

/** Options for launching the observer worker; production supplies no override. */
export type LaunchObserverOptions = {
  /** The Node executable to run; defaults to the current `process.execPath`. */
  readonly nodeExecutable?: string;
  /** The worker module to run; defaults to the packaged `dist/worker.js`. */
  readonly workerModulePath?: string;
  /** The environment handed to the worker; defaults to the current `process.env`. */
  readonly env?: NodeJS.ProcessEnv;
  /** The spawn implementation; defaults to `node:child_process.spawn`. */
  readonly spawn?: SpawnFn;
};

/**
 * The packaged worker module path resolved relative to this bundle. In the
 * published CLI the launcher is bundled into `dist/index.js`, so its sibling is
 * `dist/worker.js`. An explicit `ANTMAY_WORKER_MODULE` override wins when set.
 */
export function defaultWorkerModulePath(env: NodeJS.ProcessEnv): string {
  const override = env.ANTMAY_WORKER_MODULE;
  if (override !== undefined && override.length > 0) {
    return override;
  }
  return join(dirname(fileURLToPath(import.meta.url)), "worker.js");
}

/** The launched observer's process id, or `null` when the OS assigned none. */
export type LaunchResult = {
  readonly pid: number | null;
};

/**
 * Launch a detached observer worker for one run and return without waiting on
 * it. The worker outlives this process: it is detached, its stdio is ignored,
 * and its handle is `unref`-ed so the parent's event loop does not keep it
 * alive.
 */
export function launchObserver(
  runId: RunId,
  options: LaunchObserverOptions = {},
): LaunchResult {
  const env = options.env ?? process.env;
  const spawn = options.spawn ?? (nodeSpawn as unknown as SpawnFn);
  const nodeExecutable = options.nodeExecutable ?? process.execPath;
  const workerModulePath =
    options.workerModulePath ?? defaultWorkerModulePath(env);
  const child = spawn(nodeExecutable, [workerModulePath], {
    detached: true,
    stdio: "ignore",
    env: { ...env, [WORKER_RUN_ID_ENV]: runId },
  });
  child.unref();
  return { pid: child.pid ?? null };
}
