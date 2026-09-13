# Lifecycle: Lighten the developer experience of driving the workflow

Thread lifecycle ledger: append-only, holding the only two facts the thread
cannot derive from its artifacts — its **tier** and its **disposition**. The
current value of each key is its last line; only transitions are written, never
the resting default (`active`). Filename and line grammar follow
`docs/workflow/v2/lifecycle.md`.

tier: 2 @ 260622102452Z — feature-grade UX/DX improvement to the workflow (an orchestration layer plus supporting skill/convention tweaks) that needs design discussion and a spec; may escalate to tier 3 if the CLI orchestrator becomes a large standalone build
