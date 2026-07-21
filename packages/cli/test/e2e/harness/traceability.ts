// Traceability between the functional requirements and their proofs. Every
// behavioral acceptance criterion of an active requirement must be covered by at
// least one declarative case; every architecture-review criterion must instead
// be named by a structural assertion (and never by a case). This rejects the
// three failure modes: a behavioral criterion with no case, a case (or
// structural assertion) that names an unknown or removed criterion, and any
// attempt to claim a behavioral criterion structurally or an architecture
// criterion through a case.

import type { CaseManifest } from "./case-manifest";
import { acceptanceRef, type Requirement } from "./requirements";

function splitRef(ref: string): {
  requirementId: string;
  acceptanceId: string;
} {
  const parts = ref.split(".");
  if (parts.length !== 2 || parts[0] === undefined || parts[1] === undefined) {
    throw new Error(`invalid acceptance criterion ref ${ref}`);
  }
  return { requirementId: parts[0], acceptanceId: parts[1] };
}

type ResolvedCriterion = {
  requirement: Requirement;
  kind: "behavioral" | "architecture";
  removed: boolean;
};

/**
 * Validate that every active behavioral criterion is covered by a case and every
 * active architecture criterion is covered by a structural assertion, and that
 * no criterion is covered by the wrong kind of proof. Throws on the first
 * violation.
 */
export function validateTraceability(
  requirements: Requirement[],
  cases: CaseManifest[],
  structuralRefs: readonly string[] = [],
): void {
  const requirementsById = new Map(requirements.map((r) => [r.id, r]));
  const byRef = new Map<string, ResolvedCriterion>();
  for (const requirement of requirements) {
    for (const ac of requirement.acceptance) {
      byRef.set(acceptanceRef(requirement.id, ac.id), {
        requirement,
        kind: ac.kind,
        removed: ac.status === "removed",
      });
    }
  }

  const resolve = (ref: string, who: string): ResolvedCriterion => {
    const { requirementId } = splitRef(ref);
    const requirement = requirementsById.get(requirementId);
    if (requirement === undefined) {
      throw new Error(
        `${who}: references missing requirement ${requirementId}`,
      );
    }
    if (requirement.status === "removed") {
      throw new Error(
        `${who}: references removed requirement ${requirementId}`,
      );
    }
    const criterion = byRef.get(ref);
    if (criterion === undefined) {
      throw new Error(`${who}: references missing acceptance criterion ${ref}`);
    }
    if (criterion.removed) {
      throw new Error(`${who}: references removed acceptance criterion ${ref}`);
    }
    return criterion;
  };

  const coveredByCase = new Set<string>();
  for (const testCase of cases) {
    for (const ref of testCase.covers) {
      const criterion = resolve(ref, testCase.id);
      if (criterion.kind === "architecture") {
        throw new Error(
          `${testCase.id}: covers architecture-review criterion ${ref}; ` +
            "architecture criteria are proven by a structural assertion, not a case.",
        );
      }
      coveredByCase.add(ref);
    }
  }

  const coveredStructurally = new Set<string>();
  for (const ref of structuralRefs) {
    const criterion = resolve(ref, "structural assertion");
    if (criterion.kind === "behavioral") {
      throw new Error(
        `structural assertion: names behavioral criterion ${ref}; ` +
          "behavioral criteria are proven by a case, not a structural assertion.",
      );
    }
    coveredStructurally.add(ref);
  }

  for (const requirement of requirements) {
    if (requirement.status !== "active") continue;
    for (const ac of requirement.acceptance) {
      if (ac.status === "removed") continue;
      const ref = acceptanceRef(requirement.id, ac.id);
      if (ac.kind === "behavioral" && !coveredByCase.has(ref)) {
        throw new Error(`uncovered behavioral criterion ${ref}`);
      }
      if (ac.kind === "architecture" && !coveredStructurally.has(ref)) {
        throw new Error(
          `architecture criterion ${ref} has no structural assertion`,
        );
      }
    }
  }
}
