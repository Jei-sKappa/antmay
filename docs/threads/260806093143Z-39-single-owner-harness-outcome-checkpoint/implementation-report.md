# Implementation report

Source: plan.md

## Outcome

All six plan tasks are complete, each landed as one commit on
`refactor/architecture-and-code-quality-improvements` over the baseline `b498a93`.
The three concepts the thread set out to give a single owner now have one:
the terminal-outcome vocabulary lives in `cli/src/runner/outcome.ts`, harness
identity in `cli/src/harness/id.ts`, and the checkpoint's three reasons to change
are separated into `cli/src/state/checkpoint/types.ts`, `validate.ts`, and
`read.ts`, with no `state/checkpoint.ts` and no barrel over the three. The
protocol's bytes, the checkpoint's behavior, and every rendered terminal string
are unchanged; the CLI gate and the full 42-scenario demo catalog pass against the
final layout.

## Changes

**Terminal-outcome vocabulary (`12bf5e2`).** `runner/outcome.ts` is the import-free
owner of the ordered `TERMINAL_OUTCOMES` tuple, the `TerminalOutcome` type derived
from it, `OUTCOME_PREFIX`, `isTerminalOutcome`, `formatTerminalOutcome`, and the
parser regex derived from the tuple. A new `architecture.test.ts` section — written
before any consumer changed, so its initial failure enumerated the copies to
remove — holds every other production module to importing the protocol rather than
restating it, and asserts the owner imports nothing, which is what lets four
domains depend on it without a cycle. Sandcastle's completion signals, the
checkpoint's terminal-token union and its validation, the classifier's
expected-prefix sentence and reported-outcome fragment, and every valid scripted
final message now derive from the owner. `classify.test.ts` pins the derived
sentences whole.

**Harness identity (`2321b2c`).** `harness/id.ts` owns `HarnessId`, `HARNESS_IDS`
typed `readonly HarnessId[]` in diagnostic order, and `isHarnessId`.
`config/execution.ts` keeps only the diagnostic that maps the ids into prose; the
settings validator and both untrusted checkpoint membership checks narrow through
the one shared predicate while keeping their own site-specific diagnostics. Nineteen production and test consumers import
identity from the harness domain. `harness/id.test.ts` pins the collection's order
and contents and the rejection of non-string input.

**Aggregate-validation regression (`689f919`).** `state/checkpoint.test.ts` gained
a named regression test and a local `multiFaultCheckpoint()` helper that pairs a
document carrying four independent faults with the diagnostics it owes. One
`validateCheckpoint` call asserts each exact diagnostic individually and pins the
error count, so the all-problems-at-once contract is mechanically observable rather
than incidental. Test-only; no production file changed.

**Checkpoint split (`00032cf`, `d254af2`, `55f2278`).** The sixteen checkpoint
declarations moved into a declarations-only `state/checkpoint/types.ts` holding a
header docblock, seven type-only imports, and the declarations, and all 37 type
consumers import it directly — no barrel, forwarding module, or type re-export
exists anywhere. The validation layer moved whole to
`state/checkpoint/validate.ts`, narrowing untrusted input through the shared
terminal-outcome and harness-id predicates, with `validateCheckpoint` intact as one
coordinating validator. `readCheckpoint` moved to `state/checkpoint/read.ts` and
`state/checkpoint.ts` was deleted, with all seven readers retargeted.
`architecture.test.ts` gained a two-clause guard holding the vocabulary module to
declarations only and to naming neither `execution/` nor `display/`, and all four
of its checkpoint references now name a purpose-specific module; none was deleted
and `PAUSE_LITERAL` is unchanged. `cli/AGENTS.md`'s `runner/`, `harness/`, and
`state/` module-layout entries and its architecture-test contract summary describe
the final ownership boundaries and the guards that hold them.

## Verification

- Every task's own verification block passed.
- `npm --prefix cli run check` (typecheck + 1169 vitest tests + build) exited `0` at
  every commit boundary, run three times independently at each one.
- `npm --prefix cli run demo:all` reported 42/42 scenarios at the terminal-outcome
  change and again against the final module layout. No demo scenario, marker, or
  file under `cli/scripts/` was added, removed, or edited.
- Preservation was established mechanically rather than by inspection where it
  mattered: the declaration move and the validation transplant each diff clean
  against their original region, and `read.ts` differs from the module it replaced
  only in its two import specifiers. Error order, wording, field validation,
  cross-field invariants, and aggregate collection therefore hold by construction.
- The aggregate regression's teeth were established twice: an early return
  temporarily inserted after the first check made the new test fail on the second
  expected diagnostic, and the same conclusion was re-derived by reading —
  the four faults are pushed from four distinct sites, so a per-section
  short-circuit fails the test as well as a first-problem one.
- The two new declarations-only guard clauses were probed against injected
  violations twice over, 26 synthetic lines in the second pass, confirming every
  value form is rejected and that neither clause can pass vacuously.
- Intentionally skipped: `demo:all` at the harness-identity, aggregate-regression,
  declaration-extraction, and validation-extraction changes, whose verification
  blocks do not prescribe it. Those diffs are import specifiers, byte-identical
  moved code, and test-only text, with no literal, format string, or display path
  touched; the full catalog then ran against the final layout.

## Deviations and judgment calls

1. **The terminal-outcome guard's subject is narrower than the plan's wording.** It
   fires on any string literal carrying the `Outcome: ` prefix and on any literal
   naming two or more tokens, so a larger literal naming exactly one token and no
   prefix stays outside it; six such prose literals remain, four in
   `execution/pause.ts` and two in what is now `state/checkpoint/validate.ts`. The
   strict reading makes the task self-contradictory: `execution/pause.ts` is absent
   from its own `Files modified` list, and the task exports no bare-token value from
   which such prose could be rebuilt byte-identically. Under the implemented
   reading the guard's initial failure set is exactly the four modules the task
   changes. This is a fault in the plan text rather than in the code, reached
   independently at implementation and at review; the plan was not patched.
2. **`isHarnessId` carries zero widening casts** rather than the single one the plan
   and its decision record name. `HARNESS_IDS.some((id) => id === value)` narrows
   without a cast, because `===` against an `unknown` operand is legal, so the
   property the criterion secures — the collection typed by its own members, with no
   widening visible to a caller — holds more strongly with none. The form now
   matches the sibling `isTerminalOutcome`.
3. **The recovery-kind guard constant was renamed and its comment restated** while
   its path deliberately stayed on the pre-split module for the following task, as
   that task required. The comment named the module declaring the recorded union,
   which the declaration move made false.
4. **No workspace collaborator was imported into the extracted validator**, though
   the plan step listed one. The moved code never had such an import: the
   checkpoint's workspace section is validated against inline literals, and
   `WorkspaceConfig` is named only by the declarations module. Adding one would
   have stated a dependency the code does not have.
5. **One clause left `readCheckpoint`'s doc comment** — that loading lives with the
   document it validates — which stopped being true when validation moved out. The
   surviving resume-preflight rationale still names a boundary the architecture test
   enforces.

## Remaining concerns

- `state/checkpoint/validate.ts` is the largest production module in the tree at 934
  lines, with a roughly 285-line `validateCheckpoint`. This is the decomposition the
  thread deliberately deferred; the module states one purpose, so the pressure is a
  size heuristic rather than the one-reason-to-change bar.
- The aggregate-validation regression pins the field-shape pass only.
  `validateCheckpoint` returns as soon as that pass has any error, so no single
  document can carry faults from both passes, and a decomposition that
  short-circuited inside the cross-field section would keep the test green.
- `OUTCOME_PREFIX` is interpolated into a `RegExp` constructor unescaped: inert for
  the current metacharacter-free value, latent if a future prefix gains one.
- The checkpoint terminal-token diagnostic derives from the owner but is pinned by no
  test; its byte-identity rests on two independent hand comparisons.
- Guard sharpness limits, each failing loudly rather than silently: the
  terminal-outcome union and collection clauses are shape matchers needing two
  adjacent token literals, so a one-element collection, or members split by an
  intervening expression, would pass; the declarations-only guard's residual escape
  is an indented top-level expression statement, which makes the column-zero
  convention load-bearing; that guard also runs over string-literal contents, so a
  future union member such as `"new-…"` or a field named `class` would trip it; and
  it does not reject a type re-export, so the no-barrel property rests on review.
- `harness/id.ts` has neither the leaf guard nor the single-declaration guard its
  sibling `runner/outcome.ts` has. The thread's decisions asked for neither, but the
  two modules now sit at the same architectural position with different protection.
- One sentence added to `cli/AGENTS.md` states that loading sits apart from writing,
  so a read-only consumer cannot reach a writer through the module it reads from.
  That is true of today's imports and is carried from the module's own doc comment,
  but no guard enforces it.
- Cosmetic and unenforced: the re-flowed architecture-summary paragraph in
  `cli/AGENTS.md` leaves a two-word orphan line, and one `state/` sentence runs to 84
  columns against a roughly 79-column fill. The CLI package has no formatter or
  linter, so nothing covers prose wrapping.
- The four-domain enumeration in `cli/AGENTS.md`'s `runner/` entry is accurate today
  but unchecked, so it can silently go stale; the leaf assertion in the same sentence
  carries the argument without it.
- Doc comments that enumerate current callers — the three narrowing sites named in
  `harness/id.ts` — or restate rationale also present in code will drift as
  consumers change.
- Test-layout residue: coverage for the split still sits in
  `state/checkpoint.test.ts`, named after a module that no longer exists, and
  `readCheckpoint`'s coverage remains in `state/persist.test.ts` rather than beside
  `checkpoint/read.ts`.
- Environment noise rather than a code defect: two whole-suite runs hit intermittent
  30-second timeouts in the `describe.concurrent` Git-backed suites under a load
  average around 21. Those suites pass on their own, and every gate run at a commit
  boundary was green.

## Follow-ups

- The deferred `validateCheckpoint` decomposition, which should also add a
  field-shape-clean case carrying several independent cross-field faults so the
  aggregate contract is pinned for both passes.
- Corrected plan wording for the two plan faults above: the terminal-outcome guard's
  subject stated as implemented, or `execution/pause.ts` brought into scope together
  with a bare-token export; and the workspace collaborator dropped from the
  validation-extraction step.
- A leaf guard and a single-declaration guard for `harness/id.ts`, matching
  `runner/outcome.ts`.
- Pin the checkpoint terminal-token diagnostic in a test, and escape the interpolated
  `OUTCOME_PREFIX`.
- Issue #40 (decompose `runCommand`) is now easier, since `commands/run.ts` is among
  the narrowed importers. Issue #21 (a named `HarnessBackend` interface) remains
  explicitly out of scope.
