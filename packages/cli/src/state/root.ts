// Per-user state-root resolution. Every `antmay`-written file lives beneath one
// root selected here; nothing is ever written into a repository or a harness
// configuration directory. Resolution follows the fixed three-level priority
// and honors non-empty values only — an unset or empty variable is skipped.

import { homedir } from "node:os";
import { join, resolve } from "node:path";

/** The environment shape state-root resolution reads. */
export type StateRootEnv = {
  readonly ANTMAY_STATE_HOME?: string | undefined;
  readonly XDG_STATE_HOME?: string | undefined;
};

function nonEmpty(value: string | undefined): string | undefined {
  return value !== undefined && value.length > 0 ? value : undefined;
}

/**
 * Resolve the absolute per-user state root:
 * 1. `ANTMAY_STATE_HOME` when set to a non-empty path;
 * 2. otherwise `<XDG_STATE_HOME>/antmay` when `XDG_STATE_HOME` is set non-empty;
 * 3. otherwise `~/.local/state/antmay`.
 *
 * Empty values do not count and fall through to the next level.
 */
export function resolveStateRoot(env: StateRootEnv = process.env): string {
  const explicit = nonEmpty(env.ANTMAY_STATE_HOME);
  if (explicit !== undefined) {
    return resolve(explicit);
  }
  const xdg = nonEmpty(env.XDG_STATE_HOME);
  if (xdg !== undefined) {
    return join(resolve(xdg), "antmay");
  }
  return join(homedir(), ".local", "state", "antmay");
}
