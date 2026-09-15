# Task 1: Correct the canonical V3 run-protocol docs

**Objective:** Make the canonical V3 documentation state the settled preflight, blocking, terminal-outcome, interaction-posture, and internal-progress rules without preserving the superseded bundle-every-ambiguity model.

**Input / context:** The authoritative decisions are `docs/threads/260715094144Z-v3-workflow-fixes/implementation/discussions/260715200148Z-implementation-review-findings-decision-log.md P1` and `P2`. The existing canonical wording in `docs/project/v3/skill-authoring.md` and `docs/project/v3/thread-model.md` still routes most resolved-thread preflight ambiguities to `.pending-decisions/`, while the three workflow documents still use attended/AFK distinctions that P1 removes.

**Steps:**

1. In `docs/project/v3/skill-authoring.md`, name `open-thread` and `archive-thread` as dialogue-driven handshake skills and keep dialogue-driven operations outside the completion-run terminal-outcome requirement.
2. Replace the current completion-oriented ambiguity rule with a mandatory preflight boundary: resolve the thread and target, validate invocation input, required artifacts, tooling/credentials, and safety gates before substantive execution; any failure at that stage writes no workflow artifact and ends `REFUSED` with a precise re-invocation or remediation instruction.
3. State the dirty-worktree authorization rule in the canonical preflight text: advance authorization is usable only when it acknowledges that existing changes will be preserved and may enter implementation commits; a bare instruction to ignore the dirty tree does not satisfy the gate.
4. Define the two post-start stopping paths: missing human intent is queued through `/emit-pending-decisions` and ends `BLOCKED`; an unfixable operational defect ends `BLOCKED` with a diagnosis and no decision bundle.
5. Preserve the closed run-level vocabulary exactly as `DONE`, `BLOCKED`, and `REFUSED`, and explicitly state that completion with non-blocking concerns is still `DONE`.
6. In the same document, state that single-agent internal progress is factual prose or ordinary structured fields rather than formal status tokens; allow local return tokens only where a caller/callee topology consumes them, and require those contracts to remain inside the owning skill.
7. In `docs/project/v3/thread-model.md`, narrow `.pending-decisions/` to missing human intent discovered after substantive execution, distinguish it from preflight refusal and operational failure, and describe implementation progress files as factual run traces rather than a second status layer.
8. Update `docs/project/v3/workflows/quick.md` and `docs/project/v3/workflows/standard.md` so their pending-decision guidance refers to completion-oriented execution rather than AFK invocation.
9. Update `docs/project/v3/workflows/roadmap.md` so child preflight failures refuse before materialization, intent discovered during execution queues a decision, and all attended/AFK branches are removed from the feedback and materialization descriptions.
10. Re-read the five documents together and remove any sentence that still says a resolved-thread invocation repair or unmet prerequisite creates a pending-decision bundle.

**Files modified:**

- `docs/project/v3/skill-authoring.md`
- `docs/project/v3/thread-model.md`
- `docs/project/v3/workflows/quick.md`
- `docs/project/v3/workflows/standard.md`
- `docs/project/v3/workflows/roadmap.md`

**Verification:** Run `rg -n "AFK-oriented|explicit AFK|attended/AFK|Every other pre-run input ambiguity|bundle is physically impossible" docs/project/v3` and confirm it returns no obsolete protocol wording. Run `rg -n "DONE|BLOCKED|REFUSED" docs/project/v3/skill-authoring.md` and confirm all three tokens are defined as the only completion-run outcomes. Run `rg -n "open-thread.*archive-thread|archive-thread.*open-thread" docs/project/v3/skill-authoring.md` and confirm both skills are explicitly classified as dialogue-driven handshakes. Run `rg -n "preflight|substantive execution|operational defect|advance authorization|non-blocking concerns|skill-local" docs/project/v3/skill-authoring.md docs/project/v3/thread-model.md` and confirm each settled boundary is represented.

**Acceptance criteria:**

- Canonical V3 documentation distinguishes preflight refusal from both forms of in-run blocking.
- Preflight refusal writes no workflow artifact and gives a concrete repair or re-invocation instruction.
- `open-thread` and `archive-thread` are documented as dialogue-driven handshakes.
- `DONE`, `BLOCKED`, and `REFUSED` are the sole project-wide status protocol.
- Single-agent progress has no formal task-status vocabulary, while topology-specific agent reply contracts remain local to their owning skill.
- The workflow documents contain no attended/AFK behavior branch.

**Consumes:** none

**Produces:** Canonical run-protocol baseline — the preflight/refusal, in-run blocking, terminal-outcome, interaction-posture, and internal-progress rules in `docs/project/v3/skill-authoring.md`, `docs/project/v3/thread-model.md`, and the Quick, Standard, and Roadmap workflow documents.
