import {
  accessSync,
  constants,
  realpathSync,
  statSync,
} from "node:fs";
import path from "node:path";

/**
 * Resolve the first executable file `PATH` would select, following a final
 * symlink so callers can judge the executable itself rather than its spelling.
 * Empty and relative PATH entries are resolved from `cwd`.
 */
export function resolveExecutableOnPath(
  executable: string,
  searchPath: string | undefined,
  cwd: string,
): string | null {
  if (searchPath === undefined) return null;

  for (const entry of searchPath.split(path.delimiter)) {
    const candidate = path.resolve(cwd, entry, executable);
    try {
      if (!statSync(candidate).isFile()) continue;
      accessSync(candidate, constants.X_OK);
      return realpathSync(candidate);
    } catch {
      // This entry cannot supply the executable; continue searching PATH.
    }
  }
  return null;
}

/** Whether PATH's canonical Git executable is Apple's developer-tool stub. */
export function isAppleGitStub(
  platform: NodeJS.Platform,
  selectedGit: string | null,
): boolean {
  return platform === "darwin" && selectedGit === "/usr/bin/git";
}
