# Implementation report

Source: plan.md

## Outcome

All six plan tasks are complete on
`refactor/architecture-and-code-quality-improvements` over the baseline
`b498a93`, and the thread's closure pass is implemented in the current working
tree. Terminal-outcome vocabulary has one production owner in
`cli/src/runner/outcome.ts`, harness identity has one in `cli/src/harness/id.ts`,
and checkpoint declarations, validation, and reading live in separate
purpose-specific modules under `cli/src/state/checkpoint/`.

The closure pass resolves the terminal-guard ambiguity in favor of treating
user-facing prose that names a verdict as protocol text: `DONE_OUTCOME` now
derives the single-token prose sites, and the architecture guard rejects any
larger string literal that embeds a terminal token while continuing to permit an
exact token literal. Validation regressions now pin both the field-shape and the
cross-field aggregate passes, as well as the exact invalid-terminal-token
diagnostic. Rendered terminal strings are unchanged, no demo scenario changed,
and all 42 scenarios pass.

## Changes

**Terminal-outcome vocabulary.** `runner/outcome.ts` is the import-free owner of
the ordered `TERMINAL_OUTCOMES` tuple, the `TerminalOutcome` type derived from
it, the derived stage-advancing `DONE_OUTCOME`, `OUTCOME_PREFIX`,
`isTerminalOutcome`, `formatTerminalOutcome`, and the parser regex derived from
the tuple. Sandcastle completion signals, checkpoint validation, classification,
scripted final messages, and user-facing pause and checkpoint prose derive from
that owner. The architecture test rejects another production module that embeds
a token in prose, restates two or more vocabulary members in a literal, or names
the prefix directly; exact token literals used for narrowed comparisons and
display labels remain outside its subject. The strict guard's red proof named
exactly the expected six pre-existing prose sites before they were replaced.

**Harness identity.** `harness/id.ts` owns `HarnessId`, `HARNESS_IDS` in
diagnostic order, and `isHarnessId`. Configuration and both untrusted checkpoint
membership checks narrow through that predicate while retaining their
site-specific diagnostics. Production and test consumers import identity from
the harness domain, and `harness/id.test.ts` pins the collection and rejection of
non-string input.

**Aggregate checkpoint validation.** `state/checkpoint.test.ts` carries separate
fixtures for four independent field-shape faults and four independent,
shape-valid cross-field faults. Each case asserts the complete, ordered array of
exact diagnostics from one `validateCheckpoint` call. A further regression pins
the exact terminal-token diagnostic, including the vocabulary's order and
wording. A future decomposition therefore cannot short-circuit within either
validation pass without failing a focused test.

**Checkpoint split.** Checkpoint declarations live in the declarations-only
`state/checkpoint/types.ts`; validation lives in
`state/checkpoint/validate.ts`; and `readCheckpoint` lives in
`state/checkpoint/read.ts`. Consumers import the purpose-specific module
directly, with no barrel, forwarding module, or type re-export. The architecture
test holds the declarations module to declarations only and prevents it from
naming the execution or display layers. `cli/AGENTS.md` describes these ownership
boundaries and guards with its surrounding prose fill restored.

## Verification

- Before production code changed, the widened architecture guard failed on
  exactly six embedded-token literals: four in `execution/pause.ts` and two in
  `state/checkpoint/validate.ts`.
- Focused architecture, outcome, pause, and checkpoint tests passed after the
  owner change. The checkpoint suite passes 92 tests, including the exact
  terminal-token diagnostic and both four-fault aggregate cases.
- Three unchanged runs of `npm --prefix cli run check` passed typechecking and
  all 1,172 assertions, then exited `1` because the concurrent
  `execution/engine.test.ts` suite's cleanup hook exceeded 30 seconds. The suite
  passes all 71 tests in isolation. Because the failed test phase prevented the
  composite command from reaching its build step, `npm --prefix cli run build`
  was run separately and exited `0`. This is the repository's documented
  Git-backed-suite contention pattern, but a clean composite `check` exit was
  not obtained in this environment.
- `npm --prefix cli run demo:all` reported 42/42 scenarios. No file under the
  demo scenario directories changed.
- `git diff --check` passed.
- The original extraction preserved declarations and validation mechanically:
  each moved region diffed cleanly against its source, and `read.ts` differed
  from the replaced module only in import specifiers.

## Deviations and judgment calls

1. **The strict terminal-outcome reading was implemented.** The original task's
   file list omitted `execution/pause.ts` and exported no bare-token value, even
   though its prose guard wording covered larger literals naming one token. The
   closure pass resolves that contradiction by bringing the four pause literals
   into scope and exporting `DONE_OUTCOME`; all six reconstructed strings remain
   byte-identical. Historical plan and decision artifacts were not edited.
2. **`isHarnessId` carries zero widening casts** rather than the single one the
   plan names. `HARNESS_IDS.some((id) => id === value)` narrows without a cast,
   so the intended property holds with no widening visible to callers and
   matches `isTerminalOutcome`.
3. **The recovery-kind guard constant and comment were restated** when the
   declaration move made the old module-specific wording false; the guarded
   behavior did not change.
4. **No workspace collaborator was imported into the extracted validator.** The
   moved code has no such dependency: workspace values are validated locally,
   while `WorkspaceConfig` belongs to the declarations module.
5. **One obsolete clause was removed from `readCheckpoint`'s doc comment.** The
   remaining resume-preflight rationale describes the enforced boundary.

## Remaining concerns

- `state/checkpoint/validate.ts` remains the largest production module at 934
  lines, including a roughly 285-line coordinator. Decomposition is tracked in
  issue #44; the cross-field aggregate prerequisite is now in place.
- `OUTCOME_PREFIX` is interpolated into a `RegExp` constructor without escaping.
  It is inert for the current metacharacter-free prefix but latent if that value
  changes.
- The architecture guards are deliberately blunt shape matchers. The
  terminal-outcome union and collection clauses require adjacent token literals;
  the declarations-only guard relies on column-zero top-level syntax, scans
  string contents, and does not reject a type re-export. These limitations fail
  loudly under likely drift but do not prove the architecture exhaustively.
- `harness/id.ts` has neither the leaf guard nor the single-declaration guard of
  its structural sibling `runner/outcome.ts`. Optional owner hardening is tracked
  in issue #45.
- The loading-versus-writing statement and four-domain enumeration in
  `cli/AGENTS.md` are accurate but unenforced, and caller-enumerating doc comments
  can drift as consumers change.
- Test-layout residue remains: checkpoint coverage is still in
  `state/checkpoint.test.ts`, named after a removed module, and `readCheckpoint`
  coverage remains in `state/persist.test.ts` rather than beside `read.ts`.
- Under current host contention the composite check repeatedly times out in the
  concurrent engine suite's cleanup hook despite every assertion and the
  isolated suite passing.

## Follow-ups

- Proceed with issue #40, the planned `runCommand` decomposition.
- Take issue #44 after #40 to decompose checkpoint validation; its aggregate
  diagnostic precondition is already covered by both validation passes.
- Consider issue #45 afterward for optional terminal-outcome and harness-identity
  owner hardening.
- Issue #21, a named `HarnessBackend` interface, remains explicitly out of scope.
