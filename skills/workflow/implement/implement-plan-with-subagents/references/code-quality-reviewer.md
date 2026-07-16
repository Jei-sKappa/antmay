# Code-Quality Reviewer

> Loaded by the single merged reviewer subagent dispatched by this skill, alongside the plan-compliance method file and the shared lane policy `references/reviewer-policy.md` in this same `references/` folder. The orchestrator itself does not read this file — it passes the absolute paths of this file, the plan-compliance file, and the policy file in the reviewer subagent's brief, and the reviewer loads all three. This file defines the code-quality lane; the rules common to both lanes live in `references/reviewer-policy.md`.

## Focus Area

The SINGLE question this lane answers: **"Is the diff well-structured, safe, idiomatic given the codebase?"**

ONE reviewer dispatch loads both method files and produces TWO lane verdicts — plan-compliance (the sibling file) and code-quality (this file). Each lane is judged **independently**, strictly within its own scope, with **no cross-lane trust**: this lane never assumes what the plan-compliance lane concluded, and a diff may fail plan-compliance and still receive code-quality findings in the same report. This lane's scope is code-quality only — whether the diff implements what the task said it would is the plan-compliance lane's scope. Stay in your lane: is the diff well-structured, safe, idiomatic, and low-regression-risk?

## What Code-Quality Is

Code-quality is the contract between the diff and the codebase. You read the diff and you read enough surrounding code to evaluate fit. You ask:

- **Readability** — Are variable names clear and consistent with the project's conventions? Is function decomposition reasonable (no functions that obviously want splitting; no premature abstraction)? Is dead code introduced (unused imports, unreachable branches, vestigial helpers)?
- **Safety** — Does the diff validate inputs at the boundaries the diff introduces? Are error conditions handled (null checks where null is possible; type guards where the type widens; bounds checks where indices are computed)? Are there obvious null-deref / type-cast hazards / off-by-one risks the implementer should address?
- **Idiomatic patterns** — Does the diff use the project's existing helpers, types, and conventions where applicable, instead of re-inventing them? Is the diff consistent with how similar functionality is implemented elsewhere in the codebase?
- **Regression risk** — Does the diff break anything that was passing before (look at adjacent code paths the diff touches indirectly)? Are there files modified by the diff that should NOT be modified (an unrelated file caught in the change)? Does the diff alter a shared utility in a way that affects unrelated callers?

## What Code-Quality Is NOT

You do NOT evaluate:

- Whether the diff implements what the plan task said it would — that is the plan-compliance lane's scope. You do not re-grade plan-compliance and you do not assume its verdict; the two lanes are judged independently, and this lane may raise code-quality findings whatever the plan-compliance lane concludes.
- Whether the plan task is well-conceived. You critique the diff, not the plan. The one exception is the *plan-mandated* label (see `references/reviewer-policy.md`): when the diff faithfully implements something defective the plan itself mandated, surface the diff-level finding and mark it plan-mandated so the orchestrator can route it — you still do not patch or rewrite the plan.
- Whether the codebase as a whole has good code quality. Your review is scoped to the diff for this orchestration cycle.

If a finding sits at the boundary between the two lanes (e.g., "the diff implements the task but the implementation is so unsafe it nearly defeats the task's verification"), record the code-quality side in this lane's section; the plan-compliance side belongs in that lane's section of the same report. Your job here is the safety / structure / idiomatic-fit angle.

## Read Permission

The diff is the review **target**; the repo is readable **context**. Reading unchanged code — imports, callers of changed functions, adjacent files in the same module, the task file, the index, and the artifact the index's `Source:` line names — to evaluate idiomatic fit and regression risk is in-scope and expected. Reading is unrestricted; stop once you have enough context to evaluate the diff, and do not turn this into a full codebase audit.

## Process

1. **Read the task file and the index READ-ONLY.** Your brief names the task file (`plan-tasks/NN-<slug>.md`) and the plan index (`plan.md`), and grants reading the artifact the index's `Source:` line names when a question is left open. The plan is immutable — open all of these for reading only. You read the task primarily to anchor your understanding of the diff's intent — not to grade plan-compliance, which is the other lane, judged independently.
2. **Inspect the diff.** Run `git status --porcelain` and `git diff` (or file-by-file reads of the modified paths) to see the current post-implementer state. On a fix-loop re-review the diff reflects the implementer's original work plus any fix iterations.
3. **Read surrounding code as needed.** Open related files (imports, callers of changed functions, adjacent files in the same module) to evaluate idiomatic fit and regression risk (reading is in-scope per `## Read Permission`). Stop reading once you have enough context to evaluate the diff; do not turn this into a full codebase audit.
4. **Evaluate readability, safety, idiomatic fit, and regression risk** using the prompts in `## What Code-Quality Is` above. Each evaluation produces zero or more findings.
5. **Identify code-quality gaps as ACTIONABLE FINDINGS, and assess any supplied assumptions.** Each finding must be concrete (cite the specific file + lines in the diff, the specific concern, and a suggested fix), not vague ("the code feels off"). Vague findings are useless to the fix-iteration implementer; the next implementer needs to know what to change. Label any finding that traces to the plan's own text `[plan-mandated]`, record any criterion you cannot verify from within the run as an unverified concern, and note any discovery beyond the current task in the out-of-task section — all per `references/reviewer-policy.md`. Assess any implementer-supplied assumptions that fall within this lane's lens per that same policy file.
6. **Classify each finding and determine the verdict** per `references/reviewer-policy.md` (`## Verdict`), reserving `BLOCKED` / `NEEDS_CONTEXT` for the rare can't-assess escapes.
7. **Write this lane's section of the review output** using the `## Output Template` below, to the single `SS-review.md` path the orchestrator named in your brief (a scratch file under the run's workspace directory) — see the write condition in `references/reviewer-policy.md` (`## Output file`). Do NOT modify code, do NOT modify the plan.

## Output Template

The write condition, the single-file / one-section-per-lane rule, and the reply shape are in `references/reviewer-policy.md` (`## Output file`). This lane contributes the **Code-Quality Lane** section below:

```markdown
## Code-Quality Lane

Verdict: <PASS | ISSUES | BLOCKED | NEEDS_CONTEXT>

Findings:
1. **<short title>** [blocking] — Concern: <readability | safety | idiomatic | regression-risk>. Location: <file:lines>. Observed: <what the diff does>. Suggested fix: <concrete instruction the next implementer can act on>.
2. **<short title>** [non-blocking][plan-mandated] — Concern: <…>. Location: <file:lines>. Observed: <the diff faithfully implements it, but the mandate is defective because …>. Suggested fix: <what a corrected plan would say — routed as a plan fault, not patched here>.

Concerns:
- <non-blocking concern — surfaced for the orchestrator to weigh; no fix required>
- unverified: <criterion that cannot be checked from within the run> — <why> — <what would settle it>.

Out-of-task observations:
- <a code-quality discovery beyond the current task's diff — different task's territory or pre-existing code; never drives this task's fix loop or blocking>.

Reason: <BLOCKED / NEEDS_CONTEXT only — the hard impossibility that blocks assessment, or the judgment call you cannot make alone>.

References:
- Plan index: plan.md
- Task file: plan-tasks/NN-<slug>.md
- Modified files:
  - <path>
```

## Hard Constraints

The constraints binding both lanes (do not modify code, do not modify the plan, do not commit) are in `references/reviewer-policy.md` (`## Hard constraints (both lanes)`). This lane adds:

- Keep this lane's section scoped to code-quality. A plan-compliance observation (missing substep, unmet acceptance criterion) belongs in the plan-compliance lane's section of the same report, not here — the two lanes are judged independently.
- DO NOT make findings that essentially re-author the diff into a different design. If the diff meets the readability / safety / idiomatic / regression-risk bars, `PASS` this lane — even if a different design would be cleaner. Architectural redesign is not your role.
