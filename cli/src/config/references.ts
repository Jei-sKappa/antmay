import path from "node:path";

/**
 * Which kind of document a reference names. The role selects the config-root
 * directory a bare name resolves below and the wording of diagnostics; it
 * changes nothing else about resolution.
 */
export type DocumentRole = "pipeline" | "profile";

/**
 * The one grammar shared by bare pipeline and profile references and by the
 * declared `name` inside both document types: lowercase ASCII letters and
 * digits in non-empty segments joined by single hyphens.
 *
 * The predicate is applied to the raw string. Uppercase and non-ASCII
 * characters, whitespace, underscores, dots, path separators, and leading,
 * trailing, or repeated hyphens are all invalid.
 */
export const DOCUMENT_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Whether `value` is a valid pipeline or execution-profile name. The raw string
 * is tested as given: nothing is trimmed, case-folded, Unicode-normalized, or
 * otherwise rewritten before or after the test.
 */
export function isValidDocumentName(value: string): boolean {
  return DOCUMENT_NAME_PATTERN.test(value);
}

/**
 * A reference resolved to one absolute source path.
 *
 * `sourcePath` is the resolved source provenance, and it is deliberately
 * separate from the document's declared identity, which only the loaded
 * document itself carries.
 */
export type DocumentReference = {
  role: DocumentRole;
  sourcePath: string;
};

export type DocumentReferenceResult =
  | { ok: true; reference: DocumentReference }
  | { ok: false; message: string };

const ROLE_DIRECTORIES: Readonly<Record<DocumentRole, string>> = {
  pipeline: "pipelines",
  profile: "profiles",
};

/**
 * Explain a bare reference that satisfies neither the name grammar nor the
 * explicit-path form, naming every legal alternative. When the reference is a
 * bare filename whose stem is a valid name — the `standard.json` mistake — both
 * the name form and the explicit relative path are offered.
 */
function describeInvalidReference(raw: string, role: DocumentRole): string {
  const directory = ROLE_DIRECTORIES[role];
  const grammar =
    `"${raw}" is not a valid ${role} reference. A bare ${role} name must match ` +
    `${DOCUMENT_NAME_PATTERN.source} (lowercase ASCII letters and digits in ` +
    `hyphen-separated segments), and any other reference must carry an explicit ` +
    `directory component.`;

  const stem = raw.endsWith(".json") ? raw.slice(0, -".json".length) : "";
  if (isValidDocumentName(stem)) {
    return (
      `${grammar} Use "${stem}" to load ${directory}/${stem}.json from the config ` +
      `root, or "./${raw}" to load that file relative to the working directory.`
    );
  }
  return (
    `${grammar} Use a bare name to load a document from the config root's ` +
    `${directory}/ directory, or "./${raw}" to load that file relative to the ` +
    `working directory.`
  );
}

/**
 * Resolve a pipeline or execution-profile reference to one absolute source
 * path, by syntax alone.
 *
 * The reference shape, and nothing else, picks the strategy:
 *
 * - a reference with an explicit directory component — absolute, or relative
 *   such as `./standard.json` — resolves against `cwd` as a filesystem path,
 *   whatever its filename;
 * - a bare name matching the shared grammar resolves to
 *   `<configRoot>/<pipelines|profiles>/<name>.json`;
 * - anything else, including a bare filename such as `standard.json`, is
 *   rejected with both legal alternatives.
 *
 * Resolution touches no filesystem: it never tests whether the resolved source
 * exists, never falls back from one strategy to the other, never searches any
 * further location, never interpolates environment variables, and never creates
 * a file or directory. A reference therefore means the same thing regardless of
 * incidental filesystem state, and a missing source is reported by the loader
 * that reads it.
 */
export function resolveDocumentReference(
  reference: string,
  role: DocumentRole,
  configRoot: string,
  cwd: string,
): DocumentReferenceResult {
  if (reference.length === 0) {
    return { ok: false, message: `A ${role} reference must not be empty.` };
  }

  if (reference.includes("/")) {
    return {
      ok: true,
      reference: {
        role,
        sourcePath: path.resolve(cwd, reference),
      },
    };
  }

  if (isValidDocumentName(reference)) {
    return {
      ok: true,
      reference: {
        role,
        sourcePath: path.join(
          configRoot,
          ROLE_DIRECTORIES[role],
          `${reference}.json`,
        ),
      },
    };
  }

  return { ok: false, message: describeInvalidReference(reference, role) };
}
