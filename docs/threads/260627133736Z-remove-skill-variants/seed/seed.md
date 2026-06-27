# Seed: Remove auto/interactive skill variants
External: none — personal tools repo with a single owner; nothing external to drift against.

Most workflow spine skills ship as paired `-auto` / `-interactive` variants (14 pairs across propose, spec, plan, implement, review, merge). In practice the interactive variants go unused: the real pattern is to run a discussion / seeded-discussion before and after invoking the auto variant.

The idea: drop the variant suffixes entirely so there is one skill per job. In most cases this means deleting the interactive variant and renaming the auto one to the bare skill name, then steering interactivity another way — running a discussion beforehand, or appending a steering instruction when invoking the skill if the user genuinely wants the agent to work interactively.

Initial idea, open to discussion before committing to an approach.
