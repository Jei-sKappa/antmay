# Expose resolved agent prompts in scripted demos

## Intended outcome

When scripted harness mode launches a stage attempt, the terminal shows the exact resolved prompt carried by that attempt's `AttemptRequest`. The prompt appears as developer-only diagnostic output at the point of invocation, allowing a developer to inspect the harness-specific skill trigger, resolved target, and configured profile prompt while watching a scripted demo.

The diagnostic remains visually and behaviorally separate from simulated agent output and is absent from real-harness runs.

## Context

The runner resolves each stage prompt and supplies it to both real and scripted harness invokers as `AttemptRequest.prompt`. The scripted invoker validates that value against the stage metadata, but the demo terminal exposes only the attempt header and simulated transcript. A prompt-assembly defect can therefore cause scripted request validation to fail without showing the central input that failed.

This thread addresses GitHub issue #16, scoped to the Antmay CLI. The settled presentation is an automatic inline `[DEV]` block for each scripted invocation rather than an option, summary, or separate artifact (per `decisions.md` DR1).

## Scope

This work covers:

- scripted harness invocations started by both `antmay afk run` and eligible `antmay afk resume` executions;
- terminal rendering of the prompt directly from the invocation request;
- valid attempts, retries, and requests rejected before simulated transcript output;
- automated tests, scripted-demo coverage, and the CLI documentation that describes developer-only scripted output.

This work does not:

- change prompt assembly, profile resolution, stage targeting, or the value sent to either harness;
- expose prompts during real Codex or Claude Code harness invocations;
- add a CLI flag, settings field, scenario field, checkpoint field, or environment variable;
- add prompt output to the demo summary, attempt logs, simulated transcript, or a separate persisted artifact;
- add an escaped or duplicate representation of the prompt;
- emit a prompt for a reserved attempt that is interrupted before the invoker is called.

## Expected behavior

### FR-1: Inline developer prompt block

Every call into the scripted invoker emits exactly one developer-only block headed `Resolved prompt`. The heading and every physical prompt line carry the `[DEV]` prefix. The block appears after the corresponding attempt header and before any simulated text or tool-call event for that attempt (per `decisions.md` DR1).

The displayed body is the invocation's `request.prompt` value itself. Display code must not reconstruct the value from the harness, skill, target, or profile metadata.

The prompt is rendered as natural readable text: its line structure is preserved, with no JSON encoding, character escaping, whitespace annotations, or duplicate byte-oriented form (per `decisions.md` DR2).

### FR-2: Scripted-only activation and separation

Prompt blocks are automatic whenever scripted harness mode has been successfully selected. The external gate remains `ANTMAY_TEST_ENABLE_SCRIPTED_HARNESS=1`; unset or empty values retain real-harness behavior, and other non-empty values retain the existing fail-closed configuration error (per `decisions.md` DR1).

The prompt block is executor-authored developer output. It must use the established `[DEV]` terminal convention and must not travel through `AttemptRequest.onEvent`, the agent gutter, or the `Scripted Harness Run` transcript frame. No additional opt-in controls are introduced.

### FR-3: Invocation-boundary timing

The block is emitted immediately upon entry to the scripted invoker, before request-shape validation, case selection, thread-root resolution, session capture, or case execution. The submitted prompt therefore remains visible when prompt validation or another pre-transcript check returns a provider error (per `decisions.md` DR3).

Each retry emits the prompt from its own invocation request after that retry's attempt header. An interruption detected by the runner before `invoke` is called emits no prompt block because no request crossed the invocation boundary (per `decisions.md` DR3).

### FR-4: Existing harness behavior remains authoritative

Prompt display is observational. Scripted request validation, case dispatch, filesystem effects, normalized outcomes, session capture, attempt logs, checkpoints, and exit-code behavior retain their existing contracts. Real-harness invocation and terminal output retain their existing contracts.

The ordinary successful demo scenario already traverses six scripted invocations and therefore provides the catalog's visual example of the new block; a redundant prompt-only scenario is unnecessary. The scenario description, `cli/README.md`, and the scripted-harness contract in `cli/AGENTS.md` must describe the prompt display as current behavior.

## Constraints

- The implementation is confined to `cli/`, its tests, and its living documentation.
- The displayed value must be obtained from the same `AttemptRequest` object accepted by the scripted invoker. Calling `renderStagePrompt` or equivalent prompt-assembly logic for display is prohibited.
- Developer diagnostics use the existing terminal rendering conventions: normal diagnostic output goes to stdout, `[DEV]` identifies every diagnostic line, and ANSI color carries no unique meaning.
- Display integration must preserve the synchronous, fire-and-forget behavior of terminal rendering and must not allow a rendering callback to alter harness classification.
- The scripted toggle remains interpreted at the existing command boundary. Prompt display follows the selected scripted invocation path rather than independently interpreting process environment state.
- The implementation must satisfy the repository's full CLI gate, `npm --prefix cli run check`.

## Acceptance criteria

### FR-1 coverage

- **AC-1.1:** A valid scripted attempt writes exactly one `Resolved prompt` block after its stage attempt header and before its first simulated text or tool-call line; the heading and every prompt line begin with `[DEV]` when color is disabled.
- **AC-1.2:** The displayed body equals that invocation's `request.prompt` content and includes its harness-specific trigger, resolved target, and non-empty profile prompt without a second prompt-rendering call (traces to `decisions.md` DR1).
- **AC-1.3:** A multiline profile prompt is displayed on its natural physical lines, each prefixed `[DEV]`, with no JSON quoting, escaped newline notation, whitespace markers, or duplicate representation (traces to `decisions.md` DR2).

### FR-2 coverage

- **AC-2.1:** A new run and a resume that each select scripted mode with `ANTMAY_TEST_ENABLE_SCRIPTED_HARNESS=1` show one prompt block for every scripted invoker call they make.
- **AC-2.2:** A real-harness execution path with the scripted toggle unset or empty produces no `Resolved prompt` block, and a non-empty value other than `1` retains the existing preflight failure without producing one (traces to `decisions.md` DR1).
- **AC-2.3:** The CLI grammar, settings schema, scripted-scenario schema, and checkpoint schema gain no prompt-display control or state.
- **AC-2.4:** Captured `HarnessEvent` values and the scripted attempt-log transcript contain no `[DEV] Resolved prompt` content; the block appears only in the executor's terminal stream.

### FR-3 coverage

- **AC-3.1:** When `request.prompt` deliberately fails scripted prompt validation, the terminal still shows that mismatching value before the existing normalized provider-error result, with no simulated transcript required (traces to `decisions.md` DR3).
- **AC-3.2:** A scripted case-selection or other pre-transcript validation failure likewise shows the submitted prompt before the failure is reported.
- **AC-3.3:** A retry shows exactly one block after its `attempt <N>` header and uses that retry request's prompt, without replaying an earlier attempt's value.
- **AC-3.4:** A signal handled after attempt reservation but before the runner calls the invoker produces no `Resolved prompt` block (traces to `decisions.md` DR3).

### FR-4 coverage

- **AC-4.1:** Existing scripted invoker tests continue to prove request validation, case selection, outcome normalization, session identity, effects, and attempt-log behavior unchanged.
- **AC-4.2:** Terminal-renderer tests cover single-line and multiline prompt blocks, `[DEV]` prefixing, readable unescaped content, stdout/stderr placement, and color-disabled readability.
- **AC-4.3:** Run and resume integration tests cover scripted activation, output ordering, retry behavior, and absence from real-harness paths.
- **AC-4.4:** The ordinary all-success demo visibly exercises the prompt block and exits with its declared status; its description, `cli/README.md`, and `cli/AGENTS.md` accurately document the rendered behavior.
- **AC-4.5:** `npm --prefix cli run check` passes.

## Degrees of freedom

- The internal dependency shape used to connect scripted invocation entry with the terminal renderer is left to the implementer. A factory callback, display method, or another provider-neutral seam is acceptable if it satisfies every ordering, sourcing, isolation, and failure-path criterion above.
- Helper names, module placement within the existing display/harness boundaries, and test-file allocation are free implementation choices.
- ANSI styling, indentation, and blank-line spacing may reuse or extend the existing developer-block renderer, provided `[DEV]` remains visible without color, every prompt line is prefixed, and the required ordering and readable content stay unchanged.
