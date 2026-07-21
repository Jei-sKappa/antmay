// Strict loader for the CLI functional-requirement files under
// `packages/cli/requirements/functional/`. Each file is a YAML list of
// requirements; every requirement carries acceptance criteria, and every
// criterion declares whether it is a `behavioral` contract (proven by a
// declarative real-CLI case) or an `architecture` review (proven by a separate
// structural assertion). The loader rejects any malformed shape, unknown field,
// or duplicate id loudly so a broken requirement file can never silently weaken
// traceability.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

const REQUIREMENT_ID_PATTERN = /^[A-Z]+-FR-\d{4}$/;
const ACCEPTANCE_ID_PATTERN = /^AC-\d{4}$/;
const REQUIREMENT_STATUSES = new Set(["active", "removed"]);
const ACCEPTANCE_KINDS = new Set(["behavioral", "architecture"]);
const REQUIREMENT_FIELDS = new Set([
  "id",
  "title",
  "status",
  "description",
  "acceptance",
  "removedReason",
]);
const ACCEPTANCE_FIELDS = new Set([
  "id",
  "statement",
  "kind",
  "status",
  "removedReason",
]);

export type AcceptanceKind = "behavioral" | "architecture";

export type AcceptanceCriterion = {
  id: string;
  statement: string;
  kind: AcceptanceKind;
  status?: "removed";
  removedReason?: string;
};

export type Requirement = {
  id: string;
  title: string;
  status: "active" | "removed";
  description: string;
  acceptance: AcceptanceCriterion[];
  removedReason?: string;
};

type Source = { filePath: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(source: Source, detail: string): never {
  throw new Error(`${source.filePath}: ${detail}`);
}

function rejectUnknownFields(
  value: Record<string, unknown>,
  allowed: Set<string>,
  label: string,
  source: Source,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(source, `unknown ${label} field ${key}`);
  }
}

function requireString(value: unknown, field: string, source: Source): string {
  if (typeof value !== "string" || value.length === 0) {
    fail(source, `${field} must be a non-empty string.`);
  }
  return value;
}

function optionalString(
  value: unknown,
  field: string,
  source: Source,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length === 0) {
    fail(source, `${field} must be a non-empty string.`);
  }
  return value;
}

function validateAcceptance(
  value: unknown,
  requirementId: string,
  index: number,
  source: Source,
): AcceptanceCriterion {
  if (!isRecord(value)) {
    fail(source, `${requirementId}.acceptance[${index}] must be a mapping.`);
  }
  rejectUnknownFields(value, ACCEPTANCE_FIELDS, "acceptance", source);
  const id = requireString(
    value.id,
    `${requirementId}.acceptance[${index}].id`,
    source,
  );
  if (!ACCEPTANCE_ID_PATTERN.test(id)) {
    fail(source, `invalid acceptance criterion id ${requirementId}.${id}`);
  }
  const statement = requireString(
    value.statement,
    `${requirementId}.${id}.statement`,
    source,
  );
  const kind = requireString(value.kind, `${requirementId}.${id}.kind`, source);
  if (!ACCEPTANCE_KINDS.has(kind)) {
    fail(
      source,
      `${requirementId}.${id}.kind must be behavioral or architecture.`,
    );
  }
  const status = optionalString(
    value.status,
    `${requirementId}.${id}.status`,
    source,
  );
  if (status !== undefined && status !== "removed") {
    fail(
      source,
      `${requirementId}.${id}.status must be "removed" when present.`,
    );
  }
  const removedReason = optionalString(
    value.removedReason,
    `${requirementId}.${id}.removedReason`,
    source,
  );
  if (status === "removed" && removedReason === undefined) {
    fail(
      source,
      `${requirementId}.${id} removed criterion requires removedReason.`,
    );
  }
  return {
    id,
    statement,
    kind: kind as AcceptanceKind,
    ...(status === undefined ? {} : { status: "removed" as const }),
    ...(removedReason === undefined ? {} : { removedReason }),
  };
}

export function validateRequirements(
  value: unknown,
  source: Source,
): Requirement[] {
  if (!Array.isArray(value)) fail(source, "requirements file must be a list.");
  const seen = new Set<string>();
  return value.map((raw, index) => {
    if (!isRecord(raw))
      fail(source, `requirements[${index}] must be a mapping.`);
    rejectUnknownFields(raw, REQUIREMENT_FIELDS, "requirement", source);
    const id = requireString(raw.id, `requirements[${index}].id`, source);
    if (!REQUIREMENT_ID_PATTERN.test(id))
      fail(source, `invalid requirement id ${id}`);
    if (seen.has(id)) fail(source, `duplicate requirement id ${id}`);
    seen.add(id);

    const title = requireString(raw.title, `${id}.title`, source);
    const status = requireString(raw.status, `${id}.status`, source);
    if (!REQUIREMENT_STATUSES.has(status)) {
      fail(source, `invalid requirement status ${id}: ${status}`);
    }
    const description = requireString(
      raw.description,
      `${id}.description`,
      source,
    );
    if (!Array.isArray(raw.acceptance) || raw.acceptance.length === 0) {
      fail(source, `${id}.acceptance must be a non-empty list.`);
    }
    const seenAc = new Set<string>();
    const acceptance = raw.acceptance.map((item, acIndex) => {
      const criterion = validateAcceptance(item, id, acIndex, source);
      if (seenAc.has(criterion.id)) {
        fail(source, `duplicate acceptance criterion id ${id}.${criterion.id}`);
      }
      seenAc.add(criterion.id);
      return criterion;
    });
    const removedReason = optionalString(
      raw.removedReason,
      `${id}.removedReason`,
      source,
    );
    if (status === "removed" && removedReason === undefined) {
      fail(source, `${id} removed requirement requires removedReason.`);
    }
    return {
      id,
      title,
      status: status as Requirement["status"],
      description,
      acceptance,
      ...(removedReason === undefined ? {} : { removedReason }),
    };
  });
}

export function acceptanceRef(requirementId: string, acId: string): string {
  return `${requirementId}.${acId}`;
}

export async function loadRequirements(root: string): Promise<Requirement[]> {
  const dirPath = "requirements/functional";
  const absoluteDir = path.join(root, dirPath);
  const entries = await readdir(absoluteDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".yml"))
    .map((entry) => path.join(dirPath, entry.name))
    .sort();

  const loaded: Requirement[] = [];
  const seen = new Map<string, string>();
  for (const filePath of files) {
    const source = await readFile(path.join(root, filePath), "utf8");
    const requirements = validateRequirements(YAML.parse(source), { filePath });
    for (const requirement of requirements) {
      const previous = seen.get(requirement.id);
      if (previous !== undefined) {
        throw new Error(
          `${filePath}: duplicate requirement id ${requirement.id} (already in ${previous})`,
        );
      }
      seen.set(requirement.id, filePath);
      loaded.push(requirement);
    }
  }
  return loaded;
}
