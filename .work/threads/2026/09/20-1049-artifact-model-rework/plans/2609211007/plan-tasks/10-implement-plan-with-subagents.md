### Task 10: `implement-plan-with-subagents`

**Objective:** Bring the orchestrator and its three reviewer references to the same boundary, commit and report rules as the single-agent implement skills, with the plan-compliance lane matching criteria by verbatim text.

**Input / context:** `spec.md` `## Skills whose roles change` (implement row, including "The plan-compliance reviewer lane matches criteria by verbatim text"), `### The implementation report`, `### Citation and read order`. The wording task 9 settled for `implement-plan` (deny-list, provenance rule, no-thread-reference rule, `## Follow-ups`, change-document fault). Current files: `suite/skills/implement/implement-plan-with-subagents/SKILL.md`, its skill-local references `references/plan-compliance-reviewer.md`, `references/code-quality-reviewer.md`, `references/reviewer-policy.md` (hand-authored, not synced).

**Steps:**

1. Edit `suite/skills/implement/implement-plan-with-subagents/SKILL.md`: `## Inputs` as in task 9 (`change.md` — the change document; `delta/`, when present; the `Source:` clause); `## Factual progress records` and `## Run workspace` — the block lives in the progress file only (delete "carried in that task's commit message body minus its own SHA", the `# committed cycles … omitted from the commit body` comment, and "The commit message body carries the same block…"; the chat-line and compaction rules stand); `## Procedure` steps 6a–6c — the constraint sources passed to subagents become the thread's `change.md` and `delta/`; `## Deviations` (change document section or record stem; a contradiction of a delta document or a change document decision); `## Discoveries` with the deny-list boundary and the no-thread-reference rule pointing at `<skill_path>/references/instructions/read-and-cite-the-project-layer.md`; `## Blocked` (change of intent wording; `/consult-decisions`); `## Commit Policy` (drop "Commit message bodies carry the orchestration cycle's factual progress block…", add the provenance rule; the audit-trail bullet keeps retries in the progress block only); `## Subagent Briefs` — the implementer brief's scope and input paths name `change.md` and `delta/` as the constraint sources, its hard constraints add that the code it writes carries no thread path and no reference to a thread artifact and names tests for behavior; the reviewer brief's input paths name `change.md` and `delta/`; `## Immutability` (change-document fault); `## Implementation report` (acceptance rows drawn from the change document's checklist and each cycle's verification).
2. Edit `references/plan-compliance-reviewer.md`: every `spec.md` and `adr/` becomes `change.md` and `delta/`; in `## What Plan-Compliance Is` add the bullet "Does the diff satisfy each criterion the task quotes verbatim from the change document? Match a criterion by its verbatim text — never by a number, a label or a paraphrase — and mark it SATISFIED / MISSING / PARTIAL"; in `## Process` step 4 say the same; add to the lane's checks that the diff carries no thread path and no reference to a thread artifact in code, comments, test names or migrations, and names tests for behavior — a hit is a finding.
3. Edit `references/code-quality-reviewer.md` and `references/reviewer-policy.md`: every `spec.md` and `adr/` becomes `change.md` and `delta/`; nothing else changes.
4. `README.md`'s entry for this skill stands unless its summary names something that changed.
5. From `suite/`, run the sync script and both checks.

**Files modified:** `suite/skills/implement/implement-plan-with-subagents/SKILL.md`, `suite/skills/implement/implement-plan-with-subagents/references/plan-compliance-reviewer.md`, `suite/skills/implement/implement-plan-with-subagents/references/code-quality-reviewer.md`, `suite/skills/implement/implement-plan-with-subagents/references/reviewer-policy.md`.

**Verification:**

```sh
f=suite/skills/implement/implement-plan-with-subagents/SKILL.md
for p in 'docs/adr/' 'docs/pdr/' 'docs/product/' 'docs/architecture/' 'docs/glossary.md' '.work/roadmaps/' 'change.md' 'delta/'; do grep -q -- "$p" "$f" || echo "deny-list item $p missing"; done
grep -q -i 'provenance' "$f" && grep -q 'named for the behavior\|names tests for behavior\|named for the behavior it proves' "$f" && grep -q 'Follow-ups' "$f"
! grep -rn -E 'spec\.md|`adr/`|thread ADR|ADR stem|spec section|commit message body carries|minus its own SHA|omitted from the commit body' suite/skills/implement/implement-plan-with-subagents/SKILL.md suite/skills/implement/implement-plan-with-subagents/references/plan-compliance-reviewer.md suite/skills/implement/implement-plan-with-subagents/references/code-quality-reviewer.md suite/skills/implement/implement-plan-with-subagents/references/reviewer-policy.md
grep -q -i 'verbatim' suite/skills/implement/implement-plan-with-subagents/references/plan-compliance-reviewer.md
grep -q 'change.md' suite/skills/implement/implement-plan-with-subagents/references/reviewer-policy.md && grep -q 'delta/' suite/skills/implement/implement-plan-with-subagents/references/code-quality-reviewer.md
(cd suite && node scripts/sync-shared-references.mjs && node scripts/check-marketplace-skills.mjs && node scripts/check-skill-text.mjs)
git diff --quiet fe83a4f -- cli/ && git diff --quiet fe83a4f -- docs/glossary.md
```

**Acceptance criteria:**

- The orchestrator names the closed deny-list, drops the progress block from commit bodies, states the provenance rule, forbids thread paths and thread-artifact references in code, comments, test names and migrations, names tests for behavior, reports discoveries under `## Follow-ups`, and passes `change.md` and `delta/` to its subagents as the constraint sources.
- The plan-compliance reviewer matches criteria by verbatim text and treats a thread reference in the diff as a finding; the three references name no `spec.md` or `adr/`.
- The sync script and both suite checks exit 0; nothing under `cli/` or in `docs/glossary.md` differs from the baseline.

**Consumes:** the deny-list, provenance and no-thread-reference wording and the `## Acceptance` report shape from task 9; `instructions/read-and-cite-the-project-layer.md` (task 3).

**Produces:** none
