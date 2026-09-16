# Implementation report

Plan: none

## Outcome

Completed. The seed's genesis narrative now distinguishes quoted source material
from agent-composed prose, which is what this thread was opened to fix. The
narrative is carried by up to two sections, at least one always present: a
`## Ticket` section holding a linked ticket's body with its content unchanged and
every line quote-prefixed, and a `## Intent` section holding prose composed from
what the invocation supplied. The run executed no plan and answered no `spec.md`;
its input was the thread's `log.md`, which carries the settled points from the
thread's discussion.

All three problems the seed named are addressed. A reader can no longer mistake
an addition for the ticket's own words, because the quote prefix terminates the
ticket's text at the first unprefixed line. The composed section is written
impersonally, so a first-person aside no longer lands in a seed verbatim. And the
composed section adds nothing the invocation did not supply, so a one-sentence
starting point yields a one-sentence seed rather than an invented wall of scope
claims.

## Changes

- `suite/shared/references/instructions/create-thread.md` — the seed's shape. The
  `### The genesis narrative` section was rewritten: two sections, which appears
  when, their order, the quote-prefixing rules for the ticket section (bare `>`
  for a blank line, `> >` for a blockquote the body already carries), and the
  rule that the intent section is never prefixed. Mirrored into
  `suite/skills/capture-discussion/open-thread/references/instructions/create-thread.md`
  by the sync script.
- `suite/skills/capture-discussion/open-thread/SKILL.md` — the composition rules.
  The genesis-narrative field names its two pieces; the composed intent is
  impersonal, adds no motivation, constraint, scope boundary, or open question of
  its own, and takes one permitted extension — inlining what a roadmap index's
  surrounding frame supplied, so a thread opened from a roadmap entry stands on
  its own without the index open. A thin invocation yields a thin seed, written
  and reported with no remark about its sparseness.
- `suite/skills/capture-discussion/open-thread/references/supplied-ticket.md` —
  the fidelity rule, restated as content unchanged plus quote-wrapping.
- `README.md` and `suite/skills/capture-discussion/open-ticket/SKILL.md` — a
  ticket body is described as becoming the quoted ticket section rather than the
  entire genesis narrative.

Four commits, one per task: `5e9965e`, `dc348ff`, `84dbe3b`, `d893239`.

## Verification

- `node scripts/sync-shared-references.mjs` from `suite/` — wrote 73 files across
  18 skills; the mirrored copy of `create-thread.md` matches its canonical source.
- `node scripts/check-skill-text.mjs` from `suite/` — passes after every task,
  113 files walked, no bare reference path, no `per`-before-path, no indented
  fence.
- `node scripts/check-marketplace-skills.mjs` was not run and was not required:
  no skill was added, removed, renamed, or moved, and no frontmatter was edited.
- A repository-wide grep confirms no prose still claims a ticket body is the whole
  genesis narrative.

## Deviations

- `README.md` and `open-ticket/SKILL.md` were edited — departs from the thread's
  `log.md`, which names neither — because the thread's `glossary.md` redefines
  `genesis narrative`, and both files carried prose the redefinition makes false.
- The `## Report` paragraph of `open-thread/SKILL.md` was reworded — departs from
  the thread's `log.md`, which does not mention it — because it called the genesis
  narrative "the one part of the seed you did not decide", which stopped being
  true once half of it is composed.

## Remaining concerns

- The thread has no `spec.md`. The settled design lives only as log lines in
  `.work/threads/2026/09/16-1321-open-thread-fix/log.md`, so a later reader has
  the decisions and their reasons but no single design truth to read them from.
- `open-ticket`'s frontmatter description still reads "whose body reads as a
  thread's genesis narrative". Left as written: the softer "reads as" still holds,
  and editing a frontmatter value re-opens the YAML parse hazard that once made
  the `skills` CLI drop a skill silently.
- No seed already on disk was migrated to the new shape, including the two debug
  threads under `temp/`. Existing seeds are historical artifacts; the discussion
  flagged migration as the inference most likely to deserve promotion, and it was
  not promoted.

## Follow-ups

- The thread drafts no ADRs by decision; the records are to be written by hand
  once the suite settles, before the stale CLI is realigned. The strongest
  candidate is the principle behind this change — a seed quotes source material it
  did not write and records only what the invocation supplied — together with the
  alternative that was considered and rejected, having `open-thread` interview the
  user to enrich a thin seed.
- CLI drift, recorded and not fixed while `cli/` is on hold: `cli/README.md`'s
  stage-support row calls `open-thread` a skill that "interviews you for the
  thread's founding intent", which was already false for the one-shot skill and is
  emphatically false now. The CLI's own seed handling checks only that `seed.md`
  is non-empty and is unaffected by this change.
- The thread's `glossary.md` supersedes the project glossary's `genesis narrative`
  row and adds `ticket section` and `intent section`; the merge into
  `docs/glossary.md` happens at thread close.
- Thread `.work/threads/2026/09/16-1257-seed-metadata-placement` owns where the
  metadata lines sit relative to these sections, and was deliberately not
  pre-empted here.
