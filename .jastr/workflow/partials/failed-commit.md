### Failed commit

**If a commit fails, report `BLOCKED` and stop. Do not retry the commit without explicit user instruction.** Failed-commit handling is to surface the error in the four-state task report (status: `BLOCKED`, notes describing the failure mode, next: "user instruction needed to resolve commit failure"), then stop the entire run. Subsequent {{task-noun}} are NOT attempted. Do not retry the commit, do not stash and retry, do not bypass git hooks, do not work around the failure by changing strategy mid-run.

A failed commit is typically a project signal — a pre-commit hook failed, a lint check failed, a test failed, a commit-message linter rejected the subject, a sign-off was missing. Each of those is the project telling the {{actor}} to stop and let the user diagnose. `BLOCKED` is the correct response.
::::if{condition="${actor} == 'orchestrator'"}

The orchestrator's job ends at the report; the user starts a fresh run after resolving the underlying issue.
::::
