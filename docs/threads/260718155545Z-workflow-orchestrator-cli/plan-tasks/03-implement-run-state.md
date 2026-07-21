### Task 3: Implement atomic per-user run state

**Objective:** Persist authoritative run bindings and worker diagnostics only beneath the resolved per-user state root with atomic, idempotent updates.

**Input / context:** The core contracts from Task 2; `spec.md` §3.2 and FR-3, FR-5, and FR-9; `decisions.md DR4`, `decisions.md DR8`, `decisions.md DR12`, `decisions.md DR15`, and `decisions.md DR18`. The registry layout and locking primitive are degrees of freedom; use per-repository keyed JSON records, lock acquisition with bounded stale-lock recovery, and write-to-sibling-plus-rename replacement so no partially written authoritative record is observable.

**Steps:**
1. Add core registry semantics for registering unique run IDs, listing by canonical repository or globally, finding by public ID, updating worker health, and applying immutable terminal transitions.
2. Resolve the state root in the exact priority `ANTMAY_STATE_HOME`, non-empty `XDG_STATE_HOME/antmay`, then `~/.local/state/antmay`; canonicalize repository keys without writing to the repository.
3. Implement a filesystem registry store in `packages/cli` that serializes versioned records, validates loaded data, quarantines no data silently, and reports malformed state as an operational error.
4. Make registration and updates safe across worker/command races with a repository-scoped lock and atomic replacement; retries of the same transition must return the existing record, while conflicting terminal transitions must fail without rewriting it.
5. Store worker heartbeat, health, diagnostic, tail cursor, session binding, adapter name, and opaque attach handle beneath the same state root while keeping these operational fields out of core pane concepts.
6. Add tests using isolated temporary roots for all resolution branches, repository-key separation, ID lookup, atomic replacement, concurrent identical terminalization, conflicting terminalization, malformed state, and relocation through `ANTMAY_STATE_HOME`.

**Files modified:**
- `packages/core/src/registry.ts` (NEW)
- `packages/core/src/index.ts`
- `packages/core/test/registry.test.ts` (NEW)
- `packages/cli/src/state/root.ts` (NEW)
- `packages/cli/src/state/registry-store.ts` (NEW)
- `packages/cli/test/state-root.test.ts` (NEW)
- `packages/cli/test/registry-store.test.ts` (NEW)

**Verification:** `bun run test -- packages/core/test/registry.test.ts packages/cli/test/state-root.test.ts packages/cli/test/registry-store.test.ts`, `bun run build`, `bun run typecheck`, and `bun run check` all exit 0; a temporary-root test confirms every created file is beneath its injected `ANTMAY_STATE_HOME` and the fixture repository hash is unchanged.

**Acceptance criteria:**
- State-root resolution follows the three-level priority exactly and honors non-empty values only.
- Runs are keyed by canonical repository folder and have stable public IDs usable for lookup.
- Concurrent/repeated updates are atomic and idempotent, and terminal records never regress or conflict.
- Operational data and authoritative bindings are contained beneath the selected state root.
- Registry operations do not write to repository or harness configuration roots.

**Consumes:** `RunRecord`, terminal transition helpers, and public registry-neutral types from Task 2.

**Produces:** core registry operations; `resolveStateRoot()`; `FilesystemRegistryStore` implementing atomic run registration, lookup, listing, health updates, and terminalization.
