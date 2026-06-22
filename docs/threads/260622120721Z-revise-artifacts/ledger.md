# Lifecycle: A first-class way to revise an existing versioned artifact

Thread lifecycle ledger: append-only, holding the only two facts the thread
cannot derive from its artifacts — its **tier** and its **disposition**. The
current value of each key is its last line; only transitions are written, never
the resting default (`active`). Filename and line grammar follow
`docs/workflow/v2/lifecycle.md`.

tier: 2 @ 260622120721Z — a new revise/update capability for versioned artifacts with real design decisions (separate skill vs authoring-mode/flag, eligibility matrix, overlap with existing skills) requiring discussion and a spec
