# Lifecycle: Modular Agentic Workflow V2

Thread lifecycle ledger (Workflow V2, §4): append-only, holding the only two
facts the thread cannot derive from its artifacts — its tier and its disposition.
The current value of each key is the last line for that key. The resting
disposition `active` is the default and is never written; only transitions
(`deferred`, `resumed`, `closed: …`) are. Filename and line grammar are a §15
degree of freedom — provisional here, to be ratified by the V2 spec.

tier: 3 @ 260612174045Z — redesigns the conventions every other thread depends on; hard to reverse once skills are updated and threads accumulate under the new layout
