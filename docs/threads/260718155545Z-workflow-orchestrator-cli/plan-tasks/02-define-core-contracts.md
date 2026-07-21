### Task 2: Define core run, catalog, and status contracts

**Objective:** Provide the multiplexer-neutral public domain types, fixed completion-skill catalog, lifecycle rules, and exact status document schema used by every command and worker.

**Input / context:** The workspace from Task 1; `spec.md` §§3.1, 3.4, 4.2, and 4.3 plus FR-2, FR-7, and FR-10; `decisions.md DR2`, `decisions.md DR7`, `decisions.md DR9`, `decisions.md DR16`, `decisions.md DR18`–`DR22`, and `decisions.md DR24`.

**Steps:**
1. Define opaque printable run IDs, canonical repository/thread identities, harness/session identities, worker health, attachment data as an opaque execution-lane binding, and the closed `active | done | blocked | refused | unknown` classification union.
2. Define terminal transition helpers that accept a complete reason for transcript-derived terminal outcomes, accept `unknown` only with positive endpoint-end evidence, and refuse to mutate any existing terminal record.
3. Encode exactly the eighteen catalog entries from `spec.md` §3.4 with Claude `/skill-name`, Codex `$skill-name`, and `required | optional | forbidden` request posture; expose lookup and request-validation helpers without reading installed skill prose.
4. Define the exact `StatusDocumentV1` structural contract, repository/all scope union, run projection, attention projection, and deterministic projection helpers with no additional JSON fields.
5. Keep pane, herdr, process, transcript-path, and filesystem implementation concepts out of every core type and export only the intended public API from `packages/core/src/index.ts`.
6. Add focused tests for catalog exactness, request posture, immutable terminal transitions, positive-evidence `unknown`, deterministic projections, and a source-level architecture assertion that core contains no pane/multiplexer/herdr dependency.

**Files modified:**
- `packages/core/src/run.ts` (NEW)
- `packages/core/src/catalog.ts` (NEW)
- `packages/core/src/status.ts` (NEW)
- `packages/core/src/index.ts`
- `packages/core/test/run.test.ts` (NEW)
- `packages/core/test/catalog.test.ts` (NEW)
- `packages/core/test/status.test.ts` (NEW)
- `packages/core/test/architecture.test.ts` (NEW)

**Verification:** `bun run test -- packages/core/test/run.test.ts packages/core/test/catalog.test.ts packages/core/test/status.test.ts packages/core/test/architecture.test.ts`, `bun run build`, `bun run typecheck`, and `bun run check` all exit 0.

**Acceptance criteria:**
- Core exports the complete run/classification/session/status contracts without a pane or multiplexer type.
- The catalog contains exactly the eighteen specified entries and native identities with the fixed request postures.
- Terminal records cannot regress or conflict, and `unknown` requires explicit positive endpoint-end evidence.
- `StatusDocumentV1` matches `spec.md` §4.3 exactly and projects deterministically.
- A future notification consumer can observe an idempotent terminal transition without detector-specific coupling.

**Consumes:** `@antmay/core` package shell and standing workspace gates from Task 1.

**Produces:** `RunRecord`, `RunClassification`, terminal transition helpers, `ANTMAY_SKILL_CATALOG`, catalog request helpers, and `StatusDocumentV1` exports from `@antmay/core`.
