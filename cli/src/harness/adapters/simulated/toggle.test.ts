import { describe, expect, it } from "vitest";

import {
  SIMULATED_HARNESS_TOGGLE_VAR,
  interpretSimulatedHarnessToggle,
} from "./toggle.js";

describe("interpretSimulatedHarnessToggle", () => {
  const cases: {
    label: string;
    env: NodeJS.ProcessEnv;
    expected:
      | { mode: "real" }
      | { mode: "simulated" }
      | { mode: "error"; contains: string[] };
  }[] = [
    { label: "unset", env: {}, expected: { mode: "real" } },
    {
      label: "empty string",
      env: { [SIMULATED_HARNESS_TOGGLE_VAR]: "" },
      expected: { mode: "real" },
    },
    {
      label: "exact 1",
      env: { [SIMULATED_HARNESS_TOGGLE_VAR]: "1" },
      expected: { mode: "simulated" },
    },
    {
      label: "true",
      env: { [SIMULATED_HARNESS_TOGGLE_VAR]: "true" },
      expected: {
        mode: "error",
        contains: [SIMULATED_HARNESS_TOGGLE_VAR, '"1"', '"true"'],
      },
    },
    {
      label: "0",
      env: { [SIMULATED_HARNESS_TOGGLE_VAR]: "0" },
      expected: {
        mode: "error",
        contains: [SIMULATED_HARNESS_TOGGLE_VAR, '"1"', '"0"'],
      },
    },
    {
      label: "yes",
      env: { [SIMULATED_HARNESS_TOGGLE_VAR]: "yes" },
      expected: {
        mode: "error",
        contains: [SIMULATED_HARNESS_TOGGLE_VAR, '"1"', '"yes"'],
      },
    },
  ];

  it.each(cases)("$label", ({ env, expected }) => {
    const result = interpretSimulatedHarnessToggle(env);
    if (expected.mode === "error") {
      expect(result).toEqual({ mode: "error", message: expect.any(String) });
      if (result.mode !== "error") return;
      for (const fragment of expected.contains) {
        expect(result.message).toContain(fragment);
      }
      return;
    }
    expect(result).toEqual(expected);
  });
});
