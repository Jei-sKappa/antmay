# Task 16: Smoke checklist and verification closeout

**Objective:** Ship the documented manual real-harness smoke checklist, audit the automated suites against the spec's FR-20 coverage matrix (closing any gaps), verify the binding architectural boundaries, and land the final whole-package gate.

**Input / context:** `spec.md` §"Acceptance guidance" (FR-20, the required gate, and "Coverage and traceability") and §"Constraints" (Architecture); `decisions.md DR34` (deterministic automated tests + documented manual checklist; the checklist is documentation, not a credentialed gate), `DR46` (boundary review), `DR17` (`npm link` install path). This is the deliberately deferred whole-change gate: everything before it kept `check` green per task; this task proves the assembled suite covers the matrix and the boundaries held.

**Steps:**

1. Append a "Manual smoke checklist" section to `cli/README.md` covering, as numbered checkable steps: build (`npm --prefix cli run check`) and `npm link` from `cli/`; creating a disposable Git repository with a Standard-shaped thread (`seed.md`, `decisions.md`), committed ignore rules for the three workflow operational directories, and a minimal `settings.json`; one real run invoking at least one installed skill through Codex and one through Claude Code (e.g. `spec` on each harness in separate disposable runs); verifying the curated live stream and the verbose attempt log side by side; confirming a recognized `Outcome:` line advanced the stage and produced the declared boundary commit; exercising one real pause (e.g. dropping a file into `.pending-decisions/` mid-recipe) and resuming with the printed command; confirming `antmay afk list` shows the run. State explicitly that the checklist needs real credentials and is run by a human, not CI.
2. Audit the assembled Vitest suites against AC-20.1's enumerated list and AC-20.2's four named proofs, building a short mapping (FR area → test file) as you go; add any missing tests where they belong (expected residual gaps to check explicitly: settings edits not altering snapshots asserted end-to-end across a pause; queue checks repeating under the lock; Sandcastle option mapping for every permission/prompt combination; dirty-worktree resume refusal; the unfinished same-thread-run guard; advanced-past stages never rerunning).
3. Run the architectural boundary checks and fix any violation found: `grep -rln "@ai-hero/sandcastle" cli/src --include='*.ts' | grep -v '^cli/src/harness/sandcastle'` must print nothing outside the adapter and its test; runner modules (`cli/src/runner/runner.ts`) contain no recipe/stage/skill-name strings; `cli/src/main.ts` contains only the early Node guard and dynamic bootstrap, while `cli/src/program.ts` and `cli/src/cli/` contain only parsing, help, and dependency wiring; state/queue/display modules import none of each other's internals beyond published types.
4. Verify packaging end-to-end without a repository-wide cleanup command: configure the build to clean/recreate only its owned `cli/dist/` output, run `npm --prefix cli run check`, and confirm the package does not rely on stale artifacts; `npm link` from `cli/` exposes a working `antmay` on `PATH` (`antmay --version` exits 0); the repository root still has no `package.json`; `cli/package.json` still declares Node ≥ 22 and the exact Sandcastle pin.
5. Fix anything the audit surfaced, keeping changes within the modules the earlier tasks defined.

**Files modified:** `cli/README.md`; plus any test files the coverage audit adds or extends (expected under `cli/src/**/**.test.ts` — enumerate them in the implementation report for this task).

**Verification:** `npm --prefix cli run check` exits 0. `grep -q "Manual smoke checklist" cli/README.md` succeeds. The step-3 boundary greps all come back clean. `test ! -f package.json` at the repository root succeeds. `node -e "const p=require('./cli/package.json'); process.exit(p.dependencies['@ai-hero/sandcastle']==='0.12.0' && p.engines.node.includes('22') ? 0 : 1)"` exits 0.

**Acceptance criteria:**

- `cli/README.md` contains the complete manual checklist with every AC-20.3 element (build + link, one skill per harness in disposable Standard runs, streaming/log verification, recognized outcomes, one real pause and resume), framed as human-run documentation.
- Every AC-20.1 area maps to at least one passing automated test, and all four AC-20.2 proofs exist by name.
- The DR46 boundary checks pass (AC-19.4); packaging checks pass (AC-19.1–AC-19.3).
- `npm --prefix cli run check` — the spec's required automated gate — passes on the finished package.

**Consumes:** the entire assembled package and test suite from Tasks 1–15; the settings example section of `cli/README.md` (Task 2).

**Produces:** none — this is the closing gate; nothing later depends on it.
