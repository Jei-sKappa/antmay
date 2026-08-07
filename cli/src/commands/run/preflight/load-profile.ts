import type { StageBindingMap } from "../../../config/execution.js";
import { loadExecutionProfile } from "../../../config/execution.js";
import { resolveDocumentReference } from "../../../config/references.js";
import type { ProfileSelection } from "../../../state/checkpoint/types.js";
import type { RunPreflightResult } from "../types.js";

/**
 * Resolve, load, and validate the optional execution profile. When no profile
 * is selected the result is settings-only with a null stage map. The declared
 * name comes from the loaded document and the source provenance from the
 * resolved reference, because the two are independent identities.
 */
export function loadRunProfile(
  profileRef: string | undefined,
  configRoot: string,
  cwd: string,
): RunPreflightResult<{
  profileStages: StageBindingMap | null;
  profileSelection: ProfileSelection;
}> {
  if (profileRef === undefined) {
    return {
      ok: true,
      profileStages: null,
      profileSelection: { kind: "settings-only" },
    };
  }

  const resolved = resolveDocumentReference(
    profileRef,
    "profile",
    configRoot,
    cwd,
  );
  if (!resolved.ok) {
    return {
      ok: false,
      refusal: { kind: "message", message: resolved.message },
    };
  }
  const profileLoad = loadExecutionProfile(resolved.reference.sourcePath);
  if (!profileLoad.ok) {
    return {
      ok: false,
      refusal: {
        kind: "rejected-document",
        label: "execution profile",
        sourcePath: resolved.reference.sourcePath,
        errors: profileLoad.errors,
      },
    };
  }
  return {
    ok: true,
    profileStages: profileLoad.profile.stages,
    profileSelection: {
      kind: "profile",
      name: profileLoad.profile.name,
      sourcePath: resolved.reference.sourcePath,
    },
  };
}
