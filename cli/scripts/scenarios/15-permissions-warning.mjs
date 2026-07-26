import { standardScenario } from "../demo/recipe.mjs";
import { run } from "../demo/steps.mjs";

/**
 * The same complete run as `all-done`, started with unrestricted permissions.
 * Opens on the boxed yellow warning that leads the startup output whenever the
 * persisted permission choice is unrestricted, and the run details block then
 * reports that choice on its `Permissions` line.
 *
 * Scripted mode never contacts a provider, so nothing here actually runs
 * unrestricted — only the rendering does.
 */
export default {
  label: "Unrestricted permissions — opens on the boxed warning",
  scenario: standardScenario(),
  steps: [run({ expectExit: 0, flags: ["--dangerously-skip-permissions"] })],
};
