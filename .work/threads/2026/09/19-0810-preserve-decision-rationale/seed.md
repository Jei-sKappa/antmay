---
external: "https://github.com/Jei-sKappa/antmay/issues/75"
---
# Preserve decision rationale without cluttering the thread log

## Ticket

> A log entry of type `decision` is meant to preserve both what settled and why, but the rationale can be lost when it emerged during the conversation rather than in the user’s final answer. When the user provides a reason, or explicitly accepts a decision based on an argument from the agent, the thread log should retain that rationale so downstream work can understand the decision without access to the conversation.
>
> Rejected alternatives may also be important context, but recording every unchosen option would make the thread log noisy and less useful. The work should carefully determine what interaction makes an alternative meaningfully rejected—and therefore worth preserving—rather than merely unselected.
>
> For example, if an agent presents X, Y, and Z and the user simply chooses X, Y and Z should not automatically be recorded as rejected alternatives. If the user instead asks why the agent recommended X and why Y would be unsuitable, the resulting deliberation may justify a durable rejection: if the user’s argument prevails, the log could record Y as chosen with X rejected; if the agent’s argument prevails, it could record X as chosen with Y rejected. The trigger for retaining a rejected alternative remains to be decided carefully.
