### Task 2: Move harness identity into the harness domain

**Objective:** Give harness identity and untrusted-value narrowing one dedicated owner in the harness domain and remove configuration as the source of that vocabulary.

**Input / context:** The repository state after Task 1; `seed.md`; `decisions.md DR4`; the harness identity declarations in `cli/src/config/execution.ts`; the two inline checkpoint membership checks; and every current `HarnessId` or `HARNESS_IDS` importer. Preserve the outcome-derived Sandcastle completion signals produced by Task 1 while editing that adapter's harness-id import.

**Steps:**

1. Create `cli/src/harness/id.ts` exporting `HarnessId`, `HARNESS_IDS: readonly HarnessId[]` in the existing diagnostic order, and `isHarnessId(value: unknown): value is HarnessId`. Keep the sole widening cast inside `isHarnessId`, and give this vocabulary module no dependency on configuration, providers, adapters, or checkpoint state.
2. Create `cli/src/harness/id.test.ts` covering both recognized ids, representative unknown strings, and non-string inputs; pin the exported collection's order and contents.
3. Import `HarnessId`, `HARNESS_IDS`, and `isHarnessId` into `cli/src/config/execution.ts`; remove its local type, collection, and private predicate. Retain the existing diagnostic construction that maps `HARNESS_IDS` into prose.
4. In `cli/src/state/checkpoint.ts`, import `HarnessId` and `isHarnessId` from `harness/id.ts`; make both untrusted harness checks call the shared predicate while preserving their site-specific diagnostics.
5. Retarget every production harness-domain type import to `harness/id.ts`: `provider.ts`, `types.ts`, `runtime.ts`, `prompt.ts`, `backends/probe.ts`, `backends/sandcastle.ts`, `providers/index.ts`, and `scripted/probe.ts`.
6. Retarget the direct test consumers in the command, runtime, backend-probe, provider-registry, and scripted-probe tests to `harness/id.ts`; keep the registry-totality assertion reading `HARNESS_IDS` from its new owner.
7. Leave the existing `ID_COMPARISON` architecture guard unchanged: the typed id collection and the shared predicate do not introduce the comparison form it bans.
8. Run focused identity, configuration, checkpoint, provider, probe, runtime, and command tests, then run the full CLI gate.

**Files modified:**

- `cli/src/harness/id.ts` (NEW)
- `cli/src/harness/id.test.ts` (NEW)
- `cli/src/config/execution.ts`
- `cli/src/state/checkpoint.ts`
- `cli/src/harness/provider.ts`
- `cli/src/harness/types.ts`
- `cli/src/harness/runtime.ts`
- `cli/src/harness/runtime.test.ts`
- `cli/src/harness/prompt.ts`
- `cli/src/harness/backends/probe.ts`
- `cli/src/harness/backends/probe.test.ts`
- `cli/src/harness/backends/sandcastle.ts`
- `cli/src/harness/providers/index.ts`
- `cli/src/harness/providers/index.test.ts`
- `cli/src/harness/scripted/probe.ts`
- `cli/src/harness/scripted/probe.test.ts`
- `cli/src/commands/list.test.ts`
- `cli/src/commands/resume.test.ts`
- `cli/src/commands/run.test.ts`

**Verification:** From the repository root, run `npm --prefix cli run test -- src/harness/id.test.ts src/config/execution.test.ts src/state/checkpoint.test.ts src/harness/providers/index.test.ts src/harness/backends/probe.test.ts src/harness/scripted/probe.test.ts src/harness/runtime.test.ts src/commands/list.test.ts src/commands/run.test.ts src/commands/resume.test.ts`, then `npm --prefix cli run check`; both commands exit `0`. Run `rg -n 'export (type HarnessId|const HARNESS_IDS|function isHarnessId)' cli/src` and confirm all three declarations occur only in `cli/src/harness/id.ts`. Run `rg -n 'config/execution\.js' cli/src/harness` and confirm no harness-domain file imports identity from configuration.

**Acceptance criteria:**

- `cli/src/harness/id.ts` is the sole owner of `HarnessId`, `HARNESS_IDS`, and `isHarnessId`.
- `HARNESS_IDS` is typed `readonly HarnessId[]`, and its only widening cast is private to the shared predicate.
- Configuration and checkpoint validation use the same predicate but retain their own diagnostics.
- All production and direct test consumers import harness identity from the harness domain.
- The existing harness-id comparison guard is unchanged and the full CLI gate passes.

**Consumes:** `cli/src/harness/backends/sandcastle.ts` with its Task 1 imports from `runner/outcome.ts`.

**Produces:** `HarnessId`, `HARNESS_IDS: readonly HarnessId[]`, and `isHarnessId(value: unknown): value is HarnessId` from `cli/src/harness/id.ts`.
