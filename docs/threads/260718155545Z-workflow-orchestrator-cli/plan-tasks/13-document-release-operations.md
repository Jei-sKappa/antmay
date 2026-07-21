### Task 13: Document and verify release operations

**Objective:** Publish the current CLI operating contract for users and maintainers, verify the real-herdr smoke path where available, and finish the release gate without changing workflow skills or harness configuration.

**Input / context:** The FR-1–FR-10 acceptance matrix and harness evidence from Task 12; `spec.md` §5, FR-11, and AC-1.3; `decisions.md DR4`, `decisions.md DR8`, `decisions.md DR14`, `decisions.md DR17`–`DR20`, and `decisions.md DR24`; the repository update rule in `AGENTS.md` requires the new workspace, commands, and verification workflow to be documented for later sessions.

**Steps:**
1. Document installation, prerequisites, command contracts, state-root precedence, catalog/request postures, classifications, the exact JSON contract, retained-pane lifecycle, supported platforms, and direct-skill optionality in `docs/antmay-cli.md`.
2. Document a real-herdr/scripted-harness procedure for pane creation, `spawn --attach`, detached spawn plus later attach, worker detection, retained terminal panes, and DONE/BLOCKED/REFUSED/unknown on macOS and Linux.
3. Document the optional real-Claude/real-Codex smoke separately and state that it is additional evidence outside routine deterministic gates.
4. Add a concise CLI entry point to the root README without displacing the skill suite, and update `AGENTS.md` with the implemented two-package workspace, root commands, test layout, external-boundary policy, and CLI documentation location while preserving the workflow authoring rules.
5. Add the strict FR-11 requirement definition and declarative verification cases, then extend the traceability gate so every behavioral AC in FR-1 through FR-11 has case evidence and every architecture-review AC has a named structural assertion.
6. Run the documented real-herdr/scripted-harness smoke when herdr is available and record the observed classifications, immediate/later attachment, worker completion, and retained-pane behavior in the verification hand-off; when herdr is unavailable, record that the environment-dependent manual smoke precondition was absent without weakening the documented procedure or automated acceptance evidence.
7. Run the complete standing gates once more and confirm that the test and smoke paths leave workflow skills and harness configuration unchanged.

**Files modified:**
- `docs/antmay-cli.md` (NEW)
- `README.md`
- `AGENTS.md`
- `packages/cli/requirements/functional/11-verification.yml` (NEW)
- `packages/cli/test/e2e/cases/11-verification.yml` (NEW)

**Verification:** `bun run build`, `bun run typecheck`, `bun run test`, `bun run test:cli:e2e`, and `bun run check` all exit 0; the traceability test reports every behavioral AC in FR-1 through FR-11 covered and no architecture-only AC treated as behavioral coverage; `docs/antmay-cli.md` covers every operating and smoke topic named above; `git diff --exit-code -- skills shared .claude-plugin` succeeds after the test/smoke run; when herdr is installed, following the documented scripted-harness procedure records successful DONE/BLOCKED/REFUSED/unknown plus immediate/later attach evidence.

**Acceptance criteria:**
- README, CLI documentation, and `AGENTS.md` accurately describe the shipped current state, commands, state boundary, supported platforms, and verification workflow.
- The real-herdr/scripted-harness procedure covers pane creation, immediate and later attachment, worker detection, retained terminal panes, and all four terminal classifications on macOS and Linux.
- The optional real-Claude/real-Codex smoke is documented separately and is not required for routine deterministic test completion.
- Every behavioral acceptance criterion has passing declarative evidence, and every architecture-review criterion has a named passing structural assertion.
- Every standing repository gate passes, and test/smoke execution changes no workflow skill or harness configuration.

**Consumes:** complete automated FR-1–FR-10 acceptance traceability, AC-11.1–AC-11.3 harness evidence, named architecture evidence, and the green v0 workspace from Task 12.

**Produces:** complete FR-1–FR-11 acceptance traceability, `docs/antmay-cli.md`, updated README and maintainer guidance, documented real-herdr and optional real-harness smoke procedures, and final release verification evidence.
