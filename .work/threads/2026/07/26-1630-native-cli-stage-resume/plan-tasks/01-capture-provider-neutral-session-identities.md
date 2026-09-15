### Task 1: Capture provider-neutral session identities at the harness boundary

**Objective:** Make every harness invocation report its first provider-neutral live session ID immediately and retain the same identity on completed and failed outcomes.

**Input / context:** Implement the session-discovery and harness-result contract in `spec.md` FR-1 and FR-5, honoring `decisions.md` DR8, DR13, DR15, and DR17. Sandcastle 0.12.0 exposes `AgentProvider.parseStreamLine(line)` and `RunResult.iterations[n].sessionId`; Antmay must delegate provider wire parsing to that API and keep the existing direct `outcome.kind` discriminant.

**Steps:**
1. Add an optional `onSessionCaptured?: (session: { id: string }) => void` callback to `AttemptRequest` in `cli/src/harness/types.ts`.
2. Extend both variants of `AttemptOutcome` with the shared optional structural member `session?: { id: string }` while preserving the existing top-level `completed` / `failed` union and direct `kind` discrimination. Do not add a session variant to `HarnessEvent`, a nested result object, `sessionWarning`, or another capture diagnostic.
3. Refactor `buildSandcastleRunOptions` so it constructs one provider instance for the attempt, assigns that instance to `RunOptions.agent`, and passes each raw stream line to that same instance's `parseStreamLine(line)`.
4. Retain only the first normalized `session_id` event whose `sessionId` is non-empty, invoke `onSessionCaptured` exactly once with `{ id }`, and continue dropping the raw line from the curated `HarnessEvent` stream while leaving verbose file logging intact.
5. In `createSandcastleInvoker`, keep the first live-captured ID on both resolved and rejected outcomes. When a resolved run produced no live ID, use the non-empty `result.iterations.at(-1)?.sessionId` as a settlement-only fallback without firing the live callback.
6. Preserve the existing Sandcastle construction contract: `captureSessions` stays `false`, the run options still contain neither `resumeSession` nor `forkSession`, and permission behavior remains unchanged for both harnesses.
7. Update `cli/src/harness/sandcastle.test.ts` to stub the provider's normalized `parseStreamLine` result rather than feed provider-specific JSON. Cover first-ID selection across repeated events, callback cardinality, completed and failed outcomes, result fallback, raw-event display exclusion, and unchanged run/agent options.
8. Make `createScriptedInvoker` compute `scripted-session-<stage-id>-<attempt>` for every valid launched attempt, report it once through `onSessionCaptured`, and attach it to ordinary, provider-error, idle-timeout, and abort-settled outcomes.
9. Extend `cli/src/harness/scripted/invoker.test.ts` request construction and assertions to prove the deterministic ID reaches both the live callback and completed/failed outcomes without changing transcript or log framing.

**Files modified:**

- `cli/src/harness/types.ts`
- `cli/src/harness/sandcastle.ts`
- `cli/src/harness/sandcastle.test.ts`
- `cli/src/harness/scripted/invoker.ts`
- `cli/src/harness/scripted/invoker.test.ts`

**Verification:**

1. `npm --prefix cli run test -- src/harness/sandcastle.test.ts src/harness/scripted/invoker.test.ts`
2. `npm --prefix cli run check`

**Acceptance criteria:**

- `AttemptRequest` exposes the optional live-capture callback, and both direct `AttemptOutcome` variants may carry `{ session: { id } }`.
- The Sandcastle agent object passed to `run()` is the same object parsing raw lines.
- Multiple normalized session events invoke the callback once and retain the first non-empty ID on successful and failed outcomes.
- A result-only fallback attaches the last iteration's non-empty session ID without invoking the live callback.
- No Codex- or Claude-specific session JSON matcher, session `HarnessEvent`, comparison warning, nested outcome result, or capture diagnostic exists.
- The scripted invoker reports exactly `scripted-session-<stage-id>-<attempt>` live and at settlement.
- Existing permission options, fresh-conversation behavior, verbose logging, and curated event rendering remain unchanged.

**Consumes:** none

**Produces:** `AttemptRequest.onSessionCaptured?: (session: { id: string }) => void`; direct `AttemptOutcome` variants with `session?: { id: string }`; scripted session IDs shaped as `scripted-session-<stage-id>-<attempt>`.
