# Plan: Scripted harness for manual CLI testing

Implement the developer-only scripted harness as an out-of-band runtime override while preserving the existing logical providers, generic runner semantics, durable checkpoint model, Git boundaries, and lazy command surface. The work first makes the harness request self-describing, then adds the strict scenario contract and deterministic adapter, and finally wires the paired scripted seams into `run` and `resume` with fail-closed checkpoint behavior.

Source: spec.md

## Global Constraints

- Preserve Node `>=22`, strict TypeScript, ESM, the existing tsup/Vitest toolchain, and the dynamic-import discipline documented in `cli/AGENTS.md`. Help, version, grammar errors, and `list` must not gain config, state, Git, or harness side effects.
- Add no runtime or development dependency for environment parsing, JSON schema validation, fake behavior, or filesystem effects.
- Keep `HarnessId` equal to `"codex" | "claude-code"` and keep `settings.json` validation unchanged. Scripted mode is out-of-band test instrumentation, not a provider.
- Keep the existing provider-neutral `HarnessInvoker`, `AttemptOutcome`, `HarnessEvent`, runner classification, waiting taxonomy, exit codes, queue gates, Git boundaries, checkpoint atomicity, and signal handling intact.
- Scenario configuration is read-only. The CLI never creates, rewrites, normalizes, snapshots, or annotates `scripted-harness.json`.
- Built-in cases may touch only their fixed thread-local artifacts. They must validate confinement and must never execute arbitrary commands or user data.
- Preserve old real-mode checkpoints and ordinary `run`, `resume`, and `list` behavior. The optional scripted marker must be validated when present and preserved by all subsequent checkpoint writes.
- Introduce no additional test-mode environment variable.
- Do not add the conveniences or automated E2E scope excluded by DR8 and DR9.
- Do not stage, commit, push, publish, or alter package-release state as part of implementing this spec unless separately requested.

## Tasks

1. **Add explicit stage-attempt context to the harness boundary** — make every invocation carry the durable identity and prompt inputs the scripted adapter must validate without changing Sandcastle behavior. → `plan-tasks/01-add-attempt-context.md`
2. **Implement strict scripted scenario loading** — interpret the exact test toggle and load the fixed-path scenario through an exhaustive, code-owned schema and case catalog. → `plan-tasks/02-load-scripted-scenario.md`
3. **Implement the deterministic scripted adapter** — provide the scripted invoker, seven bounded cases, safe thread-local effects, normalized events/logs, and process-free probe. → `plan-tasks/03-implement-scripted-adapter.md`
4. **Wire scripted mode into run and resume** — select both scripted seams together, persist and enforce the fail-closed marker, cover full command behavior, and document the architecture. → `plan-tasks/04-wire-scripted-runtime.md`
