# Write the implementation report

Write `report.md` inside this run's implementation folder, once, at the run's terminal outcome. The folder belongs to this run, and the report describes what this run did.

Write it per `references/formats/implementation-report.md`: its path inside the folder, the `Plan:` header line, the section order, which sections are always present, and the shape of an entry under `## Deviations`. The `Plan:` line names the plan folder executed, or reads `Plan: none` when the run executed no plan.

## What the report folds in

Draw the report from the run's own outcome material — the progress the run recorded as it went:

- what completed, what completed partially, what was blocked, and what was found already satisfied;
- the resulting changes, by area or by path, at the level a reader needs to find them;
- the checks actually run, with their results, any failure, and any check deliberately skipped with its reason;
- the deviations, each naming what was built, the spec section or ADR stem it departs from, and why;
- any remaining concerns;
- any follow-ups.

State partial, blocked, and no-op outcomes plainly. Partial or blocked work names what changed and what prevented completion; a no-op explains that the requested state already existed and how that was verified.

## Rules

- Never claim a check that was not run: an input naming a check is not evidence that it happened.
- Keep out of the report per-task status blocks, transcripts, dispatch counts, fix-loop detail, and any path under the folder's `.runs/`. Those are transient working material, and the durable report never cites them.
- `report.md` is the only file this act writes.
