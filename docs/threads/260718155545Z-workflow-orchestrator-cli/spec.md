# Spec — Workflow orchestrator CLI, v0

Throughout this spec, `<tool>` is a placeholder for the tool's eventual command/binary name (see `## Degrees of freedom`). "Harness" means an agent CLI the tool drives — Claude Code (`claude`) or Codex (`codex`). "Adapter" means a terminal-multiplexer backend the tool drives to host sessions. "Completion-oriented skill" means a skill that ends by emitting the terminal outcome line `Outcome: DONE | BLOCKED | REFUSED — <reason>`.

## 1. Intended outcome

A locally-installed command-line tool that lets a person delegate one completion-oriented skill run to an agent harness running in a durable, attachable terminal-multiplexer pane, then walk away from the screen and later learn how that run ended — DONE, BLOCKED, or REFUSED, with the reason — without having watched it and without any change to the skills themselves.

Concretely, v0 delivers exactly two commands:

- **`<tool> spawn`** — launch a chosen skill, in a chosen harness, against a chosen thread, inside a multiplexer pane; register the run; and start watching it for its terminal outcome. With `--attach`, drop the user straight into the live pane to watch.
- **`<tool> status`** — read back what the tool knows: each run and its detected outcome (or that it is still active), plus any threads that are waiting on a human because they carry a pending-decisions or pending-review bundle.

The whole point is the gap between those two commands: you `spawn`, you leave, you come back and `status` tells you the answer. The skills are byte-for-byte untouched (per `decisions.md` DR1), and the tool is strictly optional — the suite works identically with the tool never installed (per `decisions.md` DR2).

## 2. Context

This thread designs a CLI to orchestrate the Modular Agentic Workflow's completion-driven skills: delegate away-from-keyboard work and find out when a run finishes or needs a human. A research pass (recorded in `seed.md`) vendored five candidate foundations, ran three competing design passes, and surfaced six open questions; a discussion pass settled the architecture across eleven decision records (`decisions.md` DR1–DR11). This spec is the forward-design of the **v0 slice** those decisions converged on — deliberately the smallest build that still delivers the "delegate, leave, come back and see the outcome" loop while exercising every subsystem the deferred lanes (remote delegation, notifications, headless execution, the tmux adapter) will later extend (per `decisions.md` DR11).

The tool's detection strategy exists because the terminal outcome line is emitted only in chat, and REFUSED writes nothing to disk by design — so the outcome of a run is invisible to a pure filesystem watcher. The empirically-verified answer (per `decisions.md` DR1) is to read harness transcripts and launch outputs, which is exactly what makes "come back and see the outcome" possible without touching a skill.

## 3. Scope and non-scope

### In scope (v0)

- A local-only CLI with two commands, `spawn` and `status`, plus `--json` output and optional installer-style interactive prompts (per `decisions.md` DR10, DR11).
- Driving a **single multiplexer adapter, herdr**, at arm's length over its CLI/socket as a separate process (per `decisions.md` DR3).
- Driving **two harnesses**, Claude Code and Codex, as interactive sessions inside a pane (per `decisions.md` DR2 mode 2, DR11), with the detection-strength difference between them stated in `## 5`.
- A **home-directory registry** of run identity bindings and cached detected outcomes, keyed by repository path (per `decisions.md` DR4).
- A **per-run watcher** implementing the interactive rungs of the detection ladder — pinned-path transcript tailing and pane-scrape triggering — to classify the terminal outcome (per `decisions.md` DR1 rungs 2–3).
- The **one-active-run-per-folder** guard on `spawn` (per `decisions.md` DR6).
- `status` reporting runs, outcomes, and pending `.pending-decisions/` / `.pending-reviews/` bundles, cwd-scoped by default with `--all` (per `decisions.md` DR9, DR11).

### Explicitly out of scope (v0)

Each item below is deferred by a decision, not overlooked. The v0 architecture must leave each addable as a later lane without a rewrite (per `decisions.md` DR11); that forward-compatibility is itself a constraint in `## 6`.

- **Remote / SSH delegation**: `--remote`, remote provisioning, the delegation stub, SSH `status` federation, and the `pull` sync-back command (per `decisions.md` DR5, DR6).
- **Notifications**: the pluggable sink module, ntfy.sh push, desktop toast, terse payload mode — all deferred; v0 has no notifications (per `decisions.md` DR7, DR11).
- **Any adapter other than herdr**, including the tmux adapter (per `decisions.md` DR3 — tmux is the first follow-on, not v0).
- **Headless execution** (`claude -p` / `codex exec`) and the **sandboxed lane** — DR2 modes 3 and 4, and any foreground `run`/`exec` verb (per `decisions.md` DR2, DR11). Detection rung 1 (launch-output parsing) is therefore not exercised in v0.
- **Detection of sessions the tool did not spawn** — DR1 rung 4 (history-index matching) as an active discovery feature, and any richer attention board (per `decisions.md` DR8, DR11).
- **A separate `resolve` command**, the `watch` auto-refresh loop, and any persistent TUI/dashboard (per `decisions.md` DR10, DR11).
- **Any write outside the home-directory state root** — no harness config, no hooks, no outcome-breadcrumb, nothing inside any repository. This is a permanent invariant, not merely a v0 deferral (per `decisions.md` DR8).
- **A per-repo configuration file** and **pane-metadata-based identity rebuild** — both explicitly left to a later decision (per `decisions.md` DR4); v0 does not depend on either.

## 4. Actors and the primary flow

**Actor:** a single developer, working locally, standing inside a git repository that follows this workflow's layout (threads under `docs/threads/<YYMMDDHHMMSSZ-slug>/`, bundles as `.pending-decisions/` / `.pending-reviews/` inside a thread root).

**Primary flow:**

1. The user runs `<tool> spawn` inside a repo. Missing inputs (thread, skill, harness, adapter) are gathered by flags or by interactive prompt.
2. The tool checks the registry for an already-active run on the same repo folder; if one exists it does not silently proceed (see FR-4).
3. The tool launches the chosen harness in a herdr pane with the repo folder as cwd, instructing it to invoke the chosen skill against the chosen thread, pinning the session identity where the harness allows it.
4. The tool writes a run binding to the registry and starts a watcher for that run.
5. If `--attach` was given, the user is placed into the live pane; otherwise the command returns and the watcher keeps running.
6. The watcher detects the terminal outcome and records it (token + reason where available) to the registry.
7. Later, the user runs `<tool> status` and reads the outcome, plus any threads carrying pending human-decision or review bundles.

## 5. Expected behavior

### 5.1 `spawn`

- **Inputs.** `spawn` needs four things: the target **thread** (an existing thread root in the current repo), the **skill** (a completion-oriented skill to invoke), the **harness** (`claude` or `codex`), and the **adapter** (herdr in v0). Any not supplied as flags are gathered via interactive prompt (per `decisions.md` DR10). Selection UX is free (see `## Degrees of freedom`) but each selection must resolve to a real thread root and a completion-oriented skill.
- **Launch.** The tool starts the harness inside a herdr pane whose working directory is the repository folder, driving herdr as a separate process over its CLI/socket — never linked or embedded (per `decisions.md` DR3). The harness is instructed to run the chosen skill against the chosen thread. Session identity is pinned deterministically where the harness supports it — Claude Code via `--session-id <uuid>` — and captured by best-effort join where it does not — Codex has no interactive session-id pinning, so its rollout file is identified heuristically from cwd plus spawn time (per `decisions.md` DR1, DR3).
- **Registration.** On a successful launch the tool records a run binding — thread × skill × repo path × harness × pinned-or-captured session identity × adapter pane handle — into the home-directory registry (per `decisions.md` DR4). The registry is v0's authoritative identity store.
- **`--attach`.** With `--attach`, the tool immediately attaches the user's terminal to the live pane so they can watch the agent work. Without it, `spawn` returns after registration and the watcher continues independently (per `decisions.md` DR11).
- **Active-run guard.** Before launching, `spawn` checks the registry for an existing active run bound to the same repo folder. If one exists, `spawn` must not silently start a second concurrent run; it proceeds only on explicit user override — an interactive confirmation or an override flag (per `decisions.md` DR6, whose invariant is one active session per project folder). The override mechanism's form is free (see `## Degrees of freedom`).

### 5.2 The watcher and outcome detection

- **Ladder, interactive rungs only.** For each spawned run the tool detects the terminal outcome by walking the detection ladder strongest-first, using the two rungs that apply to tool-spawned interactive sessions (per `decisions.md` DR1): rung 2 — tailing the harness transcript at its known/joined path (Claude Code's pinned `~/.claude/projects/<encoded-cwd>/<sessionId>.jsonl`; Codex's `~/.codex/sessions/.../rollout-*.jsonl` located by the spawn-time heuristic join) — and rung 3 — pane scraping as a fallback trigger. Rung 1 (launch output) and rung 4 (history-index discovery) are not built in v0 but the ladder must be structured so they slot in later (per `decisions.md` DR11).
- **Authoritative signal.** Transcript tailing is the authoritative detector. herdr's agent-status and output-match may be consumed as an *early trigger* to know when to read, but must never be the sole signal, and correctness must not depend on any herdr enrichment (per `decisions.md` DR3). This is what keeps the adapter swappable.
- **Classification.** The watcher classifies the run as one of: **active** (registered, no terminal outcome yet, pane alive), **done**, **blocked**, **refused**, or **unknown/ended-without-outcome** (the pane ended or the transcript became unavailable — e.g. `--no-session-persistence`, retention cleanup, or an uncharacterized compaction — without a detectable outcome line). Detected DONE/BLOCKED/REFUSED records the token and, where the transcript yields it, the reason text; from a Claude Code transcript the reason is recoverable, whereas a pure pane scrape yields the token reliably but the reason only best-effort (per `decisions.md` DR1).
- **Matching discipline.** Matchers must tolerate the outcome pattern appearing in echoed input or file reads and must never raw-grep a transcript or screen; parsers must be lenient and additive-drift-tolerant, skip bad lines, avoid version-gating, and follow transcript fork chains (`forkedFrom`) (per `decisions.md` DR1). A UI-free reference implementation of this parsing exists at `.library/sources/jhlee0409_claude-code-history-viewer` and may be borrowed.
- **Harness detection-strength difference.** For Claude Code the pinned `--session-id` makes the transcript path deterministic, so outcome and reason are reliably read. For Codex the interactive session is identified by heuristic join, so its detection is best-effort — strong, but not deterministic (per `decisions.md` DR1, DR3). This is a stated limitation, not a defect to solve in v0.
- **Cross-cutting rule.** Regardless of what the transcript says, the presence of a `.pending-decisions/` or `.pending-reviews/` bundle in a thread always wins for "this needs a human" semantics (per `decisions.md` DR1).

### 5.3 `status`

- **Content.** `status` lists the runs the tool knows about (from the registry) with each run's current classification per §5.2, and separately flags threads in scope that carry a pending `.pending-decisions/` or `.pending-reviews/` bundle (per `decisions.md` DR11). Its v0 job is deliberately minimal — a readout, not an attention board (richer framing is deferred per DR11).
- **Scope.** Run inside a repository, `status` reports that repository (cwd-scoped). `status --all` enumerates every repository the registry has seen and reports across all of them; `--all` is simply the cwd filter removed, with no per-repo daemon (per `decisions.md` DR9).
- **Machine-readable output.** `status --json` emits a single machine-readable JSON document on stdout, with any human-facing prose kept off stdout (stderr). This contract is relied on for later SSH-based federation, so it must be stable and self-contained (per `decisions.md` DR5; the `--json` contract adopted in `seed.md`'s convergent design facts). The exact schema is free (see `## Degrees of freedom`).

### 5.4 Cross-command behavior

- **No repo writes, ever.** No command writes anything inside any repository — no state directory, no `.gitignore` edit — and nothing anywhere outside the home-directory state root (per `decisions.md` DR4, DR8).
- **Optional and passive.** The tool never becomes required for any skill and never mutates a running session's behavior; a skill run behaves identically whether or not the tool is watching (per `decisions.md` DR2).

## 6. Constraints

- **C1 — Skills unchanged.** No skill file is modified, and no mechanism is used that requires a skill to write outcome markers or run an embedded completion script. Detection is entirely external transcript/pane reading (per `decisions.md` DR1).
- **C2 — Write boundary (absolute).** The tool writes only under a per-user home-directory state root (e.g. an `XDG_STATE_HOME`-style `~/.local/state/<tool>/`), keyed by repository path. It writes nothing inside any repository and nothing in any harness config or hook location. No exceptions (per `decisions.md` DR4, DR8).
- **C3 — Mode-agnostic core.** Run identity, the detection ladder, and status reporting live in a core that never assumes a pane exists; no pane/multiplexer concept leaks out of the execution-lane layer, so headless and sandboxed lanes are later extensions, not rewrites (per `decisions.md` DR2).
- **C4 — Thin adapter, detection in core.** The multiplexer adapter interface is thin — roughly: spawn a pane (cwd, env, command), send text, read screen, report liveness, enumerate, and produce an attach handle. All detection intelligence stays in the core, never inside an adapter. herdr's extras (agent-status, blocking waits, events, toasts, worktree helpers) are consumed only as optional enrichments behind capability flags, never as load-bearing signals (per `decisions.md` DR3).
- **C5 — herdr at arm's length (AGPL boundary).** herdr is driven only as a separate process over its CLI/socket; it is never linked or embedded (per `decisions.md` DR3).
- **C6 — Registry is authoritative for v0.** Run identity is stored in and read from the home-directory registry. v0 correctness must not depend on pane-metadata stamping or any pane-metadata-based rebuild; whether the adapter stamps pane metadata at all is a free choice (per `decisions.md` DR4).
- **C7 — Forward-compatibility (no lane blocked).** The v0 implementation must not foreclose the deferred lanes: remote delegation must be an added lane over the same adapter interface and identity/registry model; notifications must bolt on by consuming outcomes the core already records (the core must surface a detected outcome as a consumable event, not bury it); the tmux adapter must satisfy the same thin interface; headless (rung 1) and un-spawned-session discovery (rung 4) must slot into the same ladder (per `decisions.md` DR5, DR7, DR11).
- **C8 — Packaging keeps provisioning open.** Even though remote provisioning is out of v0 scope, the packaging choice must keep later one-line provisioning on a fresh box feasible — i.e. a self-contained binary or an `npx`-runnable package (per `decisions.md` DR5).
- **C9 — Workflow layout assumptions.** The tool locates threads at `docs/threads/<YYMMDDHHMMSSZ-slug>/` and bundles at `.pending-decisions/` / `.pending-reviews/` within a thread root, consistent with the documented thread model. It treats these as read-only inputs.
- **C10 — Detection breakers acknowledged.** `--no-session-persistence` (no transcript at all), ~30-day transcript retention, and uncharacterized compaction are known breakers; when they prevent detection the tool reports the honest `unknown/ended-without-outcome` state rather than guessing an outcome (per `decisions.md` DR1).

## 7. Acceptance guidance

Requirements are enumerated as `FR-<id>` with checkable acceptance criteria `AC-<id>.<n>`. Every behavior in `## 5` and every hard constraint in `## 6` is covered by at least one criterion. Criteria marked *(review)* are verified by code/architecture inspection because they assert a structural property rather than a runtime output.

### FR-1 — `spawn` launches a skill run in a herdr pane (per DR2, DR3, DR11)
- **AC-1.1** Running `spawn` with thread, skill, and harness resolved starts a herdr pane whose working directory is the repository folder and in which the chosen harness is running the chosen skill against the chosen thread.
- **AC-1.2** The herdr process is invoked as an external process over its CLI/socket; the tool's build links or embeds no herdr code. *(review; traces C5/DR3)*
- **AC-1.3** With `claude` as harness, the launch pins the session with `--session-id <uuid>` and the tool records that uuid. *(traces DR1)*
- **AC-1.4** With `codex` as harness, the launch succeeds and the tool records a heuristic identity (cwd + spawn time) sufficient to locate the rollout file; the tool does not claim deterministic identity for Codex. *(traces DR1, DR3)*
- **AC-1.5** Missing thread/skill/harness/adapter are gathered by interactive prompt when not passed as flags, and the command is fully non-interactive when all are passed as flags. *(traces DR10)*

### FR-2 — `spawn` registers the run in the home-directory registry (per DR4)
- **AC-2.1** After a successful `spawn`, a registry entry exists under the home-directory state root binding thread × skill × repo path × harness × session identity × adapter pane handle.
- **AC-2.2** No file anywhere inside the repository is created, modified, or deleted by `spawn` (verify a clean `git status` and no new untracked paths). *(traces C2/DR4, DR8)*

### FR-3 — `--attach` behavior (per DR11)
- **AC-3.1** `spawn --attach` places the user's terminal into the live pane of the spawned session.
- **AC-3.2** `spawn` without `--attach` returns to the shell after registration while the run continues, and a subsequent `status` shows that run.

### FR-4 — One-active-run-per-folder guard (per DR6)
- **AC-4.1** When the registry shows an active run bound to the current repo folder, a second `spawn` on that folder does not start a second concurrent run without explicit override.
- **AC-4.2** The user can override the guard through the documented mechanism (interactive confirmation or an override flag), after which the second run starts.
- **AC-4.3** When no active run is bound to the folder, `spawn` proceeds without prompting for override.

### FR-5 — Outcome detection via the interactive ladder (per DR1, DR3)
- **AC-5.1** For a Claude Code run that ends by emitting `Outcome: DONE — …`, `status` reports that run as `done` with the reason text, sourced from the pinned-path transcript.
- **AC-5.2** For a run that ends BLOCKED and for a run that ends REFUSED, `status` reports `blocked` and `refused` respectively, with reason text where the transcript provides it.
- **AC-5.3** Detection does not fire on the outcome pattern merely appearing in echoed input or in a file the agent read (no raw grep); a run that never emits a genuine final outcome is not misclassified as terminal. *(traces DR1)*
- **AC-5.4** Transcript parsing tolerates unknown/optional fields and malformed lines without aborting, is not gated on a harness version, and follows `forkedFrom` chains to the live transcript. *(review; traces DR1)*
- **AC-5.5** herdr agent-status/output-match, if used, only triggers an earlier transcript read; disabling that enrichment still yields correct detection via transcript tailing alone. *(review; traces C4/DR3)*
- **AC-5.6** When the transcript is unavailable (`--no-session-persistence`, retention cleanup) or the pane ends with no detectable outcome, the run is reported `unknown/ended-without-outcome`, never a fabricated DONE/BLOCKED/REFUSED. *(traces C10/DR1)*

### FR-6 — `status` readout and scope (per DR9, DR11)
- **AC-6.1** `status` inside a repo lists that repo's runs with each run's classification (active/done/blocked/refused/unknown).
- **AC-6.2** `status` flags each in-scope thread that contains a `.pending-decisions/` or `.pending-reviews/` bundle as needing a human, independent of any run's transcript outcome. *(traces DR1 cross-cutting)*
- **AC-6.3** `status` is cwd-scoped by default; `status --all` reports across every repository the registry has seen.
- **AC-6.4** `status --json` prints exactly one JSON document to stdout with no human prose on stdout; the same run/outcome data is present in that document. *(traces DR5, seed `--json` contract)*

### FR-7 — Write boundary (per DR4, DR8)
- **AC-7.1** Across a full spawn→detect→status cycle, the only filesystem writes performed by the tool are under the home-directory state root; nothing is written inside any repository and nothing in any harness config or hook path. *(verify by diffing repo and `~/.claude` / `~/.codex` config against a filesystem audit of tool writes)*

### FR-8 — Architectural extensibility (per DR2, DR3, DR11)
- **AC-8.1** The core types carrying run identity, the detection ladder, and status contain no pane/multiplexer concept; the pane concept is confined to the execution-lane/adapter layer. *(review; traces C3)*
- **AC-8.2** The multiplexer adapter is expressed against an interface (spawn/send/read/liveness/enumerate/attach) that a second adapter could implement without touching the core, and herdr-specific extras sit behind capability flags. *(review; traces C4/DR3)*
- **AC-8.3** A detected outcome is surfaced by the core as a consumable event/record that a future notification sink could read without re-plumbing detection. *(review; traces C7/DR7, DR11)*
- **AC-8.4** The packaging produces a self-contained binary or an `npx`-runnable artifact, keeping later one-line provisioning feasible. *(review; traces C8/DR5)*

## Degrees of freedom

The *what* above is pinned. The following *hows* are deliberately left to the implementer; every admissible choice satisfies the acceptance criteria unchanged, produces no user-visible behavior the user would want to weigh in on, and is reversible without revising this spec.

- **Tool / binary / package name** (the `<tool>` placeholder). Cosmetic and reversible; no AC depends on the string chosen.
- **Implementation language and runtime**, bounded by C8 (must remain packageable as a self-contained binary or `npx`-runnable for later provisioning). The vendored research foundations are available in whatever language is chosen but none is mandated.
- **On-disk state format and the exact state-root path**, bounded by C2/C6 (per-user, home-directory, keyed by repo path, honoring `XDG_STATE_HOME` conventions; nothing in-repo). Files vs embedded DB, and the concrete filenames, are free.
- **The exact `--json` schema**, bounded by AC-6.4 (single self-contained stable document on stdout).
- **The transcript/rollout parsing implementation**, bounded by the DR1 rules in AC-5.3–AC-5.4 (lenient, additive-tolerant, non-raw-grep, fork-following). Borrowing the referenced history-viewer parser is optional.
- **The active-run-guard override mechanism** — interactive confirmation, an override flag, or both (bounded by FR-4).
- **The thread/skill/harness selection UX** — pickers, fuzzy search, or plain arguments — bounded by AC-1.5 (must resolve to a real thread root and a completion-oriented skill, and support fully non-interactive flag use).
- **Whether and how the herdr adapter stamps pane metadata**, bounded by C6 (v0 correctness must not depend on it).
- **The watcher's trigger/polling strategy** — pure transcript polling, herdr-event-triggered reads, or a mix — bounded by AC-5.5 (transcript tailing must remain authoritative and sufficient on its own).
- **How the skill invocation is delivered to the harness** — as a launch argument, an initial sent prompt, or otherwise — bounded by FR-1 (the pane ends up running the chosen skill against the chosen thread).

There are genuine, listed degrees of freedom here; this section is not empty.
