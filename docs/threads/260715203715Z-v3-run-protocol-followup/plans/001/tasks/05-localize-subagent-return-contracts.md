# Task 5: Localize the subagent executor's return contracts

**Objective:** Keep only the agent-to-orchestrator tokens required by `implement-plan-with-subagents`, remove its formal verified-cycle status layer, and report factual cycle progress under the universal run outcome.

**Input / context:** `docs/threads/260715094144Z-v3-workflow-fixes/implementation/discussions/260715200148Z-implementation-review-findings-decision-log.md P1` governs preflight and run termination; `P2` explicitly preserves skill-local implementer and reviewer return contracts while rejecting a second formal verified-cycle status protocol. Use the factual progress fields established by Task 4, but retain this skill's subagent topology and untrusted-reply validation.

**Steps:**

1. Remove the `## Four-State Status Protocol` and every orchestrator-owned verified task status, claim-to-verified-status translation, `DONE_WITH_CONCERNS` cycle classification, and final per-task status summary.
2. Introduce a clearly skill-local return-contract section for the existing subcalls: the implementer's reply tokens and the merged reviewer's two lane verdict tokens. State that these tokens are untrusted routing inputs consumed only by this orchestrator and are not V3 workflow statuses.
3. Preserve validation of each implementer reply against the working tree and optional outcome file, and preserve validation of both reviewer lane verdicts against the review file. A malformed or incomplete subagent reply is handled inside the dispatch loop and never becomes a project-wide status.
4. Rewrite the orchestration-cycle progress block as factual fields: task attempted; implementer reply tokens and dispatch count; reviewer lane verdicts and fix-iteration counts; changes made; verification performed; unresolved concerns; commit SHA/subject or `none`; and next action. Remove any `verified status` or `claimed/verified` field.
5. Keep local implementer tokens in the pinned implementer reply and optional outcome-file templates only. Map a validated positive reply through review and commit; treat its concern token as factual concern input, not a run status.
6. Map a validated missing-intent reply discovered after execution begins to `/emit-pending-decisions`, implementation-report update, and run-level `BLOCKED`. Map a validated operational impossibility, reviewer non-assessability, non-converging fix loop, or exhausted commit retry to run-level `BLOCKED` with diagnosis and no decision bundle.
7. Keep the reviewer lane tokens and two-lane independence unchanged; lane issues continue through the fix loop, while the final run outcome remains independent of the reply vocabulary.
8. Apply the same dirty-worktree and complete-preflight ordering as Task 4: no attended question, no subagent dispatch, run workspace, report update, code write, or commit before a clean tree or sufficient advance authorization and all thread/plan/tooling checks pass. Preflight failures end `REFUSED` with remediation.
9. Remove invocation-controlled interactive-check-in behavior and all procedure language that tells the orchestrator to ask or wait.
10. Rewrite the implementation report and final summary to fold factual cycle blocks from `progress.md`; end `DONE` for completed requested work even with non-blocking concerns, `BLOCKED` for an in-run halt, or `REFUSED` for preflight prevention.
11. Preserve the sequential shared-worktree topology, fresh-context fix dispatches, write-once scratch files, reviewer-method boundaries, bounded commit repair, no-history-rewriting rule, roadmap feedback, and persistent run directory.
12. Bump `implement-plan-with-subagents` from `5.1.0` to `5.2.0` and read the complete skill to remove every dangling reference to a shared four-state or verified-cycle protocol.
13. Run a final active-suite audit: confirm the only project-wide `Outcome:` tokens are `DONE`, `BLOCKED`, and `REFUSED`; confirm `open-thread` and `archive-thread` have no `Outcome:` line; confirm formal task-status headings are absent from both single-agent skills and the subagent orchestrator; and confirm every skill modified by Tasks 2–05 has its planned version bump.

**Files modified:**

- `skills/workflow/implement/implement-plan-with-subagents/SKILL.md`

**Verification:** Run `rg -n "Four-State Status Protocol|verified four-state|verified (DONE|DONE_WITH_CONCERNS|BLOCKED|NEEDS_CONTEXT)|claimed .* verified|per-task status|interactive check|ASK|Wait for the user's answer" skills/workflow/implement/implement-plan-with-subagents/SKILL.md` and confirm it returns no matches. Run `rg -n "Return contract|untrusted|plan-compliance|code-quality|PASS|ISSUES" skills/workflow/implement/implement-plan-with-subagents/SKILL.md` and confirm the topology-local contracts and validation rules remain. Run `rg -n "Task attempted|implementer reply|dispatch count|lane verdict|fix iteration|Changes made|Verification|Concerns|Commit|Next action" skills/workflow/implement/implement-plan-with-subagents/SKILL.md` and confirm the factual progress shape is complete. Run `rg -n "Outcome: (DONE|BLOCKED|REFUSED)" skills/workflow/implement/implement-plan-with-subagents/SKILL.md` and confirm only the universal run tokens are used. Run `rg -n "version: 5\.2\.0" skills/workflow/implement/implement-plan-with-subagents/SKILL.md` and confirm the version bump. For the suite audit, run `rg -n "Four-State Status Protocol" skills/workflow/implement --glob 'SKILL.md'` and confirm no matches; run `rg -n "Outcome:" skills/workflow/capture-discussion/open-thread/SKILL.md skills/workflow/finish-navigate/archive-thread/SKILL.md` and confirm no matches; inspect every `Outcome:` token under `skills/workflow/` and confirm no token outside `DONE`, `BLOCKED`, and `REFUSED` is used as a run outcome.

**Acceptance criteria:**

- Implementer reply tokens and reviewer lane verdicts are explicitly local to this skill's subagent topology.
- The orchestrator validates untrusted replies without synthesizing a formal per-cycle status.
- Progress records agent replies, reviewer verdicts, dispatch/fix counts, changes, verification, concerns, commit, and next action as facts.
- Missing in-run human intent queues a decision and ends the run `BLOCKED`; operational halts end `BLOCKED` with diagnosis and no bundle.
- Preflight failures write no workflow artifact and end `REFUSED`; completed work with concerns ends `DONE`.
- The existing sequential two-lane review, commit, report, feedback, and run-trace guarantees remain intact.
- No active implementation skill defines a formal four-state task-status protocol, and the suite uses only the three universal run outcomes.
- `implement-plan-with-subagents` is version `5.2.0`.

**Consumes:** The canonical skill-local contract rule from Task 1, the preflight semantics from Task 3, and the factual progress vocabulary from Task 4.

**Produces:** none
