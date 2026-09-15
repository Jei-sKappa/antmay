# Lifecycle: Modular Agentic Workflow V2

Thread lifecycle ledger (Workflow V2, §4): append-only, holding the only two
facts the thread cannot derive from its artifacts — its tier and its disposition.
The current value of each key is the last line for that key. The resting
disposition `active` is the default and is never written; only transitions
(`deferred`, `resumed`, `closed: …`) are. Filename and line grammar are pinned
by the V2 ruleset (see `docs/workflow/v2/lifecycle.md`).

tier: 3 @ 260612174045Z — redesigns the conventions every other thread depends on; hard to reverse once skills are updated and threads accumulate under the new layout
closed: done @ 260621155003Z — V2 reference docs (docs/workflow/v2/) and skills built, verified PASS against the spec's acceptance criteria, and committed; spec status.implemented latched
