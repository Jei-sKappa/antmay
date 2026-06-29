### Task report block shape

The four-state status appears as a structured block in chat output and/or the commit message body for the task's commit (where applicable). The four-state status is NOT written to a separate artifact file — the chat output and the commit history together are the audit trail.

Suggested format (exact wording is at the implementer's discretion, but the four-state status TOKEN MUST appear verbatim and the block stays in the 5–10 line range):

```
Task <N> status: <DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT>
Notes: <1–3 sentences explaining the rationale or surfaced concerns.>
Next: <suggested action — "ready for next task", "user clarification on X", "stop and surface this finding", "ready for review", etc.>
```

The final out-message from the skill summarizes EVERY {{task-noun}} by its four-state status, plus the commit SHA + subject for every commit made during the run. This is the implementation audit trail; the user reads it to understand {{report-tether}} and what to do next.
