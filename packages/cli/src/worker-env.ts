// Side-effect-free environment-variable names shared between the worker entry
// module, its launcher, and the spawn command. They live in their own module so
// that importing a name never drags in the worker's auto-run entry guard: the
// launcher and the spawn command depend only on these constants, not on the
// worker module that executes when run directly.

/** The environment entry carrying the observed run's public ID. */
export const WORKER_RUN_ID_ENV = "ANTMAY_WORKER_RUN_ID";

/**
 * The environment entry carrying the Codex run's recorded spawn time in epoch
 * milliseconds. Spawn hands it to the detached worker so the Codex rollout join
 * has the spawn-time signal alongside its recorded-cwd filter.
 */
export const CODEX_SPAWNED_AT_MS_ENV = "ANTMAY_CODEX_SPAWNED_AT_MS";
