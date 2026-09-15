# Plan: Correct the V3 run protocol and implementation status layers

## Objective and context

Apply the two settled follow-up decisions from the prior implementation review so V3 has one unambiguous boundary between preflight refusal and in-run blocking, and so internal implementation bookkeeping does not become a second project-wide status protocol. The canonical V3 docs are corrected first; the affected skill bodies then implement that contract in execution order.

Source: docs/threads/260715094144Z-v3-workflow-fixes/implementation/discussions/260715200148Z-implementation-review-findings-decision-log.md

## Global Constraints

The source states no constraints.

## Tasks

1. **Correct the canonical V3 run-protocol docs** — define the preflight/execution boundary, dialogue-driven handshakes, three-token terminal outcomes, factual single-agent progress, and skill-local subagent contracts. → `tasks/01-correct-canonical-run-protocol.md`
2. **Reclassify the thread handshakes as dialogue-driven** — align `open-thread` and `archive-thread` with their question-and-confirmation purpose and remove completion-run outcomes. → `tasks/02-reclassify-dialogue-handshakes.md`
3. **Apply refusal-versus-blocking semantics to completion skills** — make invocation repair, prerequisites, and safety gates refuse during preflight while preserving decision bundles only for human intent discovered after work begins. → `tasks/03-fix-completion-skill-preflight.md`
4. **Replace single-agent task statuses with factual progress** — remove formal per-task tokens from `implement` and `implement-plan` and map every run to `DONE`, `BLOCKED`, or `REFUSED`. → `tasks/04-simplify-single-agent-progress.md`
5. **Localize the subagent executor's return contracts** — retain only topology-required reply tokens, remove the orchestrator's second status protocol, and record cycle facts beneath the universal run outcome. → `tasks/05-localize-subagent-return-contracts.md`
