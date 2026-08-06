### Task 1: Centralize and guard terminal outcomes

**Objective:** Make `cli/src/runner/outcome.ts` the single import-free owner of the terminal-outcome tokens, prefix, parsing, narrowing, and line construction while preserving every rendered byte.

**Input / context:** `seed.md`; `decisions.md DR1`, `decisions.md DR5`, and `decisions.md DR7`; the current declarations and renderings in `cli/src/runner/outcome.ts`, `cli/src/runner/classify.ts`, `cli/src/state/checkpoint.ts`, `cli/src/harness/backends/sandcastle.ts`, and `cli/src/harness/scripted/cases.ts`. The architecture guard must be authored first so its initial failure enumerates the production copies that this task removes. Test modules and `cli/src/test-helpers/` are outside the guard's production-module subject.

**Steps:**

1. Add a terminal-outcome ownership section to `cli/src/architecture.test.ts` before changing production consumers. Make it inspect `productionModules()` and fail when any module other than `runner/outcome.ts` embeds `DONE`, `BLOCKED`, or `REFUSED` in a larger string literal, embeds the bare `Outcome: ` prefix, independently redeclares the three-token union, or holds an untyped runtime collection of those tokens.
2. Keep token comparisons against already-narrowed values outside the guard, and keep the `outcome-refused` / `outcome-blocked` display-event labels outside its subject. Add an assertion that `runner/outcome.ts` has no imports, so consumers from other domains cannot create a runtime cycle through the owner.
3. In `cli/src/runner/outcome.ts`, declare `TERMINAL_OUTCOMES` as the ordered readonly tuple `DONE`, `BLOCKED`, `REFUSED`; derive `TerminalOutcome` from that tuple; declare the exact `OUTCOME_PREFIX` value `Outcome: `; export `isTerminalOutcome(value: unknown): value is TerminalOutcome`; and export `formatTerminalOutcome(token: TerminalOutcome, detail?: string): string`, which emits the bare prefix plus token when `detail` is absent and the existing ` — ` detail form when it is present.
4. Derive the parser's regular expression and recognized-token narrowing from the vocabulary in `runner/outcome.ts`. Preserve final-line selection, line-ending normalization, word-boundary behavior, candidate text, and uninterpreted detail parsing exactly.
5. Extend `cli/src/runner/outcome.test.ts` to pin the token order, prefix, narrowing predicate, builder output with and without detail, and the existing parser behavior.
6. Replace `cli/src/harness/backends/sandcastle.ts`'s local completion-signal strings with values produced by mapping `TERMINAL_OUTCOMES` through `formatTerminalOutcome`.
7. Change `TerminalResult.token` in `cli/src/state/checkpoint.ts` to `TerminalOutcome | null`, and validate untrusted terminal tokens through `isTerminalOutcome` while retaining the existing diagnostic text.
8. Derive `cli/src/runner/classify.ts`'s expected-prefix sentence from the ordered vocabulary, including the byte-identical `or` before the last item, and build its reported outcome fragment with `formatTerminalOutcome(parse.token)`. Strengthen `cli/src/runner/classify.test.ts` with exact-string assertions for the affected malformed-outcome and `BLOCKED` / `REFUSED` messages.
9. Replace every valid fabricated `finalText` in `cli/src/harness/scripted/cases.ts` with `formatTerminalOutcome`; leave `MALFORMED_FINAL_TEXT` unchanged. Do not add, remove, or edit any demo scenario or marker.
10. Run the focused tests, the full CLI gate, and the complete scripted demo catalog.

**Files modified:**

- `cli/src/architecture.test.ts`
- `cli/src/runner/outcome.ts`
- `cli/src/runner/outcome.test.ts`
- `cli/src/runner/classify.ts`
- `cli/src/runner/classify.test.ts`
- `cli/src/state/checkpoint.ts`
- `cli/src/harness/backends/sandcastle.ts`
- `cli/src/harness/scripted/cases.ts`

**Verification:** From the repository root, run `npm --prefix cli run test -- src/architecture.test.ts src/runner/outcome.test.ts src/runner/classify.test.ts src/state/checkpoint.test.ts src/harness/backends/sandcastle.test.ts src/harness/scripted/cases.test.ts`, then `npm --prefix cli run check`, then `npm --prefix cli run demo:all`; every command exits `0`. Run `git diff --name-only -- cli/scripts/scenarios cli/scripts/demo` and confirm it prints nothing.

**Acceptance criteria:**

- `runner/outcome.ts` is the only production owner of `DONE`, `BLOCKED`, `REFUSED`, and `Outcome: ` protocol construction, and it imports nothing.
- The architecture test rejects embedded protocol strings, an independent token union, and an untyped token collection outside the owner without banning narrowed-token comparisons or the two display-event labels.
- Sandcastle completion signals, checkpoint terminal-token validation, classifier prose, and every valid scripted final message derive from the owner exports.
- Parser behavior and all user-visible terminal text are byte-identical to the pre-task output.
- The full CLI gate and every existing demo scenario pass without scenario changes.

**Consumes:** none

**Produces:** `TERMINAL_OUTCOMES`, `TerminalOutcome`, `OUTCOME_PREFIX`, `isTerminalOutcome(value: unknown): value is TerminalOutcome`, and `formatTerminalOutcome(token: TerminalOutcome, detail?: string): string` from `cli/src/runner/outcome.ts`; the terminal-outcome ownership guard in `cli/src/architecture.test.ts`.
