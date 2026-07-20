# `antmay` v0 — Interactive Skill-Run Orchestrator

## 1. Intended outcome and context

`antmay` is the command-line companion to the Modular Agentic Workflow. Its v0 lets a developer standing inside a workflow repository launch one supported completion-oriented Antmay skill in a durable herdr pane, leave the command or attach to the pane, and later obtain an honest terminal classification from `antmay status`. The same retained pane remains attachable through `antmay attach`, including after the skill run has reached a terminal outcome.

The tool exists because completion-oriented skills communicate their terminal outcome only in their final chat message. In particular, a preflight `REFUSED` run writes no thread artifact, so a pure repository scanner cannot report it. The settled detection model reads tool-spawned harness transcripts, uses pane evidence as a fallback, and observes pending thread bundles separately; skills themselves remain unchanged (per `decisions.md` DR1, DR2, DR8).

v0 deliberately delivers the smallest local interactive slice of the larger architecture: local spawn, per-run background observation, status, and attachment. Remote delegation, notifications, tmux, and headless execution remain later lanes over the same core rather than v0 features (per `decisions.md` DR3, DR5, DR7, DR11, DR19).

## 2. Scope

### 2.1 In scope

- A public executable named `antmay`, with the commands `spawn`, `status`, and `attach` (per `decisions.md` DR12, DR19).
- A strict TypeScript ESM Bun workspace targeting Node.js 20 or newer, split into `packages/core` and `packages/cli`, following the established `.library/sources/Jei-sKappa_jastr` project conventions (per `decisions.md` DR13, DR17).
- Local interactive Claude Code and Codex runs hosted in herdr panes through a thin multiplexer adapter (per `decisions.md` DR2, DR3, DR11).
- A home-state run registry, an explicit catalog of supported Antmay completion-oriented skills, transcript and pane outcome detection, pending-bundle scanning, private per-run observer workers, and synchronous status reconciliation (per `decisions.md` DR1, DR4, DR15, DR16).
- Retained-pane attachment for active and terminal runs, with no automatic pane closure or mutation (per `decisions.md` DR18, DR19).
- Human-readable command output and a stable machine-readable `status --json` contract (per `decisions.md` DR5, DR9, DR10).
- Automated real-CLI end-to-end coverage through injectable process and filesystem boundaries, plus a real-herdr hands-on smoke path (per `decisions.md` DR14, DR17).
- macOS and Linux support. WSL may work as Linux when its dependencies are present, but carries no separate compatibility promise (per `decisions.md` DR17).

### 2.2 Out of scope

- Remote/SSH delegation, rsync choreography, pull/sync-back commands, remote registry federation, and remote provisioning. Their future topology remains governed by `decisions.md` DR5 and DR6.
- Notifications and notification configuration, including ntfy, desktop, and multiplexer sinks. The future sink architecture remains governed by `decisions.md` DR7.
- A tmux adapter, headless host execution, sandboxed execution, launch-output detection, and active discovery of sessions not spawned by `antmay` (per `decisions.md` DR1–DR3, DR11).
- Arbitrary installed skills, dialogue-driven skills, raw harness prompts, and user-defined skill protocols (per `decisions.md` DR16).
- A `resolve` command, `watch` loop, persistent TUI/dashboard, global daemon, per-repository daemon, automatic retry loop, or automatic chaining after a terminal outcome (per `decisions.md` DR10, DR11, DR15).
- Automatic pane closure, pane-retention timers, or an `antmay` cleanup command (per `decisions.md` DR18).
- A per-repository `antmay` configuration file, pane-metadata-based registry reconstruction, harness hooks, or outcome breadcrumbs (per `decisions.md` DR4, DR8, DR11).
- Native Windows support (per `decisions.md` DR17).

## 3. Architecture and binding constraints

### 3.1 Workspace and package boundary

The root is a Bun workspace with shared strict TypeScript configuration and repository-level `build`, `typecheck`, `test`, `test:cli:e2e`, `check`, and `format` scripts. Biome owns formatting/checking, Vitest owns tests, and Commander with typed definitions owns the public CLI. The built CLI targets Node.js 20 or newer and is packaged so `antmay` can be installed and run through the npm/`npx` ecosystem (per `decisions.md` DR5, DR12, DR13).

`packages/core` owns the mode-agnostic domain: public run identity, the explicit skill catalog, registry semantics, outcome parsing and classification, pending-bundle attention semantics, and status projections. No core type or function may require a pane or multiplexer concept. `packages/cli` owns the `antmay` binary, Commander definitions, prompts, concrete filesystem and process integration, harness launch integration, the herdr adapter, and the private worker entry point (per `decisions.md` DR2, DR3, DR13, DR15).

The worker is a private packaged module, not a public command and not present in `antmay --help`. Each successful detached spawn starts one independent Node.js worker for that run; there is no `antmay` service or daemon (per `decisions.md` DR15).

### 3.2 State and write boundary

All `antmay`-written files live beneath one per-user state root. Resolution is:

1. `ANTMAY_STATE_HOME` when set to a non-empty path;
2. otherwise `$XDG_STATE_HOME/antmay` when `XDG_STATE_HOME` is set; or
3. otherwise `~/.local/state/antmay`.

State is keyed by the repository's canonical absolute folder path. It contains authoritative run bindings and classifications plus operational data such as worker diagnostics, heartbeat/lease data, tail cursors, and any future notify-once ledger. `antmay` writes no repository file, `.gitignore`, thread artifact, harness configuration, hook, or breadcrumb. It may read active thread roots and pending-bundle directories as workflow inputs (per `decisions.md` DR4, DR8, DR12, DR15).

A registered run has a stable public run ID and binds at least: repository path, active thread path, catalog skill name, harness, harness session identity or heuristic join identity, adapter, adapter pane/attach handle, current classification, terminal reason when available, and worker health data. Concurrent worker and command updates must be atomic and idempotent; duplicate reconciliation must not regress a terminal classification or produce conflicting terminal records.

### 3.3 Execution and adapter boundary

v0 ships only the herdr adapter, while herdr remains an external runtime program rather than a linked library. The adapter surface is limited to spawning a pane with cwd/environment/command, sending input, reading pane output, reporting liveness, enumerating handles, and attaching. Transcript location, parsing, terminal classification, registry mutation, worker recovery, and pending-bundle semantics remain outside the adapter. Herdr-specific events, output-match support, or agent-state enrichment may trigger an earlier core read but are never required for correctness (per `decisions.md` DR3).

The execution lane starts Claude Code or Codex in the repository folder and invokes the selected catalog skill against the selected thread. Claude Code launch pins a generated session UUID with `--session-id`; Codex interactive identity is joined best-effort from repository cwd and spawn time because interactive Codex does not expose equivalent session-ID pinning (per `decisions.md` DR1, DR3). `antmay` does not impose a permission posture on the harness; the harness's configured permission behavior remains in effect (per `decisions.md` DR2).

### 3.4 Supported completion-skill catalog

The versioned v0 catalog contains exactly these completion-oriented Antmay entry points, using each harness's native invocation identity:

- `implement`
- `implement-plan`
- `implement-plan-with-subagents`
- `materialize-roadmap-threads`
- `merge-artifacts`
- `plan-brief`
- `plan-strict`
- `propose`
- `reconcile-plan`
- `reconcile-proposal`
- `reconcile-roadmap`
- `reconcile-spec`
- `review-code`
- `review-implementation`
- `review-roadmap`
- `review-spec`
- `roadmap`
- `spec`

The catalog, not a prose scan of installed `SKILL.md` bodies, defines eligibility. `spawn` verifies before creating a pane or run record that the chosen catalog entry is available to the selected harness. Unknown catalog names and unavailable installed skills fail preflight with a precise remediation or installation instruction. Updating the catalog is a CLI release change maintained alongside the suite; no skill gains `antmay`-specific metadata (per `decisions.md` DR1, DR16).

## 4. Public command behavior

### 4.1 `antmay spawn`

The complete non-interactive command shape is:

```text
antmay spawn --thread <thread> --skill <catalog-name> --harness <claude|codex> --adapter herdr [--attach] [--force]
```

`<thread>` resolves to one existing active thread root under `docs/threads/<YYMMDDHHMMSSZ-slug>/` in the current repository. Archived threads are not spawn targets. On an interactive terminal, any missing thread, skill, harness, or adapter input is gathered with a transient prompt. With all required flags present, the command does not prompt. When input is missing and prompting is unavailable, the command fails before launching or registering anything and names the missing flag(s) (per `decisions.md` DR10, DR11, DR14, DR16).

Preflight validates the repository, thread, catalog membership, selected skill's harness availability, harness executable, herdr executable, adapter value, and the active-run guard. Failure before pane launch creates no registry run and no worker.

By default, one active run may exist per canonical repository folder. If an active record already exists, an interactive invocation asks for explicit confirmation; a non-interactive invocation fails unless `--force` is supplied. Terminal runs never trigger the guard, even when their retained panes remain alive. Separate git worktree folders are separate repository-folder keys (per `decisions.md` DR6, DR18).

After preflight, `spawn`:

1. creates the harness session in a herdr pane with repository cwd and the selected native skill invocation;
2. records a new stable run ID and complete run binding in the home-state registry;
3. starts the private detached observer worker for that run; and
4. either returns the run ID and attach information, or invokes the common attach operation when `--attach` is present.

A successful non-attached `spawn` returns only after the pane, registry binding, and worker have all been established. A partial operational failure must never be reported as success; if a pane was created before a later step failed, the error identifies that retained pane so the user is not left with an invisible session. `spawn --attach` uses the same attachment implementation as `antmay attach`, rather than duplicating adapter logic (per `decisions.md` DR15, DR19).

### 4.2 Per-run observation and classification

The private worker receives the registered run identity through a package-internal process contract and monitors only that run. It survives the parent CLI's exit, stores diagnostics and health information under the state root, atomically finalizes the run, and exits after a terminal or ended-without-outcome classification (per `decisions.md` DR15).

For tool-spawned interactive sessions the detector walks the applicable ladder strongest-first:

1. **Known/joined transcript** — Claude's pinned-path transcript or the Codex rollout selected by the cwd/spawn-time join. This is the reason-grade source.
2. **Pane evidence** — anchored outcome-token detection against adapter output as a fallback when transcript evidence is unavailable, with reason text best-effort.

Outcome recognition is role- and event-aware; it never raw-greps a transcript or pane. An outcome-looking string in user input, echoed invocation text, tool output, or a file read by the agent must not terminate the run. Transcript parsers skip malformed lines, tolerate additive unknown fields, avoid harness-version gates, exclude subagent conversations from the top-level run, and follow Claude `forkedFrom` chains. Herdr enrichment may wake the detector but cannot replace core parsing (per `decisions.md` DR1, DR3).

The closed classifications are:

- `active` — registered, no terminal outcome, and the pane/session remains live;
- `done` — a genuine final `Outcome: DONE — …` was detected;
- `blocked` — a genuine final `Outcome: BLOCKED — …` was detected;
- `refused` — a genuine final `Outcome: REFUSED — …` was detected; and
- `unknown` — the pane/session ended or required evidence became unavailable without a genuine terminal outcome.

Transcript-derived DONE/BLOCKED/REFUSED stores the complete reason. Pane-only evidence stores the reason only when it can be recovered safely. No unavailable reason is fabricated. Transcript absence caused by disabled persistence, retention cleanup, or uncharacterized compaction yields `unknown` when the run has ended without reliable terminal evidence (per `decisions.md` DR1).

The worker's terminal transition never closes, exits, sends input to, or otherwise mutates the harness pane. The pane handle remains on the terminal record; worker completion and active-run guarding depend on the run classification rather than pane liveness (per `decisions.md` DR18).

### 4.3 `antmay status`

The command shapes are:

```text
antmay status
antmay status --all
antmay status --json
antmay status --all --json
```

Before producing output, `status` reconciles every scoped run against current transcript and pane evidence. If a run is still active but its worker health is stale, `status` restores per-run observation. Reconciliation is idempotent and never downgrades or rewrites an already-recorded terminal classification (per `decisions.md` DR15).

Without `--all`, `status` requires a current workflow repository and reports runs for its canonical folder. With `--all`, it enumerates all repository folders known to the home-state registry. Human output lists each run's ID, repository/thread identity, skill, harness, classification, available reason, and attach availability/hint (per `decisions.md` DR9, DR11, DR18).

For the same scope, `status` independently scans active thread roots for non-empty `.pending-decisions/` and `.pending-reviews/` workspaces. It reports those threads as needing human attention regardless of the transcript classification. Archived threads are inert and never contribute attention signals (per `decisions.md` DR1 and the thread model).

With `--json`, stdout is exactly one JSON document and contains no human prose; diagnostics go to stderr. The v0 document conforms to this exact structural contract, with additional fields prohibited unless `schemaVersion` changes:

```ts
type StatusDocumentV1 = {
  schemaVersion: 1;
  scope:
    | { mode: "repository"; repositoryPath: string }
    | { mode: "all"; repositoryPath: null };
  runs: Array<{
    id: string;
    repositoryPath: string;
    threadPath: string;
    skill: string;
    harness: "claude" | "codex";
    adapter: "herdr";
    classification: "active" | "done" | "blocked" | "refused" | "unknown";
    reason: string | null;
    session: {
      kind: "pinned" | "heuristic";
      id: string | null;
    };
    attach: {
      available: boolean;
      handle: string | null;
    };
  }>;
  attention: Array<{
    repositoryPath: string;
    threadPath: string;
    pendingDecisions: number;
    pendingReviews: number;
  }>;
};
```

This document is self-contained for later SSH federation and preserves the same run classifications, reasons, attach data, and pending-bundle counts as human output (per `decisions.md` DR5, DR9, DR18).

### 4.4 `antmay attach`

The command shape is:

```text
antmay attach [run-id]
```

An explicit run ID selects that run non-interactively. Without an ID, the command uses the sole attachable run in cwd scope; when several attachable runs exist it presents a transient picker on an interactive terminal and fails with an exact re-invocation hint when prompting is unavailable. Active runs and terminal runs with retained live panes are attachable (per `decisions.md` DR19).

Attachment delegates through the run's recorded adapter and handle. If the run does not exist or its pane is unavailable, `attach` reports the condition honestly and leaves the registry classification and pane record unchanged. Attaching never restarts the skill, changes its outcome, resolves pending bundles, or creates another run. Pane cleanup remains a direct herdr user action in v0 (per `decisions.md` DR18, DR19).

## 5. Testability and verification strategy

The repository follows the `jastr` testing shape while testing `antmay`'s real production path. Vitest invokes the built `antmay` executable as a subprocess against isolated temporary repositories, home-state roots, and harness transcript/session roots. Declarative case manifests carry stable case IDs and `covers` references to the acceptance criteria below; each case asserts the applicable exit code, exact stdout, exact stderr, registry/state effects, and repository write boundary (per `decisions.md` DR13, DR14).

External boundaries are injectable through:

- `ANTMAY_STATE_HOME`
- `ANTMAY_HERDR_BIN`
- `ANTMAY_CLAUDE_BIN`
- `ANTMAY_CODEX_BIN`
- `ANTMAY_CLAUDE_TRANSCRIPT_ROOT`
- `ANTMAY_CODEX_SESSION_ROOT`

Checked-in scripted herdr and harness shims exercise normal launch, attach, pane liveness, worker survival, worker recovery, DONE/BLOCKED/REFUSED, echoed false positives, malformed/additively-drifting transcript lines, fork chains, missing transcripts, ended-without-outcome, active-run override, catalog rejection, status JSON, pending bundles, and write-boundary behavior. These are dependency seams, not a built-in fake harness mode; a dry-run or non-spawning-only test does not count as orchestration coverage (per `decisions.md` DR14).

A documented hands-on smoke procedure uses the real herdr executable with the scripted fake harness to exercise actual pane creation, `spawn --attach`, detached spawn followed by `attach`, worker detection, retained terminal panes, and all terminal classifications without spending an agent run. The procedure is applicable on macOS and Linux. An optional manual smoke check repeats the primary flow with real Claude Code or Codex; it is additional evidence, not a routine automated-suite dependency (per `decisions.md` DR14, DR17).

## 6. Acceptance guidance

Every behavioral acceptance criterion below must be covered by at least one declarative end-to-end case unless it is explicitly marked as an architecture review. Unit tests may add narrower evidence but never replace the real-CLI case for an observable command contract.

### FR-1 — Workspace, packaging, identity, and platform contract

- **AC-1.1** `bun run build` produces an npm/`npx`-runnable executable whose `--help` identifies it as `antmay` and lists exactly the public commands `spawn`, `status`, and `attach`; no worker command appears. *(traces `decisions.md` DR12, DR13, DR15, DR19)*
- **AC-1.2** The workspace contains `packages/core` and `packages/cli`, uses strict shared TypeScript ESM configuration, and exposes working root scripts for build, typecheck, test, CLI E2E, Biome check, and format. *(architecture review; traces DR13)*
- **AC-1.3** The built package declares Node.js 20 or newer and the CLI/E2E suite passes on supported macOS and Linux environments; no native Windows support claim appears in package or user documentation. *(traces DR13, DR17)*

### FR-2 — Spawn input and skill-catalog preflight

- **AC-2.1** A TTY invocation missing thread, skill, harness, or adapter gathers each missing value through transient prompts, while the complete flagged command runs without prompting. *(traces `decisions.md` DR10, DR11, DR14)*
- **AC-2.2** A non-interactive invocation missing any required input exits non-zero, names the missing flags, launches no pane, writes no run record, and starts no worker. *(traces DR10, DR14)*
- **AC-2.3** The skill picker contains exactly the eighteen entries in §3.4; `--skill` accepts each catalog entry and rejects every non-catalog name before launch. *(traces DR16)*
- **AC-2.4** A catalog skill unavailable to the selected harness exits non-zero with an installation/remediation instruction before pane creation, registration, or worker launch. *(traces DR16)*
- **AC-2.5** A thread outside the current repository's active `docs/threads/<timestamp-slug>/` roots, including an archived thread, is rejected before launch. *(traces DR11 and the thread model)*

### FR-3 — Spawn, herdr launch, registration, and immediate attachment

- **AC-3.1** A valid fully flagged `spawn` launches the selected harness through the external herdr executable in a pane whose cwd is the canonical repository folder and whose initial invocation selects the requested catalog skill and thread. *(traces `decisions.md` DR2, DR3, DR11, DR16)*
- **AC-3.2** The package links or embeds no herdr code; replacing `ANTMAY_HERDR_BIN` changes only the external executable invoked. *(architecture review plus E2E; traces DR3, DR14)*
- **AC-3.3** Claude launch supplies a generated `--session-id` and records it as a pinned session; Codex launch records a heuristic cwd/spawn-time identity and does not claim a deterministic interactive session ID. *(traces DR1, DR3)*
- **AC-3.4** A successful spawn creates one registry binding containing all fields required by §3.2 and prints the stable public run ID. *(traces DR4, DR12, DR19)*
- **AC-3.5** Spawn without `--attach` returns after the pane, binding, and detached worker exist; the harness and worker continue after the parent CLI process exits. *(traces DR11, DR15)*
- **AC-3.6** `spawn --attach` joins the newly created pane through the same adapter operation exercised by `antmay attach <run-id>`. *(traces DR19)*
- **AC-3.7** A failure after pane creation but before complete registration/worker startup exits non-zero, never reports success, and identifies the retained pane handle in its diagnostic. *(traces DR15, DR18)*

### FR-4 — One-active-run guard

- **AC-4.1** With an active run for the canonical repository folder, a second interactive spawn requires explicit confirmation and a second non-interactive spawn fails unless `--force` is supplied. *(traces `decisions.md` DR6)*
- **AC-4.2** Supplying `--force` permits the second run and does not alter the first run's record. *(traces DR6)*
- **AC-4.3** A terminal run with a still-live retained pane does not trigger the guard, while an active run in a different worktree folder does not block the current folder. *(traces DR6, DR18)*

### FR-5 — Private worker lifecycle and recovery

- **AC-5.1** Each successful detached spawn starts one private packaged worker for that run; the worker is a separate process, observes only its run, survives the CLI parent, and exits after finalizing a terminal or unknown classification. *(traces `decisions.md` DR15)*
- **AC-5.2** Concurrent or repeated worker/status reconciliation produces one idempotent terminal record and never regresses a terminal classification to active. *(traces DR15)*
- **AC-5.3** `status` refreshes scoped evidence before output and, when a run remains active but its worker health is stale, restores observation without creating a second run. *(traces DR15)*
- **AC-5.4** No global or per-repository daemon, public worker command, herdr hook, or harness hook is installed or required. *(architecture review; traces DR8, DR15)*

### FR-6 — Outcome detection and attention semantics

- **AC-6.1** A genuine final Claude DONE/BLOCKED/REFUSED message in the pinned transcript yields the corresponding classification and complete reason in the registry and `status`. *(traces `decisions.md` DR1)*
- **AC-6.2** Codex rollout discovery uses the recorded heuristic identity, filters out subagent rollouts, and classifies a genuine top-level task completion without claiming deterministic session identity. *(traces DR1, DR3)*
- **AC-6.3** Outcome-looking text in a user record, echoed prompt, tool/file output, or non-final assistant content does not classify the run. *(traces DR1)*
- **AC-6.4** Transcript parsing skips malformed lines, accepts additive unknown fields without version gating, and follows Claude `forkedFrom` chains. *(traces DR1)*
- **AC-6.5** Disabling all optional herdr event/output-match enrichments leaves transcript-based classification correct. *(architecture review plus E2E; traces DR3)*
- **AC-6.6** Pane fallback can recover a terminal token when transcript evidence is unavailable without fabricating a reason; a run that ends with neither reliable transcript nor pane outcome is `unknown`. *(traces DR1)*
- **AC-6.7** A non-empty pending-decision or pending-review workspace is reported as human attention independently of the run's transcript classification. *(traces DR1)*

### FR-7 — Status scope and JSON contract

- **AC-7.1** `status` in a repository reports only that canonical folder's runs after reconciliation; `status --all` reports runs for every repository known to the registry. *(traces `decisions.md` DR9, DR15)*
- **AC-7.2** Human status output contains each field named in §4.3 and gives an attach hint for every retained available pane. *(traces DR11, DR18)*
- **AC-7.3** Status attention scanning counts non-empty pending-decision and pending-review bundles in active threads and excludes archived threads. *(traces DR1 and the thread model)*
- **AC-7.4** `status --json` emits exactly one parseable JSON document on stdout, no prose on stdout, and exactly the required schema and values in §4.3; `--all --json` changes only scope and included repositories. *(traces DR5, DR9)*
- **AC-7.5** Human and JSON projections agree on run IDs, classifications, reasons, attach availability, and attention counts for the same state fixture. *(traces DR5, DR9, DR18)*

### FR-8 — Attachment and retained-pane lifecycle

- **AC-8.1** `antmay attach <run-id>` joins the recorded pane for an active run and for a terminal run whose pane remains available. *(traces `decisions.md` DR18, DR19)*
- **AC-8.2** With no run ID, one cwd-scoped attachable run is selected directly, multiple runs prompt on a TTY, and zero or ambiguous runs fail non-interactively with an exact re-invocation hint. *(traces DR19)*
- **AC-8.3** A missing run or unavailable pane exits non-zero without modifying the recorded outcome, attach handle, or other run data. *(traces DR19)*
- **AC-8.4** Detecting DONE, BLOCKED, REFUSED, or unknown leaves the herdr pane and harness process unmodified and stops only the observer worker. *(traces DR18)*
- **AC-8.5** No v0 command automatically closes, expires, or cleans a pane. *(traces DR18)*

### FR-9 — Absolute write boundary and optionality

- **AC-9.1** Across spawn, worker detection, status reconciliation, and attach, filesystem audit shows `antmay` writes only beneath the resolved state root and never inside the repository or harness configuration roots. *(traces `decisions.md` DR4, DR8, DR15)*
- **AC-9.2** Changing `ANTMAY_STATE_HOME` relocates all tool-owned state and leaves the default root untouched. *(traces DR4, DR14)*
- **AC-9.3** No skill file changes, hook installation, embedded completion script, or running-session behavior mutation is required for any v0 command. *(architecture review; traces DR1, DR2, DR8, DR16)*
- **AC-9.4** Removing or never installing `antmay` leaves every workflow skill directly usable through its harness. *(architecture review; traces DR2)*

### FR-10 — Extensible core and adapter architecture

- **AC-10.1** Core run identity, catalog, detection, registry, and status types contain no pane/multiplexer type; pane handles exist only in the execution-lane/adapter boundary and its stored opaque attachment data. *(architecture review; traces `decisions.md` DR2, DR3, DR13)*
- **AC-10.2** A second multiplexer adapter can implement spawn/send/read/liveness/enumerate/attach without changing core detection or classification. *(architecture review; traces DR3)*
- **AC-10.3** Terminal transitions are exposed as idempotent core records/events consumable by a future notification sink without changing detector plumbing. *(architecture review; traces DR7, DR15)*
- **AC-10.4** Launch-output and unspawned-session discovery can be added as new detection-ladder providers without changing current transcript/pane classifiers, and remote execution can wrap the existing registry/adapter/JSON contracts rather than replace them. *(architecture review; traces DR1, DR2, DR5, DR11)*

### FR-11 — Automated and hands-on verification

- **AC-11.1** Declarative E2E cases invoke the built `antmay` executable, use isolated temporary repository/state/transcript roots and scripted external binaries, and carry valid traceability references covering every behavioral AC above. *(traces `decisions.md` DR13, DR14)*
- **AC-11.2** The fixture suite covers success and failure for spawn, worker survival/recovery, every classification, false-positive rejection, malformed/additive transcript data, fork following, active-run override, status human/JSON parity, pending attention, attach, retained panes, and the absolute write boundary. *(traces DR1, DR4, DR6, DR14, DR15, DR18, DR19)*
- **AC-11.3** No automated case obtains orchestration coverage solely through a dry-run or an in-product fake-harness branch. *(architecture review; traces DR14)*
- **AC-11.4** A documented real-herdr/scripted-harness smoke procedure exercises pane creation, immediate and later attachment, worker detection, retained terminal panes, and DONE/BLOCKED/REFUSED/unknown on macOS and Linux. *(traces DR14, DR17–DR19)*
- **AC-11.5** The optional real-Claude/real-Codex smoke procedure is documented separately and is not required for routine deterministic test completion. *(traces DR14)*

## Degrees of freedom

The following implementation-level choices remain open. Every admissible choice must preserve the behavior and acceptance criteria above.

- The internal registry file layout, serialization format, indexing scheme, and locking/atomic-replacement primitive beneath the fixed state root.
- The stable run-ID encoding, provided IDs remain printable, unique within a machine registry, opaque to callers, and valid for later `attach` lookup.
- The catalog's internal source representation and whether release-time validation/code generation derives it from repository sources; the v0 catalog contents and harness invocation results are fixed.
- The transcript parser's internal module structure and whether code is adapted from `.library/sources/jhlee0409_claude-code-history-viewer`; its observable tolerance and classification rules are fixed.
- Worker polling, backoff, heartbeat, and lease representation, provided detached observation, recovery, and terminal idempotence satisfy FR-5.
- The interactive prompt library, visual layout, and fuzzy-search implementation, provided eligible choices, ambiguity behavior, and the complete non-interactive command paths remain unchanged.
- Whether the herdr adapter stamps optional pane metadata and the internal encoding used, provided no v0 identity, recovery, or correctness path depends on that metadata.
- Internal log formatting and rotation beneath the state root, provided diagnostics never cross the write boundary or alter command stdout/JSON contracts.
