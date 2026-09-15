# Lifecycle: Migrate the workflow skills to composable jastr templates

Thread lifecycle ledger: append-only, holding the only two facts the thread
cannot derive from its artifacts — its **tier** and its **disposition**. The
current value of each key is its last line; only transitions are written, never
the resting default (`active`). Filename and line grammar follow
`docs/workflow/v2/lifecycle.md`.

tier: 3 @ 260623115129Z — architectural migration of the entire skill suite to jastr templates (shared partials via include, conditional inputs); reshapes how every skill is authored and is hard to reverse once skills are converted and threads accumulate under the new structure
