# Match concrete thread references in the thread-reference search

## Goal

Stop folder-only mentions of `.work/threads/` from blocking a close while still finding references to threads outside `.work/`.

## Context

The search described in `seed.md` currently reports ordinary mentions of the threads folder, including the README and glossary. The discussion settled that a concrete thread reference has the identifier's `yyyy/mm/dd-hhmm-slug` shape; it need not resolve to an existing directory, and a bare identifier for any thread counts.

## Scope and non-scope

This change covers the shared thread-reference search instruction, its generated copies used by `close-thread` and `review-implementation`, and the README command that presents the search. *(Inference: the README example is updated with the instruction so it does not teach the obsolete search.)* It does not change the skills' hit handling, the thread folder format, or the CLI.

## Constraints

- Keep the search over tracked files outside `.work/`, as the existing instruction specifies.
- Preserve the read-only search and inspection of every hit. *(Inference: narrowing the match does not change what the search does after a hit.)*
- Leave `cli/` untouched, as `AGENTS.md` requires while the CLI is on hold.

## The change

Replace the broad `.work/threads/` match in the shared instruction with a search for concrete identifier-shaped references, both rooted and bare. *(Inference: one identifier-shaped pattern can cover both forms.)* Synchronize the instruction into both skill copies, and update the README's command to express the same search. *(Inference: the shared copies and published example follow the canonical instruction.)*

## Acceptance

- A search over tracked files outside `.work/` reports a full reference containing `.work/threads/yyyy/mm/dd-hhmm-slug` when the date, time, and slug are concrete, even if no such directory exists.
- A search over tracked files outside `.work/` reports a bare `yyyy/mm/dd-hhmm-slug` identifier for any thread, not only the thread being closed or reviewed.
- A search over tracked files outside `.work/` does not report a line solely because it mentions `.work/threads/`, a folder glob, or the placeholder path `.work/threads/yyyy/mm/dd-hhmm-slug/`.
- `close-thread` and `review-implementation` receive the same corrected search from the shared instruction, and the README's example command uses that search. *(Inference: the generated copies and README example must agree with the shared instruction.)*
- Each reported hit is still inspected and reported under the calling skill's existing rules. *(Inference: the change narrows detection without changing hit handling.)*

## Degrees of freedom

- The implementer may choose the grep regex syntax and command structure, provided the same matches are produced over the same tracked-file scope and the documented command can be run from the repository root.
- The implementer may choose how to demonstrate the positive and negative matches, provided the acceptance criteria can be checked.

## Inferences

- Update the README example with the canonical instruction; this shapes Scope and non-scope, The change, and Acceptance.
- Keep the search read-only and retain the existing hit handling; this shapes Constraints and Acceptance.
- Use one identifier-shaped pattern for rooted and bare references; this shapes The change.
- Synchronize the shared instruction's generated copies and keep the published example aligned; this shapes The change and Acceptance.

## Delta index

None.
