### No history rewriting

**This skill does NOT rewrite history — no `--amend`, no rebase, no force-push.** The git history this skill produces is append-only. The {{actor}} does not amend commits (no `commit --amend`, even for typos in commit subjects), does not rebase (no `rebase` invocation in any form, even to clean up the local branch), does not force-push (neither the `--force` flag nor its `-f` shorthand to any remote, even when the remote is behind), and does not delete commits the skill made earlier in the same run. If a commit needs revising after the fact, that is the surrounding session's decision and the user's command — not this skill's responsibility, and not within this skill's mandate.
::::if{condition="${actor} == 'orchestrator'"}

Subagents are also forbidden from history rewriting; the orchestrator's brief to each subagent names this constraint.
::::

This rule pairs with the failed-commit → `BLOCKED` rule above: a failed commit cannot be "recovered" by rewriting an earlier commit or by amending the failed attempt. The recovery path is to surface the failure and let the user resolve it explicitly.
