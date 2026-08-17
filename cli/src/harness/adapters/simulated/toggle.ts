/**
 * The sole environment variable that enables simulated harness mode for `run`
 * and `resume`. No other developer-mode toggle exists.
 */
export const SIMULATED_HARNESS_TOGGLE_VAR = "ANTMAY_SIMULATED_HARNESS";

export type SimulatedHarnessToggleMode =
  | { mode: "real" }
  | { mode: "simulated" }
  | { mode: "error"; message: string };

function readToggleValue(env: NodeJS.ProcessEnv): string | undefined {
  const value = env[SIMULATED_HARNESS_TOGGLE_VAR];
  if (value === undefined || value === "") {
    return undefined;
  }
  return value;
}

/**
 * Interpret `ANTMAY_SIMULATED_HARNESS`. Unset or empty selects real mode; the
 * exact string `1` selects simulated mode; every other non-empty value is a
 * configuration error naming the variable and accepted value.
 *
 * Reading the toggle is what every run does and the one thing selecting a
 * runtime needs from the simulated family, so it is the whole of what this
 * module holds: the scenario schema and its validator sit behind the family's
 * own deferred entry points, and a real run loads neither.
 */
export function interpretSimulatedHarnessToggle(
  env: NodeJS.ProcessEnv,
): SimulatedHarnessToggleMode {
  const value = readToggleValue(env);
  if (value === undefined) {
    return { mode: "real" };
  }
  if (value === "1") {
    return { mode: "simulated" };
  }
  return {
    mode: "error",
    message: `${SIMULATED_HARNESS_TOGGLE_VAR} must be exactly "1" to enable simulated harness mode, got: ${JSON.stringify(value)}`,
  };
}
