## Log What Serves the Target

Log every decision that is **about this {{session-noun}}'s target** — every on-target point the user settles is recorded. The filter is **target-relevance, not importance**: never skip an on-target decision because it seems small or self-evident.

Do NOT log anything **off-target** — an exchange that is not about the target artifact. The canonical example is the end-of-{{session-noun}} "what should I do next?" exchange — write a spec, discard the work, push, commit. That is workflow navigation, not a decision about the target; handle it in conversation (see `## Finish`) and leave no record for it.

The log is still created **lazily**: a {{session-noun}} that settles no on-target decision writes nothing. But once the first on-target decision lands, the log is created and **every** on-target decision thereafter is recorded — there is no "too trivial to log" discretion for on-target decisions.
