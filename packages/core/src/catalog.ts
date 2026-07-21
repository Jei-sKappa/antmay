// The versioned v0 catalog of supported completion-oriented Antmay skills. The
// catalog — not a prose scan of installed SKILL.md bodies — defines eligibility.
// Each entry pins both harness invocation identities and a request posture.

/**
 * Request posture for a catalog entry:
 * - `required` — a non-empty request is mandatory;
 * - `optional` — the thread alone is sufficient, but a request may narrow or
 *   supplement the skill input;
 * - `forbidden` — a request is rejected because the operation is determined by
 *   the thread-root artifacts.
 */
export type RequestPosture = "required" | "optional" | "forbidden";

/** One catalog entry: catalog name, both native identities, and its posture. */
export type CatalogEntry = {
  readonly name: string;
  readonly claudeIdentity: string;
  readonly codexIdentity: string;
  readonly requestPosture: RequestPosture;
};

/**
 * The exact v0 catalog. Updating it is a CLI release change maintained
 * alongside the suite; no skill gains `antmay`-specific metadata.
 */
export const ANTMAY_SKILL_CATALOG: readonly CatalogEntry[] = [
  {
    name: "implement",
    claudeIdentity: "/implement",
    codexIdentity: "$implement",
    requestPosture: "required",
  },
  {
    name: "implement-plan",
    claudeIdentity: "/implement-plan",
    codexIdentity: "$implement-plan",
    requestPosture: "optional",
  },
  {
    name: "implement-plan-with-subagents",
    claudeIdentity: "/implement-plan-with-subagents",
    codexIdentity: "$implement-plan-with-subagents",
    requestPosture: "optional",
  },
  {
    name: "materialize-roadmap-threads",
    claudeIdentity: "/materialize-roadmap-threads",
    codexIdentity: "$materialize-roadmap-threads",
    requestPosture: "forbidden",
  },
  {
    name: "merge-artifacts",
    claudeIdentity: "/merge-artifacts",
    codexIdentity: "$merge-artifacts",
    requestPosture: "required",
  },
  {
    name: "plan-brief",
    claudeIdentity: "/plan-brief",
    codexIdentity: "$plan-brief",
    requestPosture: "optional",
  },
  {
    name: "plan-strict",
    claudeIdentity: "/plan-strict",
    codexIdentity: "$plan-strict",
    requestPosture: "optional",
  },
  {
    name: "propose",
    claudeIdentity: "/propose",
    codexIdentity: "$propose",
    requestPosture: "optional",
  },
  {
    name: "reconcile-plan",
    claudeIdentity: "/reconcile-plan",
    codexIdentity: "$reconcile-plan",
    requestPosture: "forbidden",
  },
  {
    name: "reconcile-proposal",
    claudeIdentity: "/reconcile-proposal",
    codexIdentity: "$reconcile-proposal",
    requestPosture: "forbidden",
  },
  {
    name: "reconcile-roadmap",
    claudeIdentity: "/reconcile-roadmap",
    codexIdentity: "$reconcile-roadmap",
    requestPosture: "forbidden",
  },
  {
    name: "reconcile-spec",
    claudeIdentity: "/reconcile-spec",
    codexIdentity: "$reconcile-spec",
    requestPosture: "forbidden",
  },
  {
    name: "review-code",
    claudeIdentity: "/review-code",
    codexIdentity: "$review-code",
    requestPosture: "required",
  },
  {
    name: "review-implementation",
    claudeIdentity: "/review-implementation",
    codexIdentity: "$review-implementation",
    requestPosture: "required",
  },
  {
    name: "review-roadmap",
    claudeIdentity: "/review-roadmap",
    codexIdentity: "$review-roadmap",
    requestPosture: "forbidden",
  },
  {
    name: "review-spec",
    claudeIdentity: "/review-spec",
    codexIdentity: "$review-spec",
    requestPosture: "forbidden",
  },
  {
    name: "roadmap",
    claudeIdentity: "/roadmap",
    codexIdentity: "$roadmap",
    requestPosture: "forbidden",
  },
  {
    name: "spec",
    claudeIdentity: "/spec",
    codexIdentity: "$spec",
    requestPosture: "optional",
  },
];

/** Look up a catalog entry by its exact catalog name. */
export function findCatalogEntry(name: string): CatalogEntry | undefined {
  return ANTMAY_SKILL_CATALOG.find((entry) => entry.name === name);
}

/** True when `name` is an exact catalog member. */
export function isCatalogSkill(name: string): boolean {
  return findCatalogEntry(name) !== undefined;
}

/** Outcome of validating a `--request` value against a catalog entry. */
export type RequestValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

/**
 * Validate a request against a catalog entry's posture. `request` is
 * `undefined` when no `--request` was supplied; any supplied value (including
 * an empty string) counts as supplied for a `forbidden` entry, and a `required`
 * entry needs a non-empty, non-blank value. This validates posture only and
 * never reads installed skill prose.
 */
export function validateRequestPosture(
  entry: CatalogEntry,
  request: string | undefined,
): RequestValidation {
  switch (entry.requestPosture) {
    case "required": {
      if (request === undefined || request.trim().length === 0) {
        return {
          ok: false,
          reason: `The "${entry.name}" skill requires a non-empty --request.`,
        };
      }
      return { ok: true };
    }
    case "forbidden": {
      if (request !== undefined) {
        return {
          ok: false,
          reason: `The "${entry.name}" skill rejects --request; its operation is determined by its thread-root artifacts.`,
        };
      }
      return { ok: true };
    }
    case "optional":
      return { ok: true };
  }
}

/**
 * Validate a request against a catalog entry selected by name. Reports an
 * unknown catalog name before any posture check.
 */
export function validateSkillRequest(
  name: string,
  request: string | undefined,
): RequestValidation {
  const entry = findCatalogEntry(name);
  if (entry === undefined) {
    return { ok: false, reason: `Unknown catalog skill "${name}".` };
  }
  return validateRequestPosture(entry, request);
}
