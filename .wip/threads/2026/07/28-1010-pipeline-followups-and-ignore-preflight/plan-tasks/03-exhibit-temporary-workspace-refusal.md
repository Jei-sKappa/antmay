### Task 3: Exhibit the temporary-workspace refusal

**Objective:** Preserve the structured refusal in the demo catalog and document which preflight refusals earn scenario coverage.

**Input / context:** `spec.md` FR-3 and FR-4; `decisions.md DR4` and `decisions.md DR5`; the complete refusal produced by Task 1; the command gates produced by Task 2; and the scenario conventions in `cli/AGENTS.md`.

**Steps:**
1. Add `cli/scripts/scenarios/20-temporary-workspace-refusal.mjs`. Give it the normal Standard scripted document so executable probing remains fake, then use one setup action to remove ignore coverage for `.pending-decisions/` and `.pending-reviews/`, force-add and commit one file under the still-ignore-covered `.implementation-runs/`, and run once expecting exit `1`. Stop on the refusal.
2. Keep the aggregate listing last by moving `cli/scripts/scenarios/20-list.mjs` to `cli/scripts/scenarios/21-list.mjs`; update its IDs in `cli/README.md` and `cli/AGENTS.md`.
3. Add the refusal scenario's row to the README table and add the rule in `cli/AGENTS.md` that grouped lists or copyable blocks earn a preflight-refusal scenario while a single sentence does not.
4. Run the new scenario and renamed list scenario with color disabled, run the scenario listing, and compare the on-disk scenario stems with the README table.

**Files modified:**

- `cli/scripts/scenarios/20-temporary-workspace-refusal.mjs` (NEW)
- `cli/scripts/scenarios/20-list.mjs` (DELETED)
- `cli/scripts/scenarios/21-list.mjs` (NEW)
- `cli/README.md`
- `cli/AGENTS.md`

**Verification:**

- `npm --prefix cli run demo -- --scenario 20-temporary-workspace-refusal --no-color` reports `[PASS]`, exits `0` as a demo command, and ends its enclosed CLI stream on the grouped refusal from an invocation that exited `1`.
- `npm --prefix cli run demo -- --scenario 21-list --no-color` reports `[PASS]`.
- `npm --prefix cli run demo -- --list` lists `20-temporary-workspace-refusal` immediately before `21-list`.
- A one-off Node comparison of sorted `cli/scripts/scenarios/*.mjs` stems with the Scenario-column IDs in `cli/README.md` exits `0`.
- `npm --prefix cli run check` exits `0`.

**Acceptance criteria:**

- One scenario shows both failure groups and both correction blocks in one invocation at declared exit code `1`.
- The scenario removes ignore coverage for two workspaces and adds tracked content under the still-ignore-covered third workspace.
- The README, `--list`, and on-disk catalog agree, with the aggregate listing last.
- `cli/AGENTS.md` records the structured-refusal scenario boundary.

**Consumes:** the complete refusal from `checkTemporaryWorkspaces(...)` produced by Task 1 and the run-command preflight produced by Task 2.

**Produces:** demo scenario `20-temporary-workspace-refusal`, renamed aggregate scenario `21-list`, its README row, and the structured-preflight-refusal scenario boundary in `cli/AGENTS.md`.
