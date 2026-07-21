# `antmay` CLI — operating contract

`antmay` is the command-line companion to the Modular Agentic Workflow. It
launches one supported completion-oriented skill run in a durable
[herdr](https://github.com/ogulcancelik/herdr) pane, observes that run in the background, and
reports an honest terminal classification. This document is the operating
contract for the shipped v0 executable: its commands, state boundary,
classifications, machine-readable output, and the hands-on smoke procedures a
maintainer or CI runs to verify a build.

`antmay` never edits your repository, your skills, or your harness
configuration. Installing, running, or removing it leaves every workflow skill
directly usable through its harness exactly as before.

## Installation and prerequisites

`antmay` is a strict TypeScript ESM Bun workspace split into `packages/core`
(the multiplexer-neutral domain) and `packages/cli` (the `antmay` binary). The
built package targets **Node.js 20 or newer** and is packaged so it can be
installed and run through the npm/`npx` ecosystem; the `antmay` bin maps to
`packages/cli/dist/index.js`.

Runtime prerequisites:

- **Node.js 20+** — the CLI runtime.
- **herdr** — an external terminal-workspace program, invoked strictly as a
  separate executable (never linked or embedded). It must be resolvable on
  `PATH`, or its path supplied through `ANTMAY_HERDR_BIN`.
- **Claude Code and/or Codex** — the harness you intend to launch, resolvable on
  `PATH` or supplied through `ANTMAY_CLAUDE_BIN` / `ANTMAY_CODEX_BIN`.
- The selected skill must be installed for the selected harness (see
  [Skill catalog and availability](#skill-catalog-and-availability)).

Supported platforms are **macOS and Linux**. WSL may work as Linux when its
dependencies are present but carries no separate compatibility promise. There is
**no native Windows support**.

## Commands

`antmay --help` lists exactly three public commands — `spawn`, `status`, and
`attach`. The per-run observer is a private packaged module, not a public command
and never present in `--help`. There is no service or daemon: each detached spawn
starts one independent Node.js observer for that run.

### `antmay spawn`

```text
antmay spawn --thread <thread> --skill <catalog-name> --harness <claude|codex> --adapter herdr [--request <text>] [--attach] [--force]
```

- `--thread <thread>` accepts the exact thread folder name, its repo-relative
  root `docs/threads/<YYMMDDHHMMSSZ-slug>`, or its absolute thread-root path. All
  three canonicalize to the same directory, which must be a direct child of the
  current repository's `docs/threads/`. A file inside a thread, a partial
  timestamp or slug, an archived root, an external root, an ambiguous value, or a
  nonexistent value is rejected in preflight — there is no fuzzy or most-recent
  fallback.
- `--skill <catalog-name>` must be one of the catalog entries below.
- `--harness <claude|codex>` selects the harness identity.
- `--adapter herdr` — v0 ships only the herdr adapter.
- `--request <text>` is passed **literally** as input to the selected skill. It
  cannot replace the catalog identity and is never interpreted as a shell
  fragment. Its acceptance depends on the entry's request posture.
- `--attach` joins the newly created pane after a successful launch, through the
  same operation `antmay attach` uses.
- `--force` permits an additional active run when one already exists for the
  repository.

The current repository is the canonical worktree root from
`git rev-parse --show-toplevel`. On an interactive terminal, any missing thread,
skill, harness, or adapter input — and a missing request for a `required` entry —
is gathered with a transient prompt. With every required flag present the command
does not prompt; when required input is missing and prompting is unavailable, the
command fails before launching or registering anything and names the missing
flag(s).

Preflight validates the git repository and canonical worktree root, the exact
active thread, catalog membership and request posture, the selected skill's
harness-specific installation, the harness executable, the herdr executable, the
adapter value, and the active-run guard. **Any failure before pane launch creates
no registry run and no worker.** After preflight, `spawn` creates the pane, sends
the native skill invocation (resolved thread plus any permitted literal request),
records one run binding, starts the detached observer, and then either prints the
run ID and attach hint or attaches. A non-attached `spawn` returns only after the
pane, registry binding, and worker all exist. A partial failure after the pane
was created is never reported as success; the error names the retained pane so
you can find or close it manually.

Success prints, for example:

```text
Launched run <run-id>.
  repository: <canonical-repo>
  thread:     <thread-root>
  skill:      <skill> (<harness>, herdr)
  pane:       <pane-handle>
  attach:     antmay attach <run-id>
```

### `antmay status`

```text
antmay status
antmay status --all
antmay status --json
antmay status --all --json
```

Before producing output, `status` reconciles every scoped run against current
structured-transcript evidence and execution-endpoint liveness, and restores
per-run observation when a still-active run's worker health is stale.
Reconciliation is idempotent and never downgrades or rewrites an already-recorded
terminal classification. Without `--all`, `status` requires a current workflow
repository and reports that canonical folder's runs; with `--all` it enumerates
every repository folder known to the registry.

For the same scope, `status` independently scans active thread roots for
non-empty `.pending-decisions/` and `.pending-reviews/` workspaces and reports
those threads as needing human attention, regardless of the run classification.
Archived threads are inert and contribute no attention signal.

Human output lists each run's ID and classification, repository, thread, skill/
harness/adapter, session, an optional reason, and an attach hint for every
retained available pane:

```text
Runs for <canonical-repo>
- <run-id> [<classification>]
    repository: <canonical-repo>
    thread:     <thread-root>
    skill:      <skill> (<harness>, herdr)
    session:    <pinned|heuristic> [<id>]
    reason:     <terminal reason, when available>
    attach:     antmay attach <run-id> (pane <handle>)

Attention:
- <thread-root>
    repository:        <canonical-repo>
    pending decisions: <n>
    pending reviews:   <n>
```

### `antmay attach`

```text
antmay attach [run-id]
```

An explicit run ID selects that run non-interactively. Without an ID, `attach`
uses the sole attachable run in cwd scope; when several attachable runs exist it
presents a transient picker on an interactive terminal and fails with an exact
re-invocation hint (`antmay attach <run-id>`) when prompting is unavailable.
Active runs and terminal runs whose retained panes are still live are both
attachable. Attachment delegates through the run's recorded adapter and handle.
If the run does not exist or its pane is unavailable, `attach` reports the
condition honestly and leaves the recorded classification and pane record
unchanged. Attaching never restarts the skill, changes its outcome, resolves
pending bundles, or creates another run.

## State root and write boundary

All `antmay`-written files live beneath one per-user state root, resolved in
order:

1. `ANTMAY_STATE_HOME`, when set to a non-empty path;
2. otherwise `$XDG_STATE_HOME/antmay`, when `XDG_STATE_HOME` is set;
3. otherwise `~/.local/state/antmay`.

State is keyed by the repository's canonical absolute folder path and holds the
authoritative run bindings and classifications plus operational data (worker
diagnostics, heartbeat/lease data, tail cursors). A registered run binds at
least: repository path, active thread path, catalog skill name, harness, session
identity (pinned or heuristic), adapter, adapter pane/attach handle, current
classification, terminal reason when available, and worker health. Concurrent
worker and command updates are atomic and idempotent.

`antmay` writes **no** repository file, `.gitignore`, thread artifact, harness
configuration, hook, or breadcrumb. It only reads active thread roots and
pending-bundle directories as workflow inputs. Changing `ANTMAY_STATE_HOME`
relocates all tool-owned state and leaves the default root untouched.

## Skill catalog and availability

Eligibility is defined by this versioned catalog, not by a prose scan of
installed `SKILL.md` bodies. Each entry pins both harness invocation identities
and a request posture: `required` means a non-empty `--request` is mandatory,
`optional` means the thread alone is sufficient but a request may narrow or
supplement the input, and `forbidden` means `--request` is rejected because the
operation is determined by its thread-root artifacts.

| Catalog name | Claude Code identity | Codex identity | Request posture |
| --- | --- | --- | --- |
| `implement` | `/implement` | `$implement` | required |
| `implement-plan` | `/implement-plan` | `$implement-plan` | optional |
| `implement-plan-with-subagents` | `/implement-plan-with-subagents` | `$implement-plan-with-subagents` | optional |
| `materialize-roadmap-threads` | `/materialize-roadmap-threads` | `$materialize-roadmap-threads` | forbidden |
| `merge-artifacts` | `/merge-artifacts` | `$merge-artifacts` | required |
| `plan-brief` | `/plan-brief` | `$plan-brief` | optional |
| `plan-strict` | `/plan-strict` | `$plan-strict` | optional |
| `propose` | `/propose` | `$propose` | optional |
| `reconcile-plan` | `/reconcile-plan` | `$reconcile-plan` | forbidden |
| `reconcile-proposal` | `/reconcile-proposal` | `$reconcile-proposal` | forbidden |
| `reconcile-roadmap` | `/reconcile-roadmap` | `$reconcile-roadmap` | forbidden |
| `reconcile-spec` | `/reconcile-spec` | `$reconcile-spec` | forbidden |
| `review-code` | `/review-code` | `$review-code` | required |
| `review-implementation` | `/review-implementation` | `$review-implementation` | required |
| `review-roadmap` | `/review-roadmap` | `$review-roadmap` | forbidden |
| `review-spec` | `/review-spec` | `$review-spec` | forbidden |
| `roadmap` | `/roadmap` | `$roadmap` | forbidden |
| `spec` | `/spec` | `$spec` | optional |

The selected thread is injected into every rendered invocation independently of
the request. Availability is harness-specific and searches project scope before
user scope:

- Claude Code: `<repository>/.claude/skills/<name>/`, then `~/.claude/skills/<name>/`.
- Codex: `<repository>/.agents/skills/<name>/`, then `~/.agents/skills/<name>/`.

Every candidate must contain a readable `SKILL.md` whose `name:` frontmatter
equals the catalog name; a Codex candidate must also contain `agents/openai.yaml`.
A skill found only in the other harness's roots, a plugin cache, or another
private location is unavailable. A failure names the selected harness and the
searched roots and supplies `npx skills add Jei-sKappa/antmay --skill <name>` as
remediation.

`antmay` is optional: it requires no skill-file change, hook, embedded completion
script, or running-session mutation, and it imposes no permission posture on the
harness. Removing or never installing `antmay` leaves every workflow skill
directly usable through its harness.

## Classifications

Observation reads tool-spawned structured transcripts as the sole
terminal-outcome authority (Claude's pinned-path transcript or the Codex rollout
selected by the cwd/spawn-time heuristic). Recognition is role- and
final-event-aware; an outcome-looking string in user input, echoed invocation
text, tool output, a file the agent read, non-final assistant content, or pane
output never terminates a run. Pane output and optional herdr enrichment report
liveness, wake the detector, and retain diagnostics, but never classify an
outcome. The five closed classifications are:

- `active` — registered, no terminal outcome yet, and the pane/session has not
  been positively confirmed ended or absent (including while observation health
  is degraded).
- `done` — a genuine final `Outcome: DONE — …` was detected; the reason is stored.
- `blocked` — a genuine final `Outcome: BLOCKED — …` was detected; the reason is stored.
- `refused` — a genuine final `Outcome: REFUSED — …` was detected; the reason is stored.
- `unknown` — the pane/session was positively confirmed ended or absent and final
  reconciliation found no genuine transcript-derived terminal outcome. No
  unavailable outcome or reason is fabricated.

Transcript-access failures, adapter-read failures, and other indeterminate
observation errors update worker health and diagnostics but leave the run
`active`; the worker continues and `status` may restore observation. Only
positive end/absence evidence followed by a final reconciliation without a
reliable transcript outcome produces `unknown`.

## `status --json` contract (`StatusDocumentV1`)

With `--json`, stdout is exactly one JSON document and contains no human prose;
diagnostics go to stderr. The v0 document conforms to this exact structure, and
additional fields are prohibited unless `schemaVersion` changes:

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

The human and JSON projections agree on run IDs, classifications, reasons, attach
data, and pending-bundle counts for the same state. `--all --json` changes only
scope and the included repositories.

## Retained-pane lifecycle

A run's pane is created by herdr and is never closed or mutated by `antmay`. When
the observer detects DONE, BLOCKED, REFUSED, or unknown, it finalizes the run
record idempotently and exits, but it never closes, exits, sends input to, or
otherwise mutates the harness pane. The pane handle stays on the terminal record,
so a terminal run whose pane is still live remains attachable through
`antmay attach`. Worker completion and the active-run guard depend on the run
classification, not on pane liveness: a terminal run never triggers the
one-active-run guard even when its pane is alive. No v0 command automatically
closes, expires, or cleans a pane — pane cleanup is a direct herdr action.

## Verification

### Deterministic gates

The standing repository gates, all run from the workspace root, must exit 0:

| Command | Purpose |
| --- | --- |
| `bun run build` | Bundle `packages/core` and the `antmay` CLI + private worker. |
| `bun run typecheck` | Strict `tsc --noEmit` across the workspace. |
| `bun run test` | The fast unit project (`vitest --project unit`). |
| `bun run test:cli:e2e` | Build, then the real-CLI E2E project (`vitest --project e2e`). |
| `bun run check` | Biome formatting/lint check. |
| `bun run format` | Biome formatter (write). |

The E2E suite invokes the **built** `antmay` executable as a subprocess against
isolated temporary repositories, state roots, and transcript/session roots, with
checked-in scripted herdr and harness shims as dependency seams (never an
in-product fake-harness mode or a dry-run branch). Declarative case manifests
under `packages/cli/test/e2e/cases/` carry stable IDs and `covers` references to
the acceptance criteria in `packages/cli/requirements/functional/`; the
traceability gate in
`packages/cli/test/e2e/harness.test/requirements.test.ts` proves every behavioral
criterion has case evidence and every architecture criterion has a named
structural assertion.

**python3 precondition.** Interactive (TTY) E2E cases drive the built CLI through
a small `python3` `pty.spawn` driver so the CLI's own terminal detection reports
an interactive terminal. `python3` must be present to run those cases; macOS and
typical Linux CI images ship it. Without `python3`, the TTY cases cannot run.

### Real-herdr scripted-harness smoke

This hands-on smoke uses the **real herdr executable** together with the
**scripted fake harness shims** in `packages/cli/test/e2e/harness/shims/`
(`claude.mjs`, `codex.mjs`), which write genuine on-disk transcripts whose
terminal content is controlled by a `control.json` knob. It exercises the actual
herdr pane boundary — real pane creation, worker detection over
real-herdr-produced transcripts, retained terminal panes, and the DONE / BLOCKED
/ REFUSED / unknown classifications — **without spending a real agent run**. It
is applicable on **macOS and Linux**.

**Scope and an important limitation.** This smoke does **not** drive a full
`antmay spawn` (or `spawn --attach`) end-to-end with the scripted shims, and a
maintainer cannot make it do so. Before submitting the skill invocation, the
herdr adapter runs `herdr wait agent-status --status idle` on the launched pane
(`packages/cli/src/adapters/herdr.ts`). Real herdr only reports a genuinely
herdr-integrated agent as idle; the scripted `claude.mjs`/`codex.mjs` shims are
plain non-agent processes, so real herdr never reports them idle and `antmay
spawn` blocks until its idle timeout and then errors. That is expected — the
scripted harness is a transcript producer, not a herdr agent. The full
spawn-launch and attach lifecycle (`spawn --attach`, detached spawn followed by a
later `attach`, worker binding, retained-pane attach) is covered instead by:

- the deterministic E2E cases `packages/cli/test/e2e/cases/03-spawn-launch.yml`,
  `packages/cli/test/e2e/cases/08-attach.yml`, and
  `packages/cli/test/e2e/cases/11-verification.yml`, which run the built CLI
  against scripted herdr and harness shims; and
- the [optional real-agent smoke](#optional-real-agent-smoke), which exercises
  the idle gate and the full `spawn`/`spawn --attach` path against a live harness
  (a genuinely idle agent) — the only way to complete that path hands-on.

What this smoke **does** verify against real herdr is the pane boundary and the
classification pipeline: drive the same herdr pane verbs the adapter uses to
create a real pane and launch the scripted shim into it, then let the built
`antmay status --json` classify the resulting real-herdr-produced transcripts.

Setup (from a real terminal, inside a running herdr session):

1. Build the CLI: `bun run build`.
2. Create an isolated sandbox: a temporary git repository, a temporary
   `ANTMAY_STATE_HOME`, and temporary transcript/session roots. Export the
   injectable boundaries so the tooling reads real herdr and the scripted shim
   transcripts:

   ```sh
   export ANTMAY_STATE_HOME="$(mktemp -d)"
   export ANTMAY_HERDR_BIN="$(command -v herdr)"        # e.g. /usr/local/bin/herdr
   export ANTMAY_CLAUDE_BIN="<repo>/packages/cli/test/e2e/harness/shims/claude.mjs"
   export ANTMAY_CLAUDE_TRANSCRIPT_ROOT="$(mktemp -d)"
   export ANTMAY_SHIM_DIR="$(mktemp -d)"                # shims read control.json here
   ```

Procedure and expected observations, one run per terminal outcome:

1. **Real pane creation + scripted launch.** For each outcome, use the real herdr
   pane verbs the adapter drives — `herdr pane split` to create an isolated pane
   (do not split your own focused developer pane), then `herdr pane run <pane_id>
   <claude-shim>` to launch the scripted Claude shim into it with `control.json`
   set to the target `claudeOutcome`. Each command returns code 0 and a real
   `pane_id`; the shim writes its transcript under
   `ANTMAY_CLAUDE_TRANSCRIPT_ROOT`.
2. **Worker detection + classifications.** Run `antmay status --json` and confirm
   it classifies the real-herdr-produced transcripts. With `claudeOutcome` set to
   `done`, `blocked`, then `refused` (one pane each), `status` reports `done`,
   `blocked`, and `refused` with the transcript reason. For `unknown`, leave a
   transcript without a final outcome and positively end its pane
   (`herdr pane close <pane_id>`), then run `antmay status --json`;
   reconciliation reports `unknown` and fabricates no reason.
3. **Retained terminal pane + attach availability.** For the DONE / BLOCKED /
   REFUSED runs, leave the pane alive: `herdr pane get <pane_id>` returns code 0
   and `antmay status --json` reports `attach.available: true` with the pane
   handle — the terminal pane is retained and remains joinable through
   `antmay attach`. (The interactive terminal join itself takes over a live TTY;
   it and the immediate `spawn --attach` join are exercised by the deterministic
   E2E cases named above.)
4. **Cleanup.** Close every pane the smoke created with
   `herdr pane close <pane_id>` and remove the temporary roots. Touch no
   unrelated developer panes or processes.

Record which steps ran and the observed classifications, attach availability,
and retained-pane behavior. If a step cannot run in a given environment, record
precisely what ran and what did not rather than weakening the procedure.

### Optional real-agent smoke

The optional real-agent smoke repeats the primary flow (spawn → observe → status
→ attach) with **real Claude Code or Codex** instead of the scripted shims,
spending a genuine agent run to confirm end-to-end behavior against a live
harness. It is additional evidence only and is **not required** for routine
deterministic test completion — the automated suite and the scripted-harness
smoke above are the standing gates.
