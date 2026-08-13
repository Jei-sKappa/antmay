### Task 1: Relocate the validator test beside the validator

**Objective:** Move `cli/src/state/checkpoint.test.ts` to
`cli/src/state/checkpoint/validate.test.ts` as a Git-recorded rename, so the
directory that holds the most heavily tested module in `state/` stops looking
untested.

**Input / context:** `decisions.md` DR5 settles that only the validator test
relocates: every `readCheckpoint` case stays in `cli/src/state/persist.test.ts`,
no `cli/src/state/checkpoint/read.test.ts` is created, and no shared checkpoint
fixture is extracted into `cli/src/test-helpers/`. `cli/vitest.config.ts` already
includes `src/**/*.test.ts`, so the new location is collected with no
configuration change. Nothing in production code, tooling, or configuration
references the old path — the only occurrences outside the file itself are in
prose inside earlier threads' artifacts, which are historical records and are not
edited. This task is a pure relocation: content changes only where an import
specifier must change to keep resolving.

**Steps:**
1. From the repository root, run `git mv cli/src/state/checkpoint.test.ts cli/src/state/checkpoint/validate.test.ts`.
2. In the relocated file, change the import specifier `../test-helpers/waiting.js` to `../../test-helpers/waiting.js`.
3. Change the type-only import specifier `./checkpoint/types.js` to `./types.js`.
4. Change the import specifier `./checkpoint/validate.js` to `./validate.js`.
5. Change nothing else in the file — no test case, no fixture helper, no comment, no describe title.

**Files modified:** `cli/src/state/checkpoint.test.ts` (DELETED),
`cli/src/state/checkpoint/validate.test.ts` (NEW — the same file, renamed)

**Verification:**
- `test -f cli/src/state/checkpoint/validate.test.ts && ! test -f cli/src/state/checkpoint.test.ts` succeeds.
- `git status --porcelain` shows the change as a rename (`R`) of that path pair, not a deletion plus an addition.
- `grep -n "test-helpers/waiting.js\|\./types.js\|\./validate.js" cli/src/state/checkpoint/validate.test.ts` shows exactly the three corrected specifiers, and `grep -c "checkpoint/types.js\|checkpoint/validate.js" cli/src/state/checkpoint/validate.test.ts` returns `0`.
- `grep -c "readCheckpoint" cli/src/state/persist.test.ts` returns `5`, and `test -e cli/src/state/checkpoint/read.test.ts` fails.
- `npm --prefix cli run test -- src/state/checkpoint/validate.test.ts` exits `0`.
- `npm --prefix cli run check` exits `0`.
- `npm --prefix cli run lint` exits `0`.

**Acceptance criteria:**
- `cli/src/state/checkpoint/validate.test.ts` exists and `cli/src/state/checkpoint.test.ts` does not. (AC-6.1)
- Git records the change as a rename of that file, not a deletion plus an addition. (AC-6.2)
- Its imports resolve to `./types.js`, `./validate.js`, and `../../test-helpers/waiting.js`. (AC-6.3)
- `cli/src/state/persist.test.ts` still contains all five of its `readCheckpoint` uses; no `cli/src/state/checkpoint/read.test.ts` exists; no module is added to `cli/src/test-helpers/`. (AC-6.4)
- `cli/vitest.config.ts` is unchanged and the relocated suite is collected and passes.
- Beyond the three import specifiers, the file's content is identical to its pre-move content.

**Consumes:** none

**Produces:** `cli/src/state/checkpoint/validate.test.ts` — the validator's test
file at its final path, which every later task in this plan reads and runs.
