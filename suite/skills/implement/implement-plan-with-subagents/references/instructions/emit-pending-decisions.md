# Emit pending decisions

Queue the genuine open human decisions a run cannot settle on its own, so a human can settle them later. Write one bundle file per run under the thread's `.pending-decisions/` folder, creating the folder on demand.

## Allocate the bundle

Every run writes its own file: never append to an existing bundle, and never reuse a shared singleton file.

Name it `<UTC>-<suffix>-<slug>.md` — the current UTC timestamp, a short unique suffix, and a kebab-case slug summarizing the bundle — for example `260712142301Z-a3f9-retry-ownership.md`. The suffix keeps names distinct even when several runs finish within the same second, and the slug keeps them readable.

## Write the bundle

Write the file following `<skill_path>/references/formats/pending-decision-bundle.md`. The `Producer:` line reads `/<your own skill name>`.

The header carries the target — the thread-relative artifact or operation the decisions block — and the originating user request, so a later clarification is answerable from the bundle file alone.

Write one point per genuine open human decision, each stating what is blocked, why the answer could not be derived from the run's inputs, and the evidence weighed, in your own words tightened to the format. Add a free-text suggestion only when an immediate fix is visible; nothing requires one.

## Rules

- Never write an empty bundle: a run with no open decision writes no file at all.
- A plain defect, an observation, or material meant for a report is not a decision merely because the run has no authority to act on it. Never disguise such content as a decision point.
- Never fabricate a missing field or invent a decision to fill a bundle.
- One bundle holds one coherent target. Split into several bundles only when the points have meaningfully different targets, and name each one independently.
