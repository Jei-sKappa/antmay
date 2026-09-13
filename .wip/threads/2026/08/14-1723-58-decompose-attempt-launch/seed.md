# Decompose attempt launch into the named steps its section comments stand in for

`cli/src/execution/phases/attempt.ts` holds `launchAttempt` at roughly 175 lines inside a 247-line file, organized by two numbered section comments — `// 1. Attempt setup` and `// 2. Invoke`. `cli/AGENTS.md` states the rule this violates: a function long enough to need internal section comments is a set of collaborators that has not been named yet.

The ordering inside `launchAttempt` is safety-critical, and those section comments plus the prose beside them are what currently carry it. The attempt-start `HEAD` is read first. The executing attempt is persisted *before* its log is created, so a persistence failure creates no log and prevents the launch. A log-header failure leaves the durable executing attempt recoverable and reports a fatal checkpoint. And a signal arriving after the attempt is reserved and its log created, but before the harness launches, finishes the reserved attempt as interrupted without ever invoking the harness. Each of those constraints is explained in a comment rather than expressed in the shape of the code.

The intended outcome is a structure that states that order without relying on prose to do it: `launchAttempt` decomposed into named collaborators whose shape carries the safety-critical sequencing.

This is the second instance of one problem rather than a new one. Issue #46 decomposes `settleAttempt` — the other half of the same engine step pair, driven from the adjacent line of the loop in `execution/engine.ts` — and it was deliberately scoped to settlement alone so that its trace-comparison verification covers one safety-critical ordering at a time. That leaves `launchAttempt` as the remaining function in the execution domain shaped this way. Whatever #46 settles about where a phase's own sub-steps live and how each is declared in the architecture guard's phase table applies here too, and should not be re-decided from scratch.

No defect is known. Launch behaves correctly; what it lacks is a structure that states its order without relying on prose to do it.

External: https://github.com/Jei-sKappa/antmay/issues/58
