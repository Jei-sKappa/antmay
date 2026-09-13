# Implementation Report — Remove the auto/interactive skill variants

Source spec: `docs/threads/260627133736Z-remove-skill-variants/specs/001/spec.md` (tier 2, approved).
Run: single-agent `implement` against the approved spec, committed in three batches.

> **Location note:** During the run this report was parked in the session scratchpad,
> because the spec scope (C1/B12/AC-12.1) and the explicit run instruction forbade
> writing under `docs/threads/**`. The owner subsequently authorized a carve-out
> (decision log P9): AC-12.1 was over-broad — the implement stage's own additive report
> belongs in the active thread, not an "alternate location." The report is therefore
> placed here, in the thread's `implementation/` folder, as originally intended. The
> approved spec is left unedited; the carve-out is recorded in the decision log. See
> Deviation D2 for the run-time record of the deferral.

Commits:
- `cdd1605` refactor: consolidate auto/interactive skill variants into one skill per job (FR-1..FR-5)
- `ee39b70` docs: point all skill references at the consolidated bare names (FR-6..FR-10)
- `c4527aa` fix(review-lossless-mapping): drop the stale "no interactive variant" sentence (FR-13)

## 1. Deviations from the plan/input, with justification

- **D1 — Auto-committed in 3 batches, overriding spec C6 ("No auto-commit").** The run
  instruction explicitly directed three commits with a stated batching and scope rule.
  The `implement` Commit Policy override clause makes an explicit Git instruction win,
  and spec C6 itself notes "committing is a separate decision" — so the commits are
  consistent with the spec rather than a violation of it.
- **D2 — Implementation report not written into `docs/threads/<thread>/implementation/`.**
  The skill's default lands the report inside the active thread. The spec scope (C1, B12)
  and AC-12.1 ("git status shows changes only within the in-scope file set; no file under
  `docs/threads/**` is modified") plus the explicit "never touch anything under
  docs/threads/**" instruction forbid any write there. Honoring the boundary wins; the
  report is delivered in chat and saved to the scratchpad. Writing it into the thread
  would itself fail the spec's own AC-12.1. (Resolved post-run by owner authorization —
  see the Location note above and decision log P9.)
- **D3 — Body-softening wording (judgment calls, granted by DoF-2).** Each survivor's
  line-11 categorical refusal was reframed with a consistent "By default … but it honors
  an invocation that asks it to check in / work through … interactively" phrasing. Beyond
  the line-11 sentence, these variant/twin self-references were removed as "removed twin
  pointers" under B4/AC-4.2/AC-4.4: `merge-artifacts` "Auto"/"autonomous merge"/"the auto
  merge" persona references (4 spots) → "this skill"/"this merge"; `implement-plan`
  "The skill is `*-auto`; the autonomous half" → "This run is autonomous"; `review-proposal`
  "in auto mode" and "This auto skill" → bare; `review-plan` removed the "run that review
  interactively instead" twin pointer (B4 named this explicitly).
- **D4 — Deliberately left untouched for minimal-change fidelity (C7).** `plan-loose`/
  `plan-strict` "this autonomous mode" and `review-plan`'s "mode-agnostic … (autonomously
  or by a human)" were kept: they describe the autonomous default / how the *plan* was
  authored, not a sibling skill, and they trip no acceptance criterion. README's
  take-snapshot cross-reference, retired-skills note, and install example were updated to
  bare names because they live in README (in scope) and AC-12.2 greps README.

## 2. Surprises

- `implement-plan-with-subagents-auto` carried a `references/` subfolder (2 reviewer-prompt
  files). `git mv` of the folder preserved them (rename similarity 100%), and the Raycast
  sync re-inlined them cleanly — no special handling needed.
- The repo has no root build/lint/test pipeline and no git hooks (it is a content repo), so
  the `implement` standing-gate clause was a no-op; all three commits succeeded with no
  pre-commit gate to run.
- `take-snapshot`'s own `SKILL.md` (out of scope) does **not** reference the renamed spec
  skills — only the README's take-snapshot *section* did. So no dangling out-of-scope
  reference exists; the live tree is fully clean.

## 3. Problems hit

- None blocking. Two verification one-liners misfired on zsh quirks (no word-splitting of an
  unquoted list variable; a read-only `status` var name); both were re-run cleanly. These
  affected only the verification scaffolding, never the change set or the commits.

## 4. Follow-ups

- **None required by the spec.** All FR-1..FR-13 acceptance criteria verified (see below).
- The Raycast `assets/skills.json` is git-ignored and regenerates from the renamed
  `SKILL.md` files; it was regenerated locally for verification only (not committed, by
  design — FR-11/AC-11.1).
- **Candidate seed — declined by owner (decision log P9).** During the run this proposed a
  documented alternate report location for runs that must avoid `docs/threads/**`. The
  owner declined it as framed: the report's home is the active thread, and the real fix is
  that a "don't touch `docs/threads/**`" scope rule must carve out the active thread's own
  emitted artifacts. No new workflow mechanism is opened.

## Acceptance verification (all pass)

- FR-1: 0 `*-interactive` folders remain.
- FR-2: 14 survivor folders present, 0 `*-auto` folders, 0 titles contain "Auto", `name:`
  equals leaf folder for all 14.
- FR-3: no description contains `-auto`/`-interactive`/contrast framing; each is one sentence.
- FR-4: no survivor body has a categorical interactivity refusal, a sibling/twin reference,
  or a newly-added Anti-Sycophancy/Scope-Drift/element-by-element section; rename similarity
  90–100% confirms bodies otherwise unchanged.
- FR-5: all 14 survivors at `version: 3.0.0`.
- FR-6: README has 29 `####` sections (was 43, −14), debraced tables, bare links/snippets,
  and a "Steering interactivity" note.
- FR-7: `marketplace.json` valid JSON, no variant paths, propose=1, spec=1, review=6
  (5 bare + review-lossless-mapping), 13 plugins, order preserved with deprecated last.
- FR-8: `settings.json` has the 14 bare scopes, no variants, sorted, valid JSON (32 total).
- FR-9: AGENTS.md Layout block debraced; only Layout lines changed.
- FR-10: spine.md has no `plan-*-auto`/`plan-*-interactive`, keeps "plan autonomy is …
  default, not a law", states discussion-first/steer for human-in-the-loop, and adds the
  suite-wide autonomous-by-default-but-steerable principle near the top.
- FR-11: `skills.json` never hand-edited; regenerated locally → 14 bare names, no variants.
- FR-12: change set confined to the in-scope file set; nothing under `docs/threads/**` or
  `docs/workflow/v1/**` modified; frozen dirs retain their original variant references.
- FR-13: the "no interactive variant of this skill" sentence is gone from
  `review-lossless-mapping`; version stays `1.0.0`; file not renamed.
