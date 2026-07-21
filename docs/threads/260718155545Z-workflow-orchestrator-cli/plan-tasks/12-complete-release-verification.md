### Task 12: Complete runtime and architecture verification

**Objective:** Extend production-path coverage through FR-10 and prove every architecture boundary before the release documentation and final FR-11 gate.

**Input / context:** The E2E harness and FR-1–FR-5 matrix from Task 11; `spec.md` §5, FR-6 through FR-10, AC-11.1 through AC-11.3, and the Degrees of freedom; `decisions.md DR1`–`DR4`, `decisions.md DR8`, `decisions.md DR14`, and `decisions.md DR17`–`DR24`.

**Steps:**
1. Add strict requirement definitions and declarative cases for structured Claude/Codex outcomes, all transcript/pane false positives, malformed/additive lines, Claude fork following, Codex subagent exclusion, transient evidence failure, and positive ended-without-outcome unknown.
2. Add cases for repository/all status scope, pre-output reconciliation, observer restoration, human/JSON parity, exact schema/stdout contract, pending-decision/review counts, archived exclusion, and terminal immutability.
3. Add cases for explicit/contextual attach selection, active and retained terminal panes, ambiguity/remediation, missing panes, immediate/later attachment parity, retained-pane non-mutation, and the absence of cleanup behavior.
4. Add a cross-command filesystem audit covering spawn, worker detection, status, and attach under injected state roots; assert repository/harness configuration roots remain byte-identical and changing `ANTMAY_STATE_HOME` relocates every tool-owned file.
5. Add architecture tests proving no pane/multiplexer concept in core, herdr is external, a second adapter needs only the defined surface, terminal transitions remain detector-neutral, no hooks/daemon are installed, and workflow skills remain unchanged and directly usable without the CLI.
6. Extend the traceability gate so every behavioral AC in FR-1 through FR-10 maps to at least one passing declarative case, every architecture-review AC through FR-10 maps to a named structural assertion instead of behavioral coverage, and unknown or missing references fail the suite; retain harness checks for AC-11.1 through AC-11.3 so the final FR-11 matrix can build on proven infrastructure.
7. Compare the built public help, fixed catalog, status JSON, and package metadata against the specification and run the full automated workspace gates.

**Files modified:**
- `packages/cli/requirements/functional/06-outcome-attention.yml` (NEW)
- `packages/cli/requirements/functional/07-status.yml` (NEW)
- `packages/cli/requirements/functional/08-attach.yml` (NEW)
- `packages/cli/requirements/functional/09-write-boundary.yml` (NEW)
- `packages/cli/test/e2e/cases/06-outcome-attention.yml` (NEW)
- `packages/cli/test/e2e/cases/07-status.yml` (NEW)
- `packages/cli/test/e2e/cases/08-attach.yml` (NEW)
- `packages/cli/test/e2e/cases/09-write-boundary.yml` (NEW)
- `packages/cli/test/e2e/harness.test/requirements.test.ts` (NEW)
- `packages/cli/test/architecture-boundaries.test.ts` (NEW)
- `packages/cli/test/public-contract.test.ts` (NEW)

**Verification:** `bun run build`, `bun run typecheck`, `bun run test`, `bun run test:cli:e2e`, and `bun run check` all exit 0; the traceability test reports every behavioral AC in FR-1 through FR-10 covered and no architecture-only AC treated as behavioral coverage; harness tests prove AC-11.1 through AC-11.3; public-contract tests compare the built help, catalog, JSON schema, and package metadata to the fixed specification; `git diff --exit-code -- skills shared .claude-plugin` succeeds after the automated suite.

**Acceptance criteria:**
- Every behavioral acceptance criterion in FR-1 through FR-10 has at least one passing declarative real-CLI case, and every architecture-review criterion through FR-10 has a named passing structural assertion.
- The full matrix covers both harnesses, every classification, false-positive resistance, recovery, status, attention, attachment, retained panes, and the absolute write boundary.
- Human and JSON outputs agree, and JSON stdout exactly matches schema version 1 with no prose.
- Automated coverage uses no product dry-run or built-in fake harness branch.
- Every standing automated repository gate passes and no workflow skill or harness configuration is changed by running `antmay`.

**Consumes:** production-path E2E harness and FR-1–FR-5 matrix from Task 11 plus all application contracts from Tasks 1–10.

**Produces:** complete automated FR-1–FR-10 acceptance traceability, AC-11.1–AC-11.3 harness evidence, named architecture evidence, and a mechanically green v0 workspace ready for release documentation and final traceability.
