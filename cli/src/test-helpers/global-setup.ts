import { TEMP_ROOT_ENV, removeTree } from "./temp-root.js";

/**
 * The suite allocates every temporary repository, config root, state root, and
 * run directory under one root that `vitest.config.ts` creates. Removing it
 * here — after the last file, in the process that outlives every worker — is
 * what lets no case register teardown of its own.
 */
export async function teardown(): Promise<void> {
  const root = process.env[TEMP_ROOT_ENV];
  if (root === undefined || root === "") return;
  await removeTree(root);
}
