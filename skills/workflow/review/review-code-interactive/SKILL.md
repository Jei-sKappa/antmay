---
name: review-code-interactive
description: Walk a code reference collaboratively one finding at a time, testing each finding against the code and anchoring right to the spec's acceptance criteria, and capturing the resolved-vs-unresolved split when the user wants a code-quality review kept in-loop.
metadata:
  author: https://github.com/Jei-sKappa
  version: 2.0.0
---

# Review Code Interactive

Walk a CODE REFERENCE (a git ref / diff / file path / directory path) READ-ONLY one finding (or one file / one hunk) at a time with the user, ASK the user for their view on each finding AND TEST that view against the code, settle each finding as resolved / rejected / accepted / deferred, append per-finding records to a decision log under the implementation's `discussions/` folder, and — only if unresolved actionable findings remain at the end of the session — emit a references-first review record into the active thread's `implementation/reviews/` folder.

This skill performs the CODE-QUALITY review: it reviews the code on its own merits — quality, safety, idioms, and testability. The cheap moment to push back is during this walk — once the code is merged or released, the cost of unflagged findings compounds.

## Anchor "Right" to the Spec's Acceptance Criteria, Not the Plan

When a spec is available, this code review anchors its sense of "right" to the **spec's acceptance criteria — the contract — NOT to the plan.** The plan is a disposable compiler-IR the human never needs to read; the spec plus its acceptance criteria are the audited artifact, the definition of what the code is supposed to do. So when a code-quality finding turns on what the code is *for* — whether an error path matters, whether an edge case is reachable, whether a behavior is the intended one — judge it against the spec's acceptance criteria, never against the plan. If no spec is on hand, the walk runs as a pure code-quality pass on the code's own merits.

**Scope boundary:** Checking whether the code *delivers* what the spec's acceptance criteria promised — implementation fidelity — is a different review target and belongs in an implementation-fidelity review. This skill's findings are about code QUALITY, not code FIDELITY; the spec's acceptance criteria anchor "right" here, they do not turn this into a coverage pass.

## Anti-Sycophancy Stance

Your job is to help the user reach the right verdict on the code under review against the code-quality axes, not to make them feel good about whatever the code currently does. Treat the per-finding walk as a mutual attempt to get closer to the truth: you may be missing context, the user may be missing consequences, and either side may notice something the other overlooked. Sycophancy is a particularly costly failure mode here — **a review is most valuable when it disagrees with the author**. A review whose only effect is to validate the code because the author (or the user) defends it has produced nothing useful; the cheap moment to push back is during the walk, before the code is merged or released, before downstream callers depend on the not-quite-right shape. Push back hard on weak reasoning or hidden assumptions; never soften findings just because the user pushes back.

Push back hard on weak reasoning or hidden assumptions; never soften findings just because the user pushes back. A reviewer who waters down a real finding when the author objects has stopped reviewing and started agreeing. The walk's value sits in the disagreement, not the consensus.

Hold these together:

- **Disagree when you disagree.** If the user's view of a finding conflicts with the evidence in the code, your read of the surrounding context, or established project / language idioms, say so plainly before settling. Don't soften it into ambiguity. If the user says "this is idiomatic in this project" and the surrounding code clearly shows a different convention, surface that gap before logging.
- **Push back on weak or incomplete reasoning.** If the user dismisses a finding for a reason that doesn't hold up — "it's obvious from context", "I'll fix it later", "no one will notice", "the test would have caught it if it mattered", "we can refactor it in a follow-up" — name the gap, surface the assumption, and bring it into the conversation before the finding is settled as `rejected` or `resolved`. A future maintainer or downstream caller will not "use context" — they will read the code as it stands.
- **Surface what they didn't ask about.** Risks, hidden costs, downstream consequences, edge cases the user is willing to absorb, code smells the user is willing to live with — raise them, even if the user wants to move on. Better captured as a finding now than rediscovered after merge, where the cost compounds in additional commits or operational surprise.
- **Take the user's input seriously.** If they push back, add context, or challenge your reading of the code, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument (e.g., the user names a project convention you missed, points at a decision-log entry that genuinely settled an idiom differently, or shows that the spec's acceptance criteria make an apparent gap a non-issue).
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never change a finding's severity, settlement, or wording just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see a finding differently, identify the exact assumption or value judgment causing the split, then resolve it before settling the finding.
- **Refuse to log a finding settlement you believe is wrong without flagging it.** If the user insists on settling a finding as `resolved` or `rejected` when you believe it remains actionable, log the settlement they chose but include the dissent in the rationale. Example: `Rationale: <user's reason>. Note: recommended <other settlement> because <why>; user accepted the trade-off — flagged for downstream readers.`
- **Keep the review owned by the evidence.** The goal is not for either side to win. The goal is to record settlements that survive later scrutiny because the relevant context, objections, and trade-offs were actually considered. Push back hard on weak reasoning or hidden assumptions; never soften findings just because the user pushes back.

If you believe a finding is being dismissed without real reason, refuse to log it silently as `rejected`. Either resolve the disagreement first, or log the dissent verbatim in the rationale line. The cheap moment for the review to do its job is during the walk — once the code is merged or released, the cost of unflagged quality / safety / idiom / testability findings compounds, and the next reader / maintainer / caller has to absorb it.

## Inputs

This skill accepts ONE required input: a CODE REFERENCE. Accepted forms of the code reference:

1. **A git ref** — a commit SHA (full or short), a branch name, a tag, or a commit range. Examples: `abc1234`, `feature/auth-rollout`, `v1.2.0`, `main..feature-branch`, `HEAD~5..HEAD`. The git ref identifies what code is under review.
2. **A diff** — a unified diff passed inline or via a path to a saved `.diff` / `.patch` file. Useful when the code has not been committed to a branch this skill can resolve, or when the diff was exported for review separately.
3. **A file path** — a single file under review (absolute or relative to the repo root). Useful for reviewing one file in isolation.
4. **A directory path** — a directory under review (absolute or relative to the repo root). Useful for reviewing a module, package, subsystem, or any code grouping the user wants reviewed as a unit.

The code reference is READ-ONLY. This skill does NOT check out a branch, does NOT run tests, does NOT modify the working tree, does NOT modify any source code, and does NOT mutate any git state. The walk is read-only against the code text.

**The skill MAY ACCEPT the spec as ADDITIONAL input** (a `spec.md` under `specs/NNN[-<desc>]/`) to anchor "right", and MAY accept freeform user concerns or focus areas — but does NOT block on the absence of either. Examples of focus: "look for race conditions in the new caching layer", "check for missing error handling in the auth endpoints", "review the new module for testability". If a spec is supplied, anchor "right" to its acceptance criteria during the walk; if the user provides focus, emphasize those areas; if neither, run the default general-purpose pass across all axes.

### Ambiguity fallback

If the code reference is unsupplied, vague, or matches multiple plausible candidates, ASK the user which is intended. There is no global "latest code" algorithm. Do not pick by recency. Silently picking by recency or by sort order would hide a real decision behind a sort order. If a spec is offered for anchoring and the thread holds multiple spec lineages, ASK which lineage is meant — do not pick by `NNN`.

## What This Skill Reviews

This skill runs **four code-quality review axes**. The walk runs each axis in order during candidate-list assembly, then settles findings finding-by-finding (or file-by-file / hunk-by-hunk — see `## Walk Format`). Every finding tethers to the question "is the code any good on its own terms?" — judged, where a finding turns on what the code is for, against the spec's acceptance criteria. Findings that drift into implementation fidelity (does the code DELIVER what the spec's acceptance criteria promised?) are out of scope for this skill and should be surfaced as escalation suggestions under `## Next Actions` rather than walked inline here.

### Axis 1: Quality

Readability, maintainability, naming, structure, code smells, dead code, duplication.

- **Unreadable code** — a function whose intent is opaque without significant time investment from the reader — `issue` or `nit` depending on centrality.
- **Poor naming** — variables / functions / classes / modules whose names do not reflect their purpose or conflict with conventions visible elsewhere — `nit` or `issue`.
- **Tangled structure** — a long function that should have been decomposed, a class with too many responsibilities, deeply nested control flow — `issue`.
- **Code smells** — duplication, dead code, commented-out blocks, magic numbers, premature abstraction — `nit` to `issue`.

### Axis 2: Safety

Bug risks, edge cases, error handling, race conditions, security issues, resource leaks.

- **Bug risks** — off-by-one, missing null checks, unhandled return values, broken invariants — `issue` or `blocker`.
- **Edge cases** — empty inputs, boundary values, error paths, concurrent access, partial failure — `issue` or `blocker` (and, when a spec is available, weighted by whether the spec's acceptance criteria named the case).
- **Error handling** — silently swallowed exceptions, errors logged but not propagated, error messages that lose context — `issue` or `blocker`.
- **Race conditions** — shared mutable state without synchronization, TOCTOU bugs — typically `blocker`.
- **Security issues** — input validation gaps, injection vectors, secrets in code/logs, authorization bypasses, cryptographic missteps — typically `blocker`.
- **Resource leaks** — file handles, sockets, DB connections, locks, memory not released on all paths — `issue` or `blocker`.

### Axis 3: Idioms

Language and framework idioms; project conventions if observable from surrounding code.

- **Non-idiomatic language usage** — ignoring standard library helpers, fighting the language's grain, type system misuse — `nit` or `issue`.
- **Non-idiomatic framework usage** — bypassing intended extension points, manually doing what the framework provides as a feature — `issue`.
- **Project convention violations** — when surrounding code reveals a convention (naming, layout, error type, logging interface) and the new code does not honor it without a stated reason — `nit` or `issue`.
- **API ergonomics** — new public signatures that fight the language's grain or surprise callers — `nit` or `issue`.

### Axis 4: Testability

Test coverage, test quality, edge cases tested, integration vs unit balance.

- **Untestable code** — tight coupling to globals, hidden side effects, hard-to-mock dependencies, non-deterministic behavior — `issue`.
- **Missing tests for new behavior** — observable new behavior without a test covering it — `nit` or `issue` depending on the project's test convention (raised toward `issue` when the spec's acceptance criteria named that behavior); does NOT apply for doc-only / comment-only / trivially refactor-only changes.
- **Weak tests** — assertions on incidental output, tests that mock so heavily they cannot fail — `nit` or `issue`.
- **Integration vs unit balance** — a tower of mocked unit tests where one integration test would catch failures, or one giant integration test where targeted unit tests would localize failures — `nit` to `issue`.

### Optional additional axes

Executor MAY add other code-quality axes when warranted: performance characteristics, dependency hygiene, API design, accessibility, documentation drift. These additional axes are NOT mandatory — the four primary axes above are the standard pass.

### What this skill does NOT review

This skill does NOT check "does the implementation deliver what the spec's acceptance criteria promised" — that is the implementation-fidelity question and belongs in a separate implementation-fidelity review. This skill's findings are about code QUALITY, not code FIDELITY; the spec's acceptance criteria anchor what "right" means here, they do not turn this into a coverage pass. **If the user wants to check whether the code delivers what the spec's acceptance criteria promised, redirect them to an implementation-fidelity review instead.** That redirection should also surface in `## Next Actions` when this skill's review surfaces concerns that would benefit from a fidelity check.

This skill ALSO does NOT review the upstream spec, proposal, or plan that may have driven the code. If review findings trace back to spec ambiguity, surface that in `## Next Actions` with a suggestion to review the spec separately (the spec is fixed via an owner-approved, record-backed amendment — never an edit this skill makes).

## Walk Format

The walk presents the candidate findings list (or the per-file / per-hunk walk order) to the user up front, then walks one finding (or one file / one hunk) at a time. The grain of the walk — per-finding or per-file / per-hunk (linear traversal of the code) — is the executor's discretion; the requirement is that each loop iteration settles ONE thing. The per-finding grain is the recommended default when findings cluster across the four axes (a few quality nits PLUS a safety issue PLUS an idiom concern); the per-file or per-hunk grain is the recommended default when the code under review is a small diff with localized findings, or when the user prefers a linear walk through the change set.

For each iteration (finding, or file, or hunk):

1. **Surface the finding (or the file / hunk with its observed issues).** State the finding with its severity tag — `blocker` / `issue` / `nit`. State which axis it concerns (quality / safety / idioms / testability — or one of the optional axes if used). State why it matters for whoever picks up the code next (the next reader, the next maintainer, the next caller, the next operator).
2. **Cite the evidence.** Quote the code at file:line. Reference, do not recite — do not paste large blocks of code back. If the finding is "missing error handling on the network call", state explicitly which file:line the call is on and what the error path looks like. When a finding turns on the spec's acceptance criteria, cite the spec section too.
3. **ASK the user for their view.** Open the loop with a question that gives the user room to answer: "What's your read on this?" / "Is this an intentional choice or worth fixing?" / "Does the project actually want this pattern, or is it a one-off?" / "Is this code path hot enough to matter?". Accept the user's freeform answer.
4. **TEST the user's explanation against the code (and the spec, when one anchors "right").** Re-read the cited code (or the code the user points to). Check whether the user's framing actually resolves the finding or merely defends it. Look for: (a) a function elsewhere in the codebase that genuinely settles the convention question (project-convention rule the reviewer missed), (b) a comment in the code explaining the apparent oddity (justified deviation already documented), (c) a decision-log entry that resolves the question (the team explicitly chose this pattern and recorded it), (d) a test that covers the apparent gap (the testability finding may be already addressed elsewhere), (e) a spec acceptance criterion that makes the apparent gap a non-issue (or confirms it as a real one). ASK the user for their view when useful AND TEST the user's explanation against the artifact — do not just accept. The user disagreeing with you is not itself evidence; the user pointing at a passage that resolves the finding IS evidence. Push back per the `## Anti-Sycophancy Stance` when the test fails.
5. **Settle the finding.** Together, settle as one of:
   - `resolved` — the code already addresses the finding (a function the reviewer missed, a defensive check elsewhere in the call chain, a test that covers the edge case), OR a project convention / decision log / spec acceptance criterion resolves the question (an established project idiom, a prior decision that genuinely settles it, a spec point that makes the apparent gap a non-issue). Settlement stays in the decision log only.
   - `rejected` — the finding is not actually a finding (false positive from the candidate-list draft; e.g., the reviewer misread the code, or the reviewer missed a calling pattern that makes the apparent gap unreachable). Settlement stays in the decision log only.
   - `accepted` — the finding is genuine and actionable; it will need to be addressed (typically by re-implementing the code, by escalating to an implementation-fidelity review when the user wants to check the code delivers the spec's acceptance criteria, or by opening a discussion to settle a design question the finding surfaced). Lands in the review record at end-of-session.
   - `deferred` — the finding is genuine but the user wants to park it for later. Lands in the review record at end-of-session.
6. **Append a record to the decision log.** Use the `## P<N>: <Finding title>` shape. `Decision: <settlement>` and `Rationale: <one or two sentences>`. Include the severity tag and the axis in the title or rationale so the decision log carries the per-finding outcome legibly. If the settlement included a dissent per the `## Anti-Sycophancy Stance`, the rationale line carries that dissent verbatim.
7. **Move to the next finding (or file / hunk).** Do not move on while the current finding is still ambiguous — settle it cleanly first. Silence is not a settlement.

If a finding splits into sub-findings during the walk (e.g., a "missing error handling in the network module" finding turns out to be one missing error sub-finding plus one lost-context-on-the-existing-error-path sub-finding), settle each sub-finding as its own `## P<N>` record rather than collapsing them.

## Output Artifacts

This skill produces UP TO TWO artifacts. The decision log is the primary deliverable; the review record is conditional.

### Decision Log (primary, written when the walk produces at least one settlement)

A decision log is a **record**. Write it to the implementation's `discussions/` folder:

```text
implementation/discussions/<YYMMDDHHMMSSZ>-<kebab-desc>-decision-log.md
```

`implementation/` is a flat, records-only spine node: its `discussions/` and `reviews/` live directly inside it — no lineage folders. The `decision-log` artifact-type suffix is MANDATORY — no other suffix is permitted, and the artifact MUST NOT use a versioned form (decision logs are records; they carry no `version`).

- The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured ONCE at write time — never re-derive after writing.
- `<kebab-desc>` is typically `<code-reference-summary>-code-review` (capturing what was reviewed — e.g., `auth-module-code-review`, `pr-42-code-review`, `caching-layer-code-review`). Confirm the slug with the user before the first settlement.
- The `discussions/` folder is created on-demand. Do not pre-create empty folders.

The decision log is **append-only**. Each settled finding is appended as one record with a sequential per-log local heading:

```markdown
## P<N>: <Finding title> (<severity> · <axis>)

Decision: <settlement: resolved / rejected / accepted / deferred>

Rationale: <one or two sentences explaining why; flag any dissent per the Anti-Sycophancy stance>
```

Where `N` starts at `1` for the first settlement in this log and increments by `1` per settlement IN THIS LOG. The `## P<N>:` IDs are LOCAL to this decision log — NOT thread-global, NOT project-global. Cross-log references must include the source log's path.

Resolved AND rejected findings remain in the decision log only. They are NOT carried into the review record — they are already settled and need no further action.

### Review Record (conditional, written ONLY if unresolved actionable findings remain)

A review is a **record** that nests inside the implementation it serves. Write it to the flat `implementation/reviews/` folder:

```text
implementation/reviews/<YYMMDDHHMMSSZ>-<kebab-desc>-review.md
```

The `review` artifact-type suffix is MANDATORY (it carries no `version` — reviews are records). The `reviews/` folder is created on-demand.

This artifact is written ONLY at the END of the walk, and ONLY if at least one `accepted` / `deferred` finding remains. **No review record when nothing remains.** If every finding was settled as `resolved` or `rejected`, no review record is written — the decision log is the only artifact, and the closing message states explicitly that no unresolved findings remain. Capturing nothing produces nothing.

When written, the review record carries ONLY the unresolved actionable findings, references-first, in this section order: `## References` → `## Verdict` → `## Findings` → `## Evidence` → `## Open Questions` → `## Next Actions`.

1. **`## References`** — FIRST, before any verdict, naming the code under review at the top (and the spec it anchored "right" to, if one was supplied). One entry per line as `- <description>: <path>`; each path carries a description, never a bare path list. Within-thread paths are **thread-relative** (e.g. `specs/001/spec.md`, `implementation/discussions/<UTC>-<desc>-decision-log.md`); cross-thread paths are **repo-relative** (e.g. `docs/threads/<other>/...`); **never absolute**. The code reference is named by commit SHA / range / branch name with the repo identifier, or by repo-relative path to a file / directory / saved diff file. Include the decision log emitted by this same walk, any decision logs the finding traces to, any prior reviews on the same code, and any external documentation cited during the walk.
2. **`## Verdict`** — overall judgment on what remains against the code-quality axes (typically `mixed` or `weak` if findings remain; the record itself never carries a `solid` verdict because nothing would land in it in that case).
3. **`## Findings`** — only the `accepted` / `deferred` findings, each carrying its severity tag and axis.
4. **`## Evidence`** — for each finding, cite file:line in the code under review (and the spec section when the finding turns on it).
5. **`## Open Questions`** — clarifications worth confirming. Frame as questions, not as gaps to autofill.
6. **`## Next Actions`** — what to do next for each unresolved finding. Typical actions: re-implement the code to address `blocker` findings, escalate to an implementation-fidelity review when the user wants to check the code delivers what the spec's acceptance criteria promised, escalate to a spec review when findings trace back to spec ambiguity, or open a discussion to settle a specific design question the review surfaced.

Resolved and rejected findings are NOT repeated in the review record — they are already settled in the decision log and require no further triage. Never skip `## References`; the code under review is always named.

#### Disposition Frontmatter

A review records its own disposition in its YAML frontmatter, under a `status:` map. **This skill emits the review with NO `status.disposed` field** — a review with no `status.disposed` is **open, mechanically, by parse**. There is no separate "open" marker to set; the absence of the latch is the open state.

When the review is later acted on, its disposition is recorded directly in this same frontmatter, set once:

```yaml
status:
  disposed: <YYMMDDHHMMSSZ>
  disposition: accepted | rejected
  rationale: <thread-relative path>   # optional
```

- **Accept-and-revise** sets the frontmatter directly — for a code-quality finding, the **fix in a fresh implementation pass is the record**; no separate disposing document is written.
- **Reject** sets the frontmatter with **no document at all** — no separate disposing record is required.
- The optional `rationale` is a thread-relative path to a discussion, if one happened. A discussion never owns the disposition — the frontmatter does.
- Disposition is **set-once**: changing your mind is a new review or a thread reopen, not a frontmatter flip-flop.

This skill only EMITS the review (open, with no `status.disposed`). Disposing it is a downstream act, out of scope for this skill.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp. If no thread exists, ASK the user where to write the review or auto-create a thread when the code reference's slug is obvious.

2. **Resolve the code reference.** Detect the code reference from the user's invocation (git ref / commit range / branch / saved diff path / inline diff body / file path / directory path). If the reference is unsupplied, vague, or matches multiple plausible candidates, ASK the user which is intended. Do not pick by recency or by ref order.

3. **Capture the spec (for anchoring) and any user-provided focus areas.** If a spec is supplied, read it READ-ONLY to anchor what "right" means; if the user named specific concerns ("look for race conditions", "review the new caching layer", "check for missing error handling"), record them for emphasis during the walk. If neither is provided, run the default general-purpose pass across all axes. Do NOT block on missing spec or missing focus — this skill performs a code-quality review without ANY required input beyond the code reference itself.

4. **Read the code reference READ-ONLY.** This skill reads the code but does NOT edit it, does NOT rewrite it, does NOT modify source code, and does NOT mutate any git state. The walk is read-only against the code text. DO NOT check out the branch, DO NOT run tests, DO NOT modify the working tree.

5. **Identify the candidate findings list (or pick the per-file / per-hunk walk order).** Walk the code once end-to-end and draft a candidate list of findings tagged by axis (quality / safety / idioms / testability — plus optional additional axes when warranted), each with suggested severity. OR pick the per-file walk order (each file in the diff or directory, in order) OR the per-hunk walk order (each diff hunk in order). The grain is executor's discretion — see `## Walk Format`. When a spec is available, anchor "right" to its acceptance criteria. Cluster related findings rather than fragmenting. Aim for fewer, higher-quality candidates over many minor ones.

6. **Confirm the candidate list (or walk order) with the user before walking.** List the candidates (or the walk order) by short title back to the user and ASK whether the list is complete and correctly ordered. Re-ordering before the loop starts is cheaper than re-doing settlements later. If the user adds findings the candidate list missed, fold them in. If the user removes findings as not worth walking, drop them.

7. **For each finding (or file / hunk) IN ORDER, run the per-iteration loop from `## Walk Format`.** Surface → cite evidence → ASK the user → TEST the user's explanation against the code (do not just accept) → settle → log. Push back per the `## Anti-Sycophancy Stance` when warranted.

8. **Capture the UTC stamp for the decision log.** When the FIRST settlement lands and the decision log needs to be created, compute the 12-character `YYMMDDHHMMSSZ` stamp at write time. Stamp once and reuse — never re-derive after writing. The decision log is created LAZILY on the first settlement (per `## Decision Log Lazy Creation`).

9. **Append per-settlement records to the decision log.** After each settlement, append a `## P<N>: <Finding title>` record per `## Walk Format` step 6. Tell the user: `Decision saved: <short summary>.`

10. **At the END of the walk: write the review record IF unresolved findings remain.** If at least one `accepted` / `deferred` finding remains, capture the UTC stamp for the review (separate from the decision log's stamp), draft the references-first report covering only the unresolved findings, and write the artifact to `implementation/reviews/<UTC>-<kebab-desc>-review.md`, with NO `status.disposed` field (open by parse). If ALL findings were settled as `resolved` or `rejected`, do NOT write a review record — capturing nothing produces nothing.

11. **Final message.** Cite the decision log path (thread-relative). If the review record was written, cite its path too (thread-relative). If it was NOT written, state explicitly: `No unresolved findings — no review record written.` No closing remark.

## Decision Log Lazy Creation

The decision log is created LAZILY at the FIRST settled finding — not proactively in step 5 or 6. If the candidate-list confirmation produces no walk (user decides the candidates are all false positives and aborts) and no findings are settled, NO decision log is written. An interrupted walk with no settled findings leaves no artifact.

A walk that produces no decisions produces no log. The skill keeps state in-session until the first settlement, then creates the log at write time of the first `## P<N>` record.

If the user pauses mid-walk after at least one settlement has landed, the partial decision log is durable: every settlement up to the pause is recorded. Resuming the walk on a later invocation appends to the same log (the next `## P<N+k>` record).

## Scope Drift

When the user introduces a branch that is outside the code-quality walk — a finding about a different code reference, a tangent unrelated to code quality, a critique of an upstream artifact (spec / proposal / plan) the code was supposed to deliver, an implementation-fidelity concern that needs the spec's acceptance criteria checked for coverage — do not silently follow them and do not let the walk grow into a different shape than the one being discussed. Propose ONE of:

1. **Split into its own decision log or review.** When the branch is itself a multi-finding discussion that deserves its own walk, start a new `<UTC>-<kebab-desc>-decision-log.md` in the appropriate `discussions/` folder. If the branch is "the code does not deliver what the spec's acceptance criteria said it would", recommend an implementation-fidelity review in a separate session. If the branch is "the upstream spec / proposal / plan has the same problem", recommend reviewing that upstream artifact separately.
2. **Capture it as a seed for a future thread.** When the branch is a genuinely separate piece of work, name it so it can be opened as its own thread later rather than polluting this review's decision log. Tangential items mid-work route to the implementation report or to a future thread's seed.
3. **Defer to "later".** When the branch is not yet shaped enough to capture, name it in conversation and let it pass.

ASK the user which. Do not pick silently.

## Commit Policy

This skill NEVER auto-commits any emitted artifact — neither the decision log nor the (conditional) review record. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.

The same prohibition applies to any draft material under the thread's `.wip/` folder — drafts are editable during the session but are never committed by this skill.

This skill ALSO does not modify the code under review. Code modifications belong in a separate implementation pass. If the walk surfaces findings that require code changes, surface them in `## Next Actions` of the review record (when written) or note them in the decision log — let the surrounding session handle implementation separately on a fresh run.

## Immutability

A decision log is a record; it is **append-only**. Once a `## P<N>` record has been written, it is part of the decision log's reviewable history and is NOT edited. A revision to a decision settles as a NEW `## P<N+k>` record explaining the change — never an in-place edit of an earlier record. The log itself is the state — there is no separate state file, no progress tracker.

A review is a record. Its **body is frozen at emission** — once written into `implementation/reviews/`, the body is part of the thread's reviewable history and is NOT rewritten. A revision to a review's body is a NEW review record (new UTC stamp, new kebab-desc), not an in-place body edit. The review's **frontmatter `status:` map is a live surface** until the review is disposed: `status.disposed` / `status.disposition` / optional `status.rationale` may be set once when the review is acted on (this skill does not set them — it emits the review open). Once `status.disposed` is set, the frontmatter freezes too.

The code under review is READ-ONLY for this skill. This skill does NOT modify source code, does NOT check out branches, does NOT mutate git state, and does NOT run tests against the code. Code modifications belong in a separate implementation pass; this skill's role is review only. If the walk surfaces findings that require code changes, the surrounding session handles implementation separately on a fresh run — this skill never crosses into implementation territory.

The spec, when read for anchoring, is read READ-ONLY — this skill never edits it. Spec-fault findings are surfaced under `## Next Actions` as items the human addresses via an owner-approved, record-backed amendment.

No source-relation or lineage frontmatter (`Supersedes:`, `Forked from:`, etc.) is added to any emitted artifact — lineage between the decision log, the review record, and the code reference lives in the `## References` section, not in metadata. The only frontmatter a review carries is its lifecycle `status:` map (and only once disposed); the decision log carries no frontmatter at all.
