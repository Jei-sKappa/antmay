### Task 9: Implement `antmay status`

**Objective:** Reconcile and report repository-scoped or global runs plus independent pending-bundle attention through faithful human and exact JSON projections.

**Input / context:** Registry, reconciliation, and observer recovery from Tasks 3 and 7; `spec.md` §4.3 and FR-5 through FR-7; `decisions.md DR1`, `decisions.md DR5`, `decisions.md DR9`, `decisions.md DR11`, `decisions.md DR15`, `decisions.md DR18`, `decisions.md DR21`, and `decisions.md DR22`; active/archived workspace semantics from `docs/thread-model.md`.

**Steps:**
1. Replace the status placeholder with typed `--all` and `--json` options; require and canonicalize a current git repository without `--all`, and enumerate every known repository registry key with it.
2. Before projection, reconcile every scoped run against current transcript and endpoint evidence; for still-active stale/degraded observers, call `ensureObserver()` without creating another run.
3. Scan direct active thread roots for non-empty `.pending-decisions/` and `.pending-reviews/` bundles, count files, and exclude archived threads and empty workspaces regardless of run classification.
4. Build one canonical in-memory status projection, then render human output containing all required run identity, skill, harness, classification, reason, and attach fields plus attention counts and attach hints.
5. Render `--json` as exactly one `StatusDocumentV1` JSON document on stdout, route diagnostics to stderr, prohibit additive fields at schema version 1, and use `repositoryPath: null` only for all scope.
6. Sort runs and attention deterministically so human/JSON parity and repeatable automation do not depend on filesystem enumeration order.
7. Add tests for repository/all scope, pre-output reconciliation, observer restoration, terminal immutability, attention counting/exclusion, human fields, strict JSON shape, stdout/stderr separation, and parity between projections.

**Files modified:**
- `packages/core/src/attention.ts` (NEW)
- `packages/core/src/index.ts`
- `packages/core/test/attention.test.ts` (NEW)
- `packages/cli/src/status/attention-scan.ts` (NEW)
- `packages/cli/src/status/format-human.ts` (NEW)
- `packages/cli/src/status/project.ts` (NEW)
- `packages/cli/src/commands/status.ts` (NEW)
- `packages/cli/src/program.ts`
- `packages/cli/test/attention-scan.test.ts` (NEW)
- `packages/cli/test/status-command.test.ts` (NEW)
- `packages/cli/test/status-json.test.ts` (NEW)

**Verification:** `bun run test -- packages/core/test/attention.test.ts packages/cli/test/attention-scan.test.ts packages/cli/test/status-command.test.ts packages/cli/test/status-json.test.ts`, `bun run build`, `bun run typecheck`, and `bun run check` all exit 0; a JSON fixture invocation piped to `node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const x=JSON.parse(s);if(x.schemaVersion!==1)process.exit(1)})'` exits 0.

**Acceptance criteria:**
- Repository scope reports only the canonical cwd worktree; all scope reports every known repository.
- Every scoped run is reconciled before output, and stale active observation is restored without duplicate runs.
- Human output includes every specified field and an attach hint when available.
- JSON stdout is one exact schema-version-1 document with no human prose or additional fields.
- Human and JSON projections agree for the same snapshot.
- Active-thread pending bundles produce independent attention counts; archived and empty workspaces do not.

**Consumes:** registry listing, `reconcileRun()`, `ensureObserver()`, `StatusDocumentV1`, and canonical repository resolution from Tasks 2–7.

**Produces:** `scanAttention()`, canonical status projection, and fully operational `antmay status [--all] [--json]`.
