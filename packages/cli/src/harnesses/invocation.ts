// Rendering the initial harness input. The invocation is assembled from the
// fixed catalog identity (`/skill-name` for Claude, `$skill-name` for Codex),
// the canonical thread path, and any permitted literal request. Three
// properties are guaranteed by construction: the catalog identity always leads,
// so request text can never replace the skill; the thread is injected on its own
// independently of whether a request is present; and the request is carried
// verbatim as prompt text. The value is submitted to an already-running harness
// as one literal turn — never a shell command — and the ProcessRunner transports
// it as a single argv element with no shell, so it cannot execute as a shell
// fragment.

import type { CatalogEntry, Harness } from "@antmay/core";

/** Inputs for rendering one harness invocation. */
export type RenderInvocationInput = {
  readonly skill: CatalogEntry;
  readonly harness: Harness;
  /** The canonical absolute thread-root path bound to the run. */
  readonly threadPath: string;
  /** The permitted literal request, or `null` when none applies. */
  readonly request: string | null;
};

/** The harness-native invocation identity for the selected harness. */
function identityFor(skill: CatalogEntry, harness: Harness): string {
  return harness === "claude" ? skill.claudeIdentity : skill.codexIdentity;
}

/**
 * Render the initial harness input. The identity and thread always appear, in
 * that order; a non-blank request is appended verbatim beneath them. A blank or
 * absent request contributes nothing, leaving the identity-plus-thread line
 * intact.
 */
export function renderSkillInvocation(input: RenderInvocationInput): string {
  const identity = identityFor(input.skill, input.harness);
  const header = `${identity} ${input.threadPath}`;
  if (input.request === null || input.request.trim().length === 0) {
    return header;
  }
  return `${header}\n\n${input.request}`;
}
