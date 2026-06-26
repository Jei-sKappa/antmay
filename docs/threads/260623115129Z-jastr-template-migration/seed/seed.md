# Seed: Migrate the workflow skills to composable jastr templates

External: none (workflow-infrastructure work on this single-owner personal repo; no tracker ticket)

The workflow skill suite is currently a set of standalone SKILL.md files that duplicate
large amounts of boilerplate across siblings (commit policy, immutability, inputs, tier
awareness, decision-log conventions, and more). This thread exists to migrate them to
composable, smart jastr templates: analyze the content common across skills and extract it
into shared partials pulled in via `include`, and make the skills modular by fully leveraging
jastr — conditional inputs and parameters — so each invocation surfaces only the context it
actually needs and the common parts are maintained in one place rather than copy-pasted.

Anchors for the work: the jastr repo lives at `.library/sources/Jei-sKappa_jastr` (referenced
elsewhere in this project under its former name `Jei-sKappa/skillrouter`), and
`docs/threads/260612174045Z-agentic-workflow-v2/` carries relevant prior design context.
