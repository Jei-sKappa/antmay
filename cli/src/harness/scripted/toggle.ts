/**
 * The sole environment variable that enables scripted harness mode for `run` and
 * `resume`. No other test-mode toggle exists.
 */
export const SCRIPTED_HARNESS_TOGGLE_VAR = "ANTMAY_TEST_ENABLE_SCRIPTED_HARNESS";

export type ScriptedHarnessToggleMode =
  | { mode: "real" }
  | { mode: "scripted" }
  | { mode: "error"; message: string };

function readToggleValue(env: NodeJS.ProcessEnv): string | undefined {
  const value = env[SCRIPTED_HARNESS_TOGGLE_VAR];
  if (value === undefined || value === "") {
    return undefined;
  }
  return value;
}

/**
 * Interpret `ANTMAY_TEST_ENABLE_SCRIPTED_HARNESS`. Unset or empty selects real
 * mode; the exact string `1` selects scripted mode; every other non-empty value
 * is a configuration error naming the variable and accepted value.
 *
 * Reading the toggle is what every run does and the one thing selecting a
 * runtime needs from the scripted family, so it is the whole of what this module
 * holds: the scenario schema and its validator sit behind the family's own
 * deferred entry points, and a real run loads neither.
 */
export function interpretScriptedHarnessToggle(
  env: NodeJS.ProcessEnv,
): ScriptedHarnessToggleMode {
  const value = readToggleValue(env);
  if (value === undefined) {
    return { mode: "real" };
  }
  if (value === "1") {
    return { mode: "scripted" };
  }
  return {
    mode: "error",
    message: `${SCRIPTED_HARNESS_TOGGLE_VAR} must be exactly "1" to enable scripted harness mode, got: ${JSON.stringify(value)}`,
  };
}
