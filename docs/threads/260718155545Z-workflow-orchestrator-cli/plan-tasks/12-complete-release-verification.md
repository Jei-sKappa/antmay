### Task 12: Complete release verification and operating documentation

**Objective:** Close every remaining acceptance criterion with production-path cases, architecture checks, real-herdr smoke guidance, and current repository/user documentation.

**Input / context:** The E2E harness and FR-1–FR-5 matrix from Task 11; `spec.md` §5, FR-6 through FR-11, and the Degrees of freedom; `decisions.md DR1`–`DR4`, `decisions.md DR8`, `decisions.md DR14`, `decisions.md DR17`–`DR24`; the repository update rule in `AGENTS.md` requires the new workspace, commands, and verification workflow to be documented for later sessions.

**Steps:**
1. Add strict requirement definitions and declarative cases for structured Claude/Codex outcomes, all transcript/pane false positives, malformed/additive lines, Claude fork following, Codex subagent exclusion, transient evidence failure, and positive ended-without-outcome unknown.
2. Add cases for repository/all status scope, pre-output reconciliation, observer restoration, human/JSON parity, exact schema/stdout contract, pending-decision/review counts, archived exclusion, and terminal immutability.
3. Add cases for explicit/contextual attach selection, active and retained terminal panes, ambiguity/remediation, missing panes, immediate/later attachment parity, retained-pane non-mutation, and the absence of cleanup behavior.
4. Add a cross-command filesystem audit covering spawn, worker detection, status, and attach under injected state roots; assert repository/harness configuration roots remain byte-identical and changing `ANTMAY_STATE_HOME` relocates every tool-owned file.
5. Add architecture tests proving no pane/multiplexer concept in core, herdr is external, a second adapter needs only the defined surface, terminal transitions remain detector-neutral, no hooks/daemon are installed, and workflow skills remain unchanged and directly usable without the CLI.
6. Document installation, prerequisites, command contracts, state-root precedence, catalog/request postures, classifications, JSON schema link, retained-pane lifecycle, supported platforms, and direct-skill optionality in `docs/antmay-cli.md`; add a concise CLI entry point to the root README without displacing the skill suite.
7. Document a real-herdr/scripted-harness procedure for pane creation, `spawn --attach`, detached spawn plus later attach, worker detection, retained terminal panes, and all four terminal classifications on macOS/Linux; document the optional real-Claude/real-Codex smoke separately and mark it outside routine deterministic gates.
8. Update `AGENTS.md` to describe the implemented two-package CLI workspace, root commands, test layout, external-boundary policy, and where CLI user documentation lives, while preserving all workflow skill-authoring rules.
9. Run the four-check plan acceptance sweep mechanically: trace every behavioral AC to a passing case, every architecture AC to a named structural test, compare the public help/catalog/JSON outputs to the spec, run the full standing gates, and run the documented real-herdr smoke when herdr is available.

**Files modified:**
- `packages/cli/requirements/functional/06-outcome-attention.yml` (NEW)
- `packages/cli/requirements/functional/07-status.yml` (NEW)
- `packages/cli/requirements/functional/08-attach.yml` (NEW)
- `packages/cli/requirements/functional/09-write-boundary.yml` (NEW)
- `packages/cli/requirements/functional/10-architecture.yml` (NEW)
- `packages/cli/requirements/functional/11-verification.yml` (NEW)
- `packages/cli/test/e2e/cases/06-outcome-attention.yml` (NEW)
- `packages/cli/test/e2e/cases/07-status.yml` (NEW)
- `packages/cli/test/e2e/cases/08-attach.yml` (NEW)
- `packages/cli/test/e2e/cases/09-write-boundary.yml` (NEW)
- `packages/cli/test/e2e/cases/10-architecture.yml` (NEW)
- `packages/cli/test/e2e/cases/11-verification.yml` (NEW)
- `packages/cli/test/e2e/harness.test/requirements.test.ts` (NEW)
- `packages/cli/test/architecture-boundaries.test.ts` (NEW)
- `packages/cli/test/public-contract.test.ts` (NEW)
- `docs/antmay-cli.md` (NEW)
- `README.md`
- `AGENTS.md`

**Verification:** `bun run build`, `bun run typecheck`, `bun run test`, `bun run test:cli:e2e`, and `bun run check` all exit 0; the traceability test reports every behavioral AC in FR-1 through FR-11 covered and no architecture-only AC treated as behavioral coverage; `git diff --exit-code -- skills shared .claude-plugin` succeeds after the test/smoke run; follow `docs/antmay-cli.md`'s real-herdr/scripted-harness procedure and record successful DONE/BLOCKED/REFUSED/unknown plus immediate/later attach evidence when herdr is installed.

**Acceptance criteria:**
- Every behavioral acceptance criterion has at least one passing declarative real-CLI case, and every architecture-review criterion has a named passing structural assertion.
- The full matrix covers both harnesses, every classification, false-positive resistance, recovery, status, attention, attachment, retained panes, and the absolute write boundary.
- Human and JSON outputs agree, and JSON stdout exactly matches schema version 1 with no prose.
- Automated coverage uses no product dry-run or built-in fake harness branch.
- The documented real-herdr smoke covers the required macOS/Linux workflow, while real Claude/Codex smoke is clearly optional.
- README, CLI documentation, and `AGENTS.md` accurately describe the shipped current state, commands, supported platforms, and verification workflow.
- Every standing repository gate passes and no workflow skill or harness configuration is changed by running `antmay`.

**Consumes:** production-path E2E harness and FR-1–FR-5 matrix from Task 11 plus all application contracts from Tasks 1–10.

**Produces:** complete FR-1–FR-11 acceptance traceability, full release verification evidence, `docs/antmay-cli.md`, updated README/agent guidance, and a mechanically green v0 workspace.
