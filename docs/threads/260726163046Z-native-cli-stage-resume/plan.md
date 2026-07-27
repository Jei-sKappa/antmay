# Plan — Native continuation of AFK harness sessions

## Objective and context

Capture each AFK attempt's provider-native session identity through Sandcastle, persist it safely on the durable attempt record while the attempt is live and when it settles, and expose it as a paste-ready continuation command on attempt-backed pauses and as the latest captured session in `antmay afk list`. Provider conversation continuation remains an out-of-band human action; Antmay pipeline resumption, queue handling, Git boundaries, locks, and exit codes retain their existing semantics.

Source: spec.md

## Global Constraints

- Use Sandcastle's provider parser as the sole authority for provider wire
  formats; Antmay owns no duplicate Codex or Claude session matcher
  (per `decisions.md` DR15).
- Keep `captureSessions: false`, pass neither `resumeSession` nor
  `forkSession`, and start every stage attempt as a fresh conversation
  (per `decisions.md` DR9).
- Keep raw provider JSON in the verbose attempt log and out of the curated
  `HarnessEvent` display stream (per `decisions.md` DR17).
- Preserve the checkpoint's atomic-write behavior and explicitly order the new
  provisional write before later writes; atomic replacement alone is not an
  ordering guarantee (per `decisions.md` DR16).
- Treat the provider ID as an opaque, non-empty string. Do not validate a
  provider-specific ID grammar or inspect provider-local transcript paths
  (per `decisions.md` DR20).
- Keep the CLI command surface at `run`, `resume`, and `list`. Native
  continuation never changes Antmay's checkpoint by itself
  (per `decisions.md` DR6 and DR9).
- Add no pause-time clean-worktree caution or shared rendering predicate.
  Existing `resume` enforcement remains authoritative; the journey is
  documented in `cli/README.md` (per `decisions.md` DR19).
- Keep automated tests deterministic and free of real provider credentials and
  paid model calls. `npm --prefix cli run check` remains the complete automated
  gate (per `decisions.md` DR18).

## Tasks

1. **Capture provider-neutral session identities at the harness boundary** — extend the invoker seam, Sandcastle adapter, and scripted invoker to report the first live session and retain it on either outcome variant. → `plan-tasks/01-capture-provider-neutral-session-identities.md`
2. **Validate session identity in attempt checkpoints** — add the optional ID-only session shape to attempt records and enforce its schema without changing `schemaVersion`. → `plan-tasks/02-validate-session-identity-in-attempt-checkpoints.md`
3. **Persist live sessions before attempt settlement** — serialize one recoverable provisional checkpoint write ahead of every settlement path and retain the final session on the settled attempt. → `plan-tasks/03-persist-live-sessions-before-attempt-settlement.md`
4. **Compose and render native continuation commands** — centralize POSIX-safe provider command composition and add the optional `Continue` action line to pause rendering. → `plan-tasks/04-compose-and-render-native-continuation-commands.md`
5. **Wire persisted attempts into initial and resumed pauses** — derive both `Log` and `Continue` from the persisted attempt a pause concerns in the runner and `afk resume`. → `plan-tasks/05-wire-persisted-attempts-into-pauses.md`
6. **Expose the latest captured session in run listings** — select the newest session-carrying attempt, resolve its snapshotted harness, and exercise the column in tests and the list demo. → `plan-tasks/06-expose-latest-session-in-run-listings.md`
7. **Document and demonstrate the native-session journey** — update living CLI guidance and scenario descriptions, run both affected demos, and close the change through the full deterministic gate. → `plan-tasks/07-document-and-demonstrate-native-session-journey.md`
