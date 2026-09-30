# Write the implementation report

Write `report.md` inside this run's implementation folder, once, at the run's terminal outcome. The folder belongs to this run, and the report describes what this run did.

Write it following the `<skill_path>/references/formats/implementation-report.md` format. The `Plan:` line names the plan folder executed, or reads `Plan: none` when the run executed no plan.

## What the report folds in

Fold the report from the typed entries of the run's progress file, re-read from disk rather than recalled, together with `git log` for the commits the run made. Each entry type feeds one section:

- `done` feeds that task's line in `## Changes`: its commit, `no change needed`, or `already done` with the commit the earlier report records.
- `blocked` feeds that task's line in `## Changes`, reading `blocked`, and `## Outcome` names that task and the diagnosis.
- A task in the run's scope with neither a `done` nor a `blocked` entry is listed in `## Changes` as `not run`.
- `deviation` feeds `## Deviations`.
- `judgment` feeds `## Judgment calls`, and never `## Deviations`.
- `concern` feeds `## Remaining concerns`.
- `check` feeds `## Verification`.
- `discovery` and `follow-up` feed `## Follow-ups`.

A ledger line that carries a deviation or a judgment call points at it, following the format. `## Acceptance` rows come from the spec's checklist, each criterion quoted verbatim; their method and evidence come from the `check` entries, the ledger's commits, and the code as it stands at the end of the run.

State partial, blocked, and no-op outcomes plainly, in the one or two sentences of `## Outcome`. A stopped run names the task it stopped at and what prevented completion; a no-op says that the requested state already held and how that was checked.

## Rules

- Never claim a check that was not run: an input naming a check is not evidence that it happened.
- Copy no progress entry into the report verbatim as a log line: rewrite each into the entry shape of the section it feeds.
- Keep out of the report transcripts, reply tokens, dispatch counts, fix-loop detail, and any path under the folder's `.runs/`. Those are transient working material, and the durable report never cites them.
- `report.md` is the only file this act writes.
