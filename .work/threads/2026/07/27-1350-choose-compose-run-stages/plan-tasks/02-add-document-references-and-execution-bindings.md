### Task 2: Add strict document references and local execution bindings

**Objective:** Provide one syntax-directed reference resolver and strict settings/profile loaders that resolve each selected stage to one complete local execution binding.

**Input / context:** Use the catalog ID set produced by Task 1. Follow `spec.md` sections “Pipeline and profile references” and “Local stage bindings and execution profiles,” plus `decisions.md DR2`, `DR4`, `DR8`, `DR16`, and `DR17`. The shared name grammar is raw `^[a-z0-9]+(?:-[a-z0-9]+)*$`; settings are optional; profile entries replace settings entries as whole bindings; and local documents carry no prompt or instructions.

**Steps:**
1. Create `cli/src/config/references.ts` with the shared raw-name predicate and syntax-only resolution for pipeline and execution-profile references. Resolve valid bare names below the role-specific config-root directory, resolve absolute paths and relative paths with explicit directory components as paths, and reject bare filenames such as `standard.json` with both legal alternatives in the diagnostic.
2. Preserve declared document identity separately from resolved absolute source provenance. Do not compare a declared name with its filename, normalize the raw declared name, search fallback locations, interpolate environment variables, or create files/directories.
3. Create `cli/src/config/execution.ts` as the canonical local execution module. Define the supported harness type, atomic `agent: { harness, model }` object, optional positive integer timing fields, intrinsic defaults of 86,400 idle-timeout seconds and 300 heartbeat seconds, settings/profile document types, and resolved stage-binding type.
4. Implement optional `settings.json` loading: `ENOENT` returns an empty stage map; a present file requires exactly `afk.stages`; `stages` may be empty; every non-empty binding is complete; and unknown root, container, stage, binding, or `agent` fields are collected and rejected.
5. Implement execution-profile loading from an already resolved source: require exactly `schemaVersion: 0`, a valid raw declared `name`, and a non-empty `stages` map; validate every binding with the settings binding schema; allow unused supported IDs; and reject every unknown catalog ID.
6. Implement selected-stage binding resolution. For each selected ID, choose the whole profile entry when present, otherwise the whole settings entry; apply only intrinsic timing defaults; never merge fields between sources; and collect a clear error for every selected stage with no complete binding.
7. Add table-driven tests for the full valid/invalid raw-name grammar, all reference forms and non-fallback behavior, canonical empty settings, missing settings, exhaustive schema errors, atomic profile precedence, omitted-profile fallback, timing defaults, complete-profile/no-settings operation, unused supported bindings, and unknown IDs.

**Files modified:**

- `cli/src/config/references.ts` (NEW)
- `cli/src/config/references.test.ts` (NEW)
- `cli/src/config/execution.ts` (NEW)
- `cli/src/config/execution.test.ts` (NEW)

**Verification:**

1. Run `npm --prefix cli run test -- src/config/references.test.ts src/config/execution.test.ts`.
2. Run `npm --prefix cli run check`.

**Acceptance criteria:**

- Pipeline and profile references share one exact, raw ASCII name grammar and one syntax-directed routing implementation.
- Named, relative-path, and absolute-path references resolve only through their documented strategy; a missing source never falls back.
- `standard.json` is rejected with guidance naming `standard` and `./standard.json`.
- Missing settings and `{"afk":{"stages":{}}}` both produce an empty settings stage map; `{}` and `{"afk":{}}` are invalid.
- Settings and execution-profile documents reject unknown fields at every level and collect all discoverable schema problems.
- A profile entry replaces the complete settings entry, an omitted profile stage falls back to its complete settings entry, and fields never merge across sources.
- Every selected stage resolves to a harness, non-empty model, idle timeout, and heartbeat or produces a pre-allocation error naming that stage.
- Neither local document schema accepts prompt or instructions fields.
- The targeted tests and the full CLI gate pass.

**Consumes:** the exact catalog ID set exported by `cli/src/pipeline/catalog.ts`.

**Produces:** `resolveDocumentReference(reference, role, configRoot, cwd)` and the shared raw-name predicate from `cli/src/config/references.ts`; strict `loadStageSettings`, `loadExecutionProfile`, and `resolveStageBindings` behavior plus the resolved local binding type from `cli/src/config/execution.ts`.
