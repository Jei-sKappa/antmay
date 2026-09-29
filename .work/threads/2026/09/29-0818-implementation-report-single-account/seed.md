---
external: "https://github.com/Jei-sKappa/antmay/issues/76"
---
# Make implementation reports the single completion account

## Ticket

> Long implementations—especially runs of `implement-plan-with-subagents` lasting many hours—currently split their completion information between the implementation report and a summary in chat. The two often repeat what the plan already said or what the report already records, while important deviations, concerns, and follow-ups requiring human judgment may be mixed into either place. This makes completion unnecessarily verbose and forces the reader to inspect multiple accounts.
>
> A reader should need only the implementation report for substantive information. It should point to the executed plan without restating work that followed it exactly, and emphasize valuable differences: what changed from the plan, why it changed, concerns discovered during implementation, and optional follow-ups worth human judgment. The final chat response should not duplicate that account; compact run metadata such as the subagent spawn and fix-loop table may remain useful.
