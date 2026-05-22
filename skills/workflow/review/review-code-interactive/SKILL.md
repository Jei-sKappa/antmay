---
name: review-code-interactive
description: Walk a code reference (git ref, diff, file path, or directory path) collaboratively with the user — one finding at a time, asking for their view and testing it against the code — covering quality, safety, idioms, and testability; settles each finding and captures decisions in a log, dumping only unresolved actionable findings to an inbox artifact at the end. Use when you want to think through a general-purpose code review collaboratively with the agent and have the resolved-vs-unresolved split captured for you.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.1.0
---

# Review Code Interactive

Walk a CODE REFERENCE (a git ref / diff / file path / directory path) READ-ONLY one finding (or one file / one hunk) at a time with the user, ASK the user for their view on each finding AND TEST that view against the code, settle each finding as resolved / rejected / accepted / deferred / parked, append per-finding records to a decision log under the active thread's `discussions/` folder, and — only if unresolved actionable findings remain at the end of the session — dump those to an `inbox/open/` review-finding artifact.

This skill performs GENERAL-PURPOSE code review: NO mandatory source artifact, NO fidelity-to-source check, and NO promise to verify that the code implements what some upstream document said it would. It reviews the code on its own merits — quality, safety, idioms, and testability. The cheap moment to push back is during this walk — once the code is merged or released, the cost of unflagged findings compounds.

**Scope boundary:** If the user has a source artifact (a spec, a proposal, a plan, a GitHub issue, or an inbox item) AND wants to check whether the code delivers what the source promised — code-vs-original-intent fidelity — that is a different review target and they should invoke a code-vs-source fidelity review skill instead. This skill's findings are about code QUALITY, not code FIDELITY.

## Anti-Sycophancy Stance

Your job is to help the user reach the right verdict on the code under review against the general-purpose axes, not to make them feel good about whatever the code currently does. Treat the per-finding walk as a mutual attempt to get closer to the truth: you may be missing context, the user may be missing consequences, and either side may notice something the other overlooked. Sycophancy is a particularly costly failure mode here — **a review is most valuable when it disagrees with the author**. A review whose only effect is to validate the code because the author (or the user) defends it has produced nothing useful; the cheap moment to push back is during the walk, before the code is merged or released, before downstream callers depend on the not-quite-right shape. Push back hard on weak reasoning or hidden assumptions; never soften findings just because the user pushes back.

Push back hard on weak reasoning or hidden assumptions; never soften findings just because the user pushes back. A reviewer who waters down a real finding when the author objects has stopped reviewing and started agreeing. The walk's value sits in the disagreement, not the consensus.

Hold these together:

- **Disagree when you disagree.** If the user's view of a finding conflicts with the evidence in the code, your read of the surrounding context, or established project / language idioms, say so plainly before settling. Don't soften it into ambiguity. If the user says "this is idiomatic in this project" and the surrounding code clearly shows a different convention, surface that gap before logging.
- **Push back on weak or incomplete reasoning.** If the user dismisses a finding for a reason that doesn't hold up — "it's obvious from context", "I'll fix it later", "no one will notice", "the test would have caught it if it mattered", "we can refactor it in a follow-up" — name the gap, surface the assumption, and bring it into the conversation before the finding is settled as `rejected` or `resolved`. A future maintainer or downstream caller will not "use context" — they will read the code as it stands.
- **Surface what they didn't ask about.** Risks, hidden costs, downstream consequences, edge cases the user is willing to absorb, code smells the user is willing to live with — raise them, even if the user wants to move on. Better captured as a finding now than rediscovered after merge, where the cost compounds in additional commits or operational surprise.
- **Take the user's input seriously.** If they push back, add context, or challenge your reading of the code, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument (e.g., the user names a project convention you missed, points at a decision-log entry that genuinely settled an idiom differently, or reveals an operational constraint that affects severity).
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never change a finding's severity, settlement, or wording just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see a finding differently, identify the exact assumption or value judgment causing the split, then resolve it before settling the finding.
- **Refuse to log a finding settlement you believe is wrong without flagging it.** If the user insists on settling a finding as `resolved` or `rejected` when you believe it remains actionable, log the settlement they chose but include the dissent in the rationale. Example: `Rationale: <user's reason>. Note: recommended <other settlement> because <why>; user accepted the trade-off — flagged for downstream readers.`
- **Keep the review owned by the evidence.** The goal is not for either side to win. The goal is to record settlements that survive later scrutiny because the relevant context, objections, and trade-offs were actually considered. Push back hard on weak reasoning or hidden assumptions; never soften findings just because the user pushes back.

If you believe a finding is being dismissed without real reason, refuse to log it silently as `rejected`. Either resolve the disagreement first, or log the dissent verbatim in the rationale line. The cheap moment for the review to do its job is during the walk — once the code is merged or released, the cost of unflagged quality / safety / idiom / testability findings compounds, and the next reader / maintainer / caller has to absorb it.

## Inputs

This skill accepts ONE input: a CODE REFERENCE. NO source artifact is required — this skill performs general-purpose code review without a spec, proposal, plan, GitHub issue, or Inbox item. Accepted forms of the code reference:

1. **A git ref** — a commit SHA (full or short), a branch name, a tag, or a commit range. Examples: `abc1234`, `feature/auth-rollout`, `v1.2.0`, `main..feature-branch`, `HEAD~5..HEAD`. The git ref identifies what code is under review.
2. **A diff** — a unified diff passed inline or via a path to a saved `.diff` / `.patch` file. Useful when the code has not been committed to a branch this skill can resolve, or when the diff was exported for review separately.
3. **A file path** — a single file under review (absolute or relative to the repo root). Useful for reviewing one file in isolation.
4. **A directory path** — a directory under review (absolute or relative to the repo root). Useful for reviewing a module, package, subsystem, or any code grouping the user wants reviewed as a unit.

The code reference is READ-ONLY. This skill does NOT check out a branch, does NOT run tests, does NOT modify the working tree, does NOT modify any source code, and does NOT mutate any git state. The walk is read-only against the code text.

**The skill MAY ACCEPT freeform user concerns or focus areas as ADDITIONAL input** — but does NOT block on their absence. Examples: "look for race conditions in the new caching layer", "check for missing error handling in the auth endpoints", "review the new module for testability". If the user provides focus, this skill emphasizes those areas during the walk. If the user provides no focus, this skill runs the default general-purpose pass across all axes.

### Ambiguity fallback

If the code reference is unsupplied, vague, or matches multiple plausible candidates, ASK the user which is intended. There is no global "latest code" algorithm. Do not pick by recency. Silently picking by recency or by sort order would hide a real decision behind a sort order.

## What This Skill Reviews

This skill runs **four general-purpose code-review axes**. The walk runs each axis in order during candidate-list assembly, then settles findings finding-by-finding (or file-by-file / hunk-by-hunk — see `## Walk Format`). Every finding tethers to the question "is the code any good on its own terms?". Findings that drift into code-vs-original-intent fidelity (does the code deliver what some source promised?) are out of scope for this skill and should be surfaced as escalation suggestions under `## Next Actions` rather than walked inline here.

### Axis 1: Quality

Readability, maintainability, naming, structure, code smells, dead code, duplication.

- **Unreadable code** — a function whose intent is opaque without significant time investment from the reader — `issue` or `nit` depending on centrality.
- **Poor naming** — variables / functions / classes / modules whose names do not reflect their purpose or conflict with conventions visible elsewhere — `nit` or `issue`.
- **Tangled structure** — a long function that should have been decomposed, a class with too many responsibilities, deeply nested control flow — `issue`.
- **Code smells** — duplication, dead code, commented-out blocks, magic numbers, premature abstraction — `nit` to `issue`.

### Axis 2: Safety

Bug risks, edge cases, error handling, race conditions, security issues, resource leaks.

- **Bug risks** — off-by-one, missing null checks, unhandled return values, broken invariants — `issue` or `blocker`.
- **Edge cases** — empty inputs, boundary values, error paths, concurrent access, partial failure — `issue` or `blocker`.
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
- **Missing tests for new behavior** — observable new behavior without a test covering it — `nit` or `issue` depending on the project's test convention; does NOT apply for doc-only / comment-only / trivially refactor-only changes.
- **Weak tests** — assertions on incidental output, tests that mock so heavily they cannot fail — `nit` or `issue`.
- **Integration vs unit balance** — a tower of mocked unit tests where one integration test would catch failures, or one giant integration test where targeted unit tests would localize failures — `nit` to `issue`.

### Optional additional axes

Executor MAY add other general-purpose axes when warranted: performance characteristics, dependency hygiene, API design, accessibility, documentation drift. These additional axes are NOT mandatory — the four primary axes above are the standard pass.

### What this skill does NOT review

This skill does NOT check "does the code implement what was intended" — that is a code-vs-original-intent fidelity question and belongs in a separate code-fidelity review. This skill's findings are about code QUALITY, not code FIDELITY. **If the user has a source artifact (spec / proposal / plan / GitHub issue / Inbox item) AND wants to check whether the code delivers what the source promised, redirect them to a code-fidelity review skill instead.** That redirection should also surface in `## Next Actions` when this skill's review surfaces concerns that would benefit from a fidelity check.

This skill ALSO does NOT review the upstream proposal, spec, or plan that may have driven the code. If review findings trace back to upstream artifact ambiguity, surface that in `## Next Actions` with a suggestion to review the relevant upstream artifact separately.

## Walk Format

The walk presents the candidate findings list (or the per-file / per-hunk walk order) to the user up front, then walks one finding (or one file / one hunk) at a time. The grain of the walk — per-finding or per-file / per-hunk (linear traversal of the code) — is the executor's discretion; the requirement is that each loop iteration settles ONE thing. The per-finding grain is the recommended default when findings cluster across the four axes (a few quality nits PLUS a safety issue PLUS an idiom concern); the per-file or per-hunk grain is the recommended default when the code under review is a small diff with localized findings, or when the user prefers a linear walk through the change set.

For each iteration (finding, or file, or hunk):

1. **Surface the finding (or the file / hunk with its observed issues).** State the finding with its severity tag — `blocker` / `issue` / `nit`. State which axis it concerns (quality / safety / idioms / testability — or one of the optional axes if used). State why it matters for whoever picks up the code next (the next reader, the next maintainer, the next caller, the next operator).
2. **Cite the evidence.** Quote the code at file:line. Reference, do not recite — do not paste large blocks of code back. If the finding is "missing error handling on the network call", state explicitly which file:line the call is on and what the error path looks like.
3. **ASK the user for their view.** Open the loop with a question that gives the user room to answer: "What's your read on this?" / "Is this an intentional choice or worth fixing?" / "Does the project actually want this pattern, or is it a one-off?" / "Is this code path hot enough to matter?". Accept the user's freeform answer.
4. **TEST the user's explanation against the code.** Re-read the cited code (or the code the user points to). Check whether the user's framing actually resolves the finding or merely defends it. Look for: (a) a function elsewhere in the codebase that genuinely settles the convention question (project-convention rule the reviewer missed), (b) a comment in the code explaining the apparent oddity (justified deviation already documented), (c) a decision-log entry that resolves the question (the team explicitly chose this pattern and recorded it), (d) a test that covers the apparent gap (the testability finding may be already addressed elsewhere). ASK the user for their view when useful AND TEST the user's explanation against the artifact — do not just accept. The user disagreeing with you is not itself evidence; the user pointing at a passage that resolves the finding IS evidence. Push back per the `## Anti-Sycophancy Stance` when the test fails.
5. **Settle the finding.** Together, settle as one of:
   - `resolved` — the code already addresses the finding (a function the reviewer missed, a defensive check elsewhere in the call chain, a test that covers the edge case), OR a project convention / decision log resolves the question (an established project idiom, a prior decision that genuinely settles it). Settlement stays in the decision log only.
   - `rejected` — the finding is not actually a finding (false positive from the candidate-list draft; e.g., the reviewer misread the code, or the reviewer missed a calling pattern that makes the apparent gap unreachable). Settlement stays in the decision log only.
   - `accepted` — the finding is genuine and actionable; it will need to be addressed (typically by re-implementing the code, by escalating to a code-fidelity review when the user has a source artifact, or by opening a discussion to settle a design question the finding surfaced). Dumps to the inbox-open review-finding artifact at end-of-session.
   - `deferred` — the finding is genuine but the user wants to park it for later. Dumps to the inbox-open review-finding artifact at end-of-session.
   - `parked` — same as deferred but the user has explicitly asked to capture as an Inbox item rather than treat as a review-finding. The walk may route to an inbox-capture flow instead of (or in addition to) the inbox-open dump.
6. **Append a record to the decision log.** Use the `## D<N>: <Finding title>` shape. `Decision: <settlement>` and `Rationale: <one or two sentences>`. Include the severity tag and the axis in the title or rationale so the decision log carries the per-finding outcome legibly. If the settlement included a dissent per the `## Anti-Sycophancy Stance`, the rationale line carries that dissent verbatim.
7. **Move to the next finding (or file / hunk).** Do not move on while the current finding is still ambiguous — settle it cleanly first. Silence is not a settlement.

If a finding splits into sub-findings during the walk (e.g., a "missing error handling in the network module" finding turns out to be one missing error sub-finding plus one lost-context-on-the-existing-error-path sub-finding), settle each sub-finding as its own `## D<N>` record rather than collapsing them.

## Output Artifacts

This skill produces UP TO TWO artifacts. The decision log is the primary deliverable; the inbox-open review-finding dump is conditional.

### Decision Log (primary, written when the walk produces at least one settlement)

```text
docs/threads/<thread>/discussions/<YYMMDDHHMMSSZ>-<kebab-desc>-decision-log.md
```

The `decision-log` artifact-type suffix is MANDATORY — no other suffix is permitted, and the artifact MUST NOT use a versioned form (decision logs are records, not versioned artifacts).

- The 12-character UTC stamp `YYMMDDHHMMSSZ` is captured ONCE at write time — never re-derive after writing.
- `<kebab-desc>` is typically `<code-reference-summary>-code-review` (capturing what was reviewed — e.g., `auth-module-code-review`, `pr-42-code-review`, `caching-layer-code-review`). Confirm the slug with the user before the first settlement.
- The `discussions/` folder is created on-demand. Do not pre-create empty folders.

The decision log is **append-only**. Each settled finding is appended as one record with a sequential per-log local heading:

```markdown
## D<N>: <Finding title> (<severity> · <axis>)

Decision: <settlement: resolved / rejected / accepted / deferred / parked>

Rationale: <one or two sentences explaining why; flag any dissent per the Anti-Sycophancy stance>
```

Where `N` starts at `1` for the first settlement in this log and increments by `1` per settlement IN THIS LOG. The `## D<N>:` IDs are LOCAL to this decision log — NOT thread-global, NOT project-global. Cross-log references must include the source log's path.

Resolved AND rejected findings remain in the decision log only. They are NOT written to the inbox-open dump — they are already settled and need no further action.

### Inbox-Open Review-Finding Dump (conditional, written ONLY if unresolved actionable findings remain)

```text
docs/threads/<thread>/inbox/open/<YYMMDDHHMMSSZ>-<kebab-desc>-review-finding.md
```

The `review-finding` artifact-type suffix is MANDATORY.

This artifact is written ONLY at the END of the walk, and ONLY if at least one `accepted` / `deferred` / `parked` finding remains. **No Inbox file when nothing remains.** If every finding was settled as `resolved` or `rejected`, no inbox-open dump is written — the decision log is the only artifact, and the closing message states explicitly that no unresolved findings remain. The same rule reads as "no Inbox dump if all findings resolved" or "no Inbox file when nothing remains" — capturing nothing produces nothing.

When written, the inbox-open dump carries ONLY the unresolved actionable findings, in the following six-section findings-first shape:

1. **`## Verdict`** — overall judgment on what remains against the general-purpose axes (typically `mixed` or `weak` if findings remain; the dump itself never carries a `solid` verdict because nothing would land in it in that case).
2. **`## Findings`** — only the `accepted` / `deferred` / `parked` findings, each carrying its severity tag and axis.
3. **`## Evidence`** — for each finding, cite file:line in the code under review.
4. **`## References`** — the code reference (commit SHA / range / branch name with the repo identifier, or absolute path to a file / directory / saved diff file), the decision log path emitted by this same walk (absolute path), any related decision logs or prior review-findings by absolute path, any external documentation cited during the walk.
5. **`## Open Questions`** — clarifications worth confirming. Frame as questions, not as gaps to autofill.
6. **`## Next Actions`** — what to do next for each unresolved finding. Typical actions: re-implement the code to address `blocker` findings, escalate to a code-fidelity review when the user has a source artifact and wants to check whether the code delivers what it promised, escalate to an upstream artifact review (proposal / spec / plan) when findings trace back to upstream ambiguity, or open a discussion to settle a specific design question the review surfaced.

Resolved and rejected findings are NOT repeated in the inbox-open dump — they are already settled in the decision log and require no further triage.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp. If no thread exists, ASK the user where to write the review or auto-create a thread when the code reference's slug is obvious.

2. **Resolve the code reference.** Detect the code reference from the user's invocation (git ref / commit range / branch / saved diff path / inline diff body / file path / directory path). If the reference is unsupplied, vague, or matches multiple plausible candidates, ASK the user which is intended. Do not pick by recency or by ref order.

3. **Capture any user-provided focus areas.** If the user named specific concerns ("look for race conditions", "review the new caching layer", "check for missing error handling"), record them for emphasis during the walk. If the user provided no focus, run the default general-purpose pass across all axes. Do NOT block on missing focus — this skill performs general-purpose code review without ANY required input beyond the code reference itself.

4. **Read the code reference READ-ONLY.** This skill reads the code but does NOT edit it, does NOT rewrite it, does NOT modify source code, and does NOT mutate any git state. The walk is read-only against the code text. DO NOT check out the branch, DO NOT run tests, DO NOT modify the working tree.

5. **Identify the candidate findings list (or pick the per-file / per-hunk walk order).** Walk the code once end-to-end and draft a candidate list of findings tagged by axis (quality / safety / idioms / testability — plus optional additional axes when warranted), each with suggested severity. OR pick the per-file walk order (each file in the diff or directory, in order) OR the per-hunk walk order (each diff hunk in order). The grain is executor's discretion — see `## Walk Format`. Cluster related findings rather than fragmenting. Aim for fewer, higher-quality candidates over many minor ones.

6. **Confirm the candidate list (or walk order) with the user before walking.** List the candidates (or the walk order) by short title back to the user and ASK whether the list is complete and correctly ordered. Re-ordering before the loop starts is cheaper than re-doing settlements later. If the user adds findings the candidate list missed, fold them in. If the user removes findings as not worth walking, drop them.

7. **For each finding (or file / hunk) IN ORDER, run the per-iteration loop from `## Walk Format`.** Surface → cite evidence → ASK the user → TEST the user's explanation against the code (do not just accept) → settle → log. Push back per the `## Anti-Sycophancy Stance` when warranted.

8. **Capture the UTC stamp.** When the FIRST settlement lands and the decision log needs to be created, compute the 12-character `YYMMDDHHMMSSZ` stamp at write time. Stamp once and reuse — never re-derive after writing. The decision log is created LAZILY on the first settlement (per `## Decision Log Lazy Creation`).

9. **Append per-settlement records to the decision log.** After each settlement, append a `## D<N>: <Finding title>` record per `## Walk Format` step 6. Tell the user: `Decision saved: <short summary>.`

10. **At the END of the walk: write the inbox-open dump IF unresolved findings remain.** If at least one `accepted` / `deferred` / `parked` finding remains, capture the UTC stamp for the dump (separate from the decision log's stamp), draft the six-section findings-first report covering only the unresolved findings, and write the artifact to `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-review-finding.md`. If ALL findings were settled as `resolved` or `rejected`, do NOT write an inbox-open file — capturing nothing produces nothing, and no Inbox file when nothing remains.

11. **Final message.** Cite the decision log path. If the inbox-open dump was written, cite its path too. If the dump was NOT written, state explicitly: `No unresolved findings — no inbox file written.` No closing remark.

## Decision Log Lazy Creation

The decision log is created LAZILY at the FIRST settled finding — not proactively in step 5 or 6. If the candidate-list confirmation produces no walk (user decides the candidates are all false positives and aborts) and no findings are settled, NO decision log is written. An interrupted walk with no settled findings leaves no artifact.

A walk that produces no decisions produces no log. The skill keeps state in-session until the first settlement, then creates the log at write time of the first `## D<N>` record.

If the user pauses mid-walk after at least one settlement has landed, the partial decision log is durable: every settlement up to the pause is recorded. Resuming the walk on a later invocation appends to the same log (the next `## D<N+k>` record).

## Scope Drift

When the user introduces a branch that is outside the code-review walk — a finding about a different code reference, a tangent unrelated to code quality, a critique of an upstream artifact (spec / proposal / plan) the code was supposed to deliver, a code-vs-original-intent fidelity concern that needs a source artifact — do not silently follow them and do not let the walk grow into a different shape than the one being discussed. Propose ONE of:

1. **Park as an Inbox item** (PREFERRED for non-blocking side-findings). Captures a short markdown record at `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-inbox-item.md` so the side-finding survives without polluting this review's decision log.
2. **Split into its own decision log or review.** When the branch is itself a multi-finding discussion that deserves its own walk, start a new `<UTC>-<kebab-desc>-decision-log.md` in `discussions/`. If the branch is "the code does not deliver what the spec said it would", recommend a code-fidelity review skill with the source artifact in a separate session. If the branch is "the upstream spec / proposal / plan has the same problem", recommend an upstream artifact review skill instead.
3. **Defer to "later".** When the branch is not yet shaped enough to capture, name it in conversation and let it pass.

ASK the user which. Do not pick silently.

## Commit Policy

This skill NEVER auto-commits any emitted artifact — neither the decision log nor the (conditional) inbox-open review-finding dump. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.

The same prohibition applies to any draft material under `docs/threads/<thread>/.wip/` — drafts are editable during the session but are never committed by this skill.

This skill ALSO does not modify the code under review. Code modifications belong in a separate implementation phase. If the walk surfaces findings that require code changes, surface them in `## Next Actions` of the inbox-open dump (when written) or note them in the decision log — let the surrounding session handle implementation separately on a fresh invocation.

## Immutability

Emitted decision logs are append-only. Once a `## D<N>` record has been written, it is part of the decision log's reviewable history and is NOT edited. A revision to a decision settles as a NEW `## D<N+k>` record explaining the change — never an in-place edit of an earlier record. The log itself is the state — there is no separate state file, no progress tracker.

Emitted review-finding artifacts (the conditional inbox-open dump) are also immutable. Once written into `inbox/open/`, the review-finding is part of the thread's reviewable history and is NOT edited. A revision to a review-finding is a NEW review-finding record (new UTC stamp, new kebab-desc), not an in-place edit.

The code under review is READ-ONLY for this skill. This skill does NOT modify source code, does NOT check out branches, does NOT mutate git state, and does NOT run tests against the code. Code modifications belong in a separate implementation phase; this skill's role is review only. If the walk surfaces findings that require code changes, the surrounding session handles implementation separately on a fresh invocation — this skill never crosses into implementation territory.

No source-relation YAML frontmatter is added to any emitted artifact — lineage between the decision log, the review-finding dump, and the code reference lives in the `## References` section (by absolute path for files / directories / saved diff files, by commit SHA / range / branch name with the repo identifier for git refs), not in metadata on the files. That history is recovered from the body's references, not from the filename.
