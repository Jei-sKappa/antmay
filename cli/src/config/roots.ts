import path from "node:path";

/**
 * The result of resolving a single root directory. Resolution is pure: it maps
 * an environment and home directory to either a normalized absolute path or a
 * human-readable error message. It never touches the filesystem and never
 * creates a directory.
 */
export type RootResult =
  | { ok: true; root: string }
  | { ok: false; message: string };

/**
 * The result of resolving both roots together. Fails with the first
 * encountered problem (config root before state root).
 */
export type RootsResult =
  | { ok: true; configRoot: string; stateRoot: string }
  | { ok: false; message: string };

/**
 * Return the environment value for `name` treating empty strings as unset.
 */
function readEnv(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name];
  if (value === undefined || value === "") {
    return undefined;
  }
  return value;
}

/**
 * Resolve a root from its precedence rungs.
 *
 * Precedence is: the primary `ANTMAY_*` variable, then the XDG base joined
 * with `antmay`, then a fallback relative to the user home. Empty values count
 * as unset. A selected env value that is not an absolute path — which includes
 * any literal `~…` or `$VAR…` value, since no expansion is performed — is an
 * error that names the responsible variable. Paths are normalized with
 * `path.normalize` (no case changes). A missing home when it is actually
 * needed fails clearly. No directory is ever created here.
 */
function resolveRoot(
  env: NodeJS.ProcessEnv,
  homedir: string | undefined,
  spec: {
    primaryVar: string;
    xdgVar: string;
    homeSegments: string[];
  },
): RootResult {
  const primary = readEnv(env, spec.primaryVar);
  if (primary !== undefined) {
    if (!path.isAbsolute(primary)) {
      return {
        ok: false,
        message: `${spec.primaryVar} must be an absolute path, got: ${primary}`,
      };
    }
    return { ok: true, root: path.normalize(primary) };
  }

  const xdg = readEnv(env, spec.xdgVar);
  if (xdg !== undefined) {
    if (!path.isAbsolute(xdg)) {
      return {
        ok: false,
        message: `${spec.xdgVar} must be an absolute path, got: ${xdg}`,
      };
    }
    return { ok: true, root: path.normalize(path.join(xdg, "antmay")) };
  }

  if (homedir === undefined || homedir === "") {
    return {
      ok: false,
      message: `Cannot resolve ${spec.primaryVar}: user home directory is unknown; set ${spec.primaryVar} or ${spec.xdgVar} to an absolute path.`,
    };
  }

  return {
    ok: true,
    root: path.normalize(path.join(homedir, ...spec.homeSegments)),
  };
}

/**
 * Resolve the config root: `ANTMAY_CONFIG_HOME`, else `$XDG_CONFIG_HOME/antmay`,
 * else `<home>/.config/antmay`.
 */
export function resolveConfigRoot(
  env: NodeJS.ProcessEnv,
  homedir: string | undefined,
): RootResult {
  return resolveRoot(env, homedir, {
    primaryVar: "ANTMAY_CONFIG_HOME",
    xdgVar: "XDG_CONFIG_HOME",
    homeSegments: [".config", "antmay"],
  });
}

/**
 * Resolve the state root: `ANTMAY_STATE_HOME`, else `$XDG_STATE_HOME/antmay`,
 * else `<home>/.local/state/antmay`.
 */
export function resolveStateRoot(
  env: NodeJS.ProcessEnv,
  homedir: string | undefined,
): RootResult {
  return resolveRoot(env, homedir, {
    primaryVar: "ANTMAY_STATE_HOME",
    xdgVar: "XDG_STATE_HOME",
    homeSegments: [".local", "state", "antmay"],
  });
}

/**
 * Resolve both roots for commands that need each. Fails on the first problem,
 * reporting the config root before the state root. Commands that only need one
 * root call the single resolver directly, so an irrelevant config-root problem
 * cannot block a command that never reads settings.
 */
export function resolveRoots(
  env: NodeJS.ProcessEnv,
  homedir: string | undefined,
): RootsResult {
  const config = resolveConfigRoot(env, homedir);
  if (!config.ok) {
    return { ok: false, message: config.message };
  }
  const state = resolveStateRoot(env, homedir);
  if (!state.ok) {
    return { ok: false, message: state.message };
  }
  return { ok: true, configRoot: config.root, stateRoot: state.root };
}
