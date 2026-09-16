# Commit the implementation report

Commit this run's `report.md` as the **closing report commit**: one commit of its own, made after the report is written and before the run's final message. Follow this at every terminal outcome an executing run reaches — completion, partial completion, a `BLOCKED` halt, and a no-op where the requested state already held — because the report is the run's record and the working tree is left ready to push.

## Stage and commit

- Stage the run's own `report.md` and no other path. Nothing under the implementation folder's `.runs/` and no unrelated working-tree change enters this commit.
- Make one new commit. It stands apart from every task commit the run made: never amend an earlier commit, never rebase, never force-push.
- Give it the project's conventional-commit shape when one is discoverable from recent history or local tooling; otherwise a short imperative subject naming the implementation report. The body is free-form and carries no progress block.
- Capture the SHA and subject for the run's final message.

## When the commit fails

- Read the actual error the commit emitted; never retry blind.
- Fix a cause inside this commit's own footprint — a hook that reformatted the report and left it unstaged, a subject a commit-message linter rejected — re-run the failed check, and retry. Make at most three fix-and-retry attempts.
- Never bypass hooks (`--no-verify` or any equivalent), never weaken, delete, or skip a check to make it pass, and never stash and retry.
- Past the cap, or when the cause is outside this commit's authority — sign-off configuration, credentials, infrastructure — stop retrying. The report stays where it is, uncommitted, and the run continues to its final message carrying the uncommitted marker below. A failed closing report commit changes nothing else about how the run ends.

## The uncommitted marker

Whenever the run ends with its report uncommitted — the commit failed past the cap, or an explicit instruction in the invocation suppressed it — the terminal outcome token stays what the run's work earned, and its reason part gains the marker:

```text
; report uncommitted at <report path>: <diagnosis>
```

The diagnosis names the failure the last attempt hit, or the instruction that suppressed the commit. Append the marker to whatever reason the run would otherwise emit, so the one line an unattended caller reads says both what the run did and that its report is still sitting in the working tree.
