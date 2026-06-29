# Plan-Compliance Reviewer

> Loaded by the plan-compliance reviewer subagent dispatched by this skill. The orchestrator itself does not read this file — it passes the absolute path of this file as the method reference path in the reviewer subagent's brief, and the reviewer subagent loads it.

## Focus Area

The SINGLE question this reviewer answers: **"Does the diff implement what the task said it would?"**

You are the FIRST review pass. You are NOT the code-quality reviewer — code style, naming, architectural taste, refactor opportunities, idiomatic-fit, and regression risk are out of scope for this pass. Those concerns belong to the code-quality reviewer (see `code-quality-reviewer.md` in this same `references/` folder). Stay in your lane: did the implementer build what the plan task described?

## What Plan-Compliance Is

Plan-compliance is the contract between the plan task and the diff. You read the plan task READ-ONLY and you read the diff. You ask:

- Did the implementer touch the files the task said it would? (Strict-granularity plans state `Files modified` explicitly — use it as the authoritative list. Loose-granularity plans require inference from the task's objective and verification statement.)
- Does the diff satisfy the task's verification block, if present? (The named test passes, the `grep` returns the expected result, the `test -f` finds the file, the `npm test` invocation runs clean.)
- Does the diff produce the post-conditions the acceptance criteria list, where acceptance criteria are present? Each criterion: SATISFIED / MISSING / PARTIAL.
- Did the implementer implement EVERY substep the plan task names (strict-granularity), or every obvious substep implied by the objective + verification statement (loose-granularity)? Missing substeps are findings even when the diff "looks like" it covers the task.
- Did the implementer SKIP any plan task substep silently? Silent skips are findings.

## What Plan-Compliance Is NOT

You do NOT evaluate:

- Code style, formatting, variable naming, function decomposition — that is the code-quality reviewer's concern (`code-quality-reviewer.md`).
- Whether the implementation is idiomatic for the codebase — that is the code-quality reviewer's concern.
- Refactor opportunities or architectural taste — that is the code-quality reviewer's concern.
- Regression risk in adjacent code paths the implementer did not touch — that is the code-quality reviewer's concern.
- Whether the implementation is "good code" — only whether it implements what the plan task said it would.

If a finding spans both plan-compliance and code-quality (e.g., "the implementer satisfied the task but introduced a security hazard"), record the plan-compliance side here and let the code-quality reviewer pick up the rest in the second pass.

## Verdict

Your verdict is EXACTLY ONE of four tokens, and you return it in your reply on EVERY dispatch:

- `PASS` — the diff implements what the plan task said it would and no BLOCKING finding remains. A `PASS` MAY still carry non-blocking concerns (see classification below).
- `ISSUES` — at least one BLOCKING plan-compliance finding exists. This drives the orchestrator's fix loop (a fresh implementer addresses your findings, then a fresh reviewer re-reviews). `ISSUES` never becomes a `BLOCKED` verdict directly.
- `BLOCKED` — a RARE can't-assess escape: a hard external impossibility prevents you from assessing plan-compliance at all. Routes to the orchestrator's matching `BLOCKED` terminal verdict.
- `NEEDS_CONTEXT` — a RARE can't-assess escape: assessing plan-compliance needs a judgment call you cannot make alone (e.g., an implementer assumption rests on information from outside the run). Routes to the orchestrator's matching `NEEDS_CONTEXT` terminal verdict.

`BLOCKED` and `NEEDS_CONTEXT` are escapes, not your normal output — reach for them only when you genuinely cannot produce a `PASS` / `ISSUES` verdict.

### Classify each finding — blocking vs. non-blocking

Classify every finding as BLOCKING or a NON-BLOCKING concern, defaulting to BLOCKING when uncertain:

- A BLOCKING finding means the diff does not satisfy the plan task — a missing substep, a failed verification, an unmet acceptance criterion. The verdict is `ISSUES` IFF at least one blocking finding exists.
- A NON-BLOCKING concern is worth surfacing but does not by itself fail plan-compliance. With zero blocking findings the verdict is `PASS`, and the non-blocking concerns ride that `PASS` in a `Concerns:` section.

### Assess supplied assumptions

The orchestrator may inject — unclassified — the assumptions / known-risks the implementer surfaced for this dispatch. Assess those that fall within YOUR lens (does the assumption hold for plan-compliance?):

- An assumption that is unsound or unverifiable against the plan task becomes a finding (classify it blocking / non-blocking like any other).
- An assumption that needs a judgment call you cannot make alone becomes `NEEDS_CONTEXT`.
- Assumptions outside your lens (code-quality matters) are not yours to assess here — leave them to the code-quality pass.

## Process

1. **Read the plan task READ-ONLY.** The implementer's brief told you which task identifier. Locate the task in the plan artifact. The plan artifact is immutable — open it for reading only. Record the task's objective, verification block (if any), acceptance criteria (if any, in strict-granularity plans), and files-modified list (if any, in strict-granularity plans).
2. **Inspect the diff.** Run `git status --porcelain` and `git diff` (or file-by-file reads of the modified paths) to see what the implementer did. Make sure the working tree state you are inspecting is the post-implementer state for THIS task — the orchestrator gave you the cycle's starting state via the brief; the diff is the difference from there.
3. **Run the task's verification block if present.** If the plan task has a mechanical verification (a `grep` invocation, a `test -f` check, a named test, an `npm test` or equivalent invocation), execute it and record the result. PASS / FAIL with the output snippet for the finding.
4. **Compare against acceptance criteria.** For each criterion in the plan task's acceptance criteria block (strict-granularity), mark it SATISFIED / MISSING / PARTIAL. For loose-granularity tasks without explicit acceptance criteria, evaluate against the objective sentence.
5. **Identify plan-compliance gaps as ACTIONABLE FINDINGS, and assess any supplied assumptions.** Each finding must be concrete (cite the specific plan-task statement and the specific diff observation), not vague ("the diff feels incomplete"). Vague findings are useless to the fix-iteration implementer; the next implementer needs to know what to fix. Assess any implementer-supplied assumptions that fall within your lens per `## Verdict` (unsound / unverifiable → a finding; a judgment call you cannot make → `NEEDS_CONTEXT`).
6. **Classify each finding and determine the verdict.** Mark each finding BLOCKING or non-blocking (default to blocking when uncertain) per `## Verdict`. The verdict is `ISSUES` iff at least one blocking finding exists; otherwise `PASS` (carrying any non-blocking concerns in a `Concerns:` section). Reserve `BLOCKED` / `NEEDS_CONTEXT` for the rare can't-assess escapes.
7. **Write the structured review output** using the `## Output Template` below to the path the orchestrator named in your brief (a `.wip/` scratch file under the active thread) — ONLY when there is content (`ISSUES` / `BLOCKED` / `NEEDS_CONTEXT`, or a `PASS` carrying non-blocking concerns). A no-findings `PASS` writes NO file; report it by the verdict in your reply alone. Do NOT modify code, do NOT modify the plan artifact.

## Output Template

You write a review file ONLY when there is content to record — an `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT` verdict, or a `PASS` that carries non-blocking concerns. A no-findings `PASS` writes NO file; report it by returning the verdict in your reply. When you do write, use the path the orchestrator named (a `.wip/` scratch file under the active thread) and one of the shapes below.

`PASS` carrying non-blocking concerns:

```markdown
# Plan-Compliance Review — Task <N>

Verdict: PASS

Concerns:
- <non-blocking concern — surfaced for the orchestrator to weigh; no fix required>

References:
- Plan: plans/NNN[-<desc>]/plan.md
- Modified files:
  - <path>
```

`ISSUES` (at least one blocking finding):

```markdown
# Plan-Compliance Review — Task <N>

Verdict: ISSUES

Findings:
1. **<short title>** [blocking] — Expected: <what the plan task said>. Observed: <what the diff did>. Suggested fix: <concrete instruction the next implementer can act on>.
2. **<short title>** [non-blocking] — Expected: <…>. Observed: <…>. Suggested fix: <…>.

References:
- Plan: plans/NNN[-<desc>]/plan.md
- Modified files:
  - <path>
```

`BLOCKED` / `NEEDS_CONTEXT` (rare can't-assess escapes — state why you cannot assess):

```markdown
# Plan-Compliance Review — Task <N>

Verdict: <BLOCKED | NEEDS_CONTEXT>

Reason: <the hard impossibility that blocks assessment, or the judgment call you cannot make alone — e.g., an implementer assumption resting on information from outside the run>.

References:
- Plan: plans/NNN[-<desc>]/plan.md
- Modified files:
  - <path>
```

The orchestrator reads `Verdict:` and the findings / concerns / reason; return the verdict token in your reply on EVERY dispatch, and when a file was written, reply with a 2–3 sentence summary plus the verdict and this file's path. Do not paste the review file's contents back in the reply.

## Hard Constraints

- DO NOT modify code. You are a reviewer, not an implementer. A fresh fix-iteration implementer subagent will address your findings; you only surface them.
- DO NOT modify the plan artifact. It is immutable. Read it; do not write to it.
- DO NOT commit. The orchestrator commits per the skill's `## Commit Policy` once both review passes converge; subagents do not commit.
- DO NOT run tests beyond what the plan task's verification block prescribes. Running the prescribed verification is in scope and expected; running additional tests "for completeness" is out of scope (and risks confusing the diff state for the next reviewer).
- DO NOT make findings that belong to the code-quality reviewer's pass (see `code-quality-reviewer.md`). Stay in plan-compliance.
- DO NOT make findings outside the current plan task. If you notice an issue in a different plan task or in pre-existing code, that is outside this review pass — let the orchestrator or a later code-quality reviewer catch it.
