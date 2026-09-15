# Decisions — Expose resolved agent prompts in scripted demos

## DR1: Show resolved prompts during scripted attempts

Context: Scripted demo attempts receive the same fully resolved prompt supplied to the harness invocation, but the terminal stream does not expose it. Scripted harness mode is enabled only when `ANTMAY_TEST_ENABLE_SCRIPTED_HARNESS` is exactly `1`; other values either preserve real-harness behavior or fail validation.

Decision: During every launched scripted harness attempt, print the exact `request.prompt` value inline after the attempt header and before the simulated agent transcript. Render it as a developer-only block whose heading and every prompt line carry the `[DEV]` prefix. Enable this behavior automatically whenever scripted harness mode has been selected, with no additional prompt-display flag, and never emit it for real-harness invocations.

Rationale: Inline placement makes the central agent input visible at the moment it is used, including on retries, while sourcing the text from the actual invocation request prevents display drift from prompt assembly. The existing `[DEV]` convention clearly separates harness diagnostics from simulated agent output. Restricting the block to resolved scripted mode adds no production-run noise; automatic display avoids hiding the demo's diagnostic capability behind another option, at the accepted cost of additional lines in scripted transcripts.

## DR2: Prefer readable prompt text

Context: DR1 requires the exact scripted invocation prompt to be displayed with every physical line marked `[DEV]`. A natural multiline rendering preserves the readable content but does not make invisible details such as trailing spaces or a final newline visually explicit.

Decision: Render `request.prompt` as natural readable text, without JSON encoding, character escaping, or a duplicate byte-oriented representation. Preserve its line structure and apply the `[DEV]` presentation prefix to every displayed physical line.

Rationale: The demo is primarily a human inspection surface for resolved prompt composition. Reading skill triggers, resolved targets, and configured profile instructions directly is more useful than exposing uncommon whitespace details through an encoded representation. Directly sourcing the text from `request.prompt` prevents reconstruction drift, while automated byte-exact tests remain the appropriate place to verify invisible whitespace behavior.

## DR3: Display prompts before scripted request validation

Context: The scripted invoker validates each invocation request before selecting a scripted case or producing simulated transcript output. Its validation includes comparing `request.prompt` with the expected resolved stage prompt, so an assembly defect can reject the request before any agent-like output appears.

Decision: Emit the `[DEV] Resolved prompt` block immediately upon entry to the scripted invoker, before request-shape validation and other pre-transcript checks. Do not emit a prompt for an attempt interrupted before the runner calls the invoker.

Rationale: Prompt validation failures are a primary case the inspection surface must make diagnosable. Showing the submitted `request.prompt` before validation preserves the actual input even when the invoker rejects it, while attempts that never reach the invocation boundary have no submitted request to display. A pre-validation developer block remains distinct from simulated agent output under DR1.

## DR4: Keep prompt rendering observational

Context: The prompt display is developer-only diagnostic output, while the scripted case's completed or normalized failure result remains the authoritative harness outcome. A synchronous exception from the prompt-rendering observer can otherwise escape before the scripted invocation returns that outcome.

Decision: Isolate synchronous exceptions raised by the prompt-rendering observer and always continue into the scripted invocation. A rendering exception must not be reclassified as a provider or harness failure and must not replace the scripted case's outcome. Automated coverage must prove that a throwing observer leaves the authoritative scripted outcome unchanged.

Rationale: Prompt rendering is best-effort observational output. Letting its failure escape bypasses ordinary attempt classification, while reporting it as a provider error would misidentify an executor-display failure as a harness failure. Preserving the scripted outcome accepts that a failed diagnostic may be unavailable when its output path cannot render reliably.

## DR5: Test each prompt-display boundary directly

Context: The implementation's current tests exercise the main prompt-display path but do not directly prove distinct single-line rendering, prompt visibility on pre-transcript case-selection failures, current-request sourcing and exact block count on retries, or exclusion from normalized events and persisted attempt logs. These behaviors are explicit acceptance boundaries in `spec.md`.

Decision: Add focused automated coverage for each missing boundary. Renderer tests must cover single-line and multiline prompts separately. Pre-transcript case-selection failure coverage must prove that the submitted prompt appears before the failure without requiring simulated transcript output. Retry coverage must prove one block per invocation and, with distinguishable invocation requests at the adapter seam, prove that each invocation reports its own current prompt rather than cached text. Event and attempt-log assertions must explicitly prove that resolved-prompt diagnostics enter neither channel. Reconcile `implementation-report.md` after verification so its coverage claims match the evidence.

Rationale: These boundaries protect the feature's central guarantees: the exact current request is shown once at invocation time and remains terminal-only. Direct tests make regressions observable, whereas weakening the acceptance criteria or only softening the report would leave specified behavior unverified.
