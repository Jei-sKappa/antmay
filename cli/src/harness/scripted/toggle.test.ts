import { describe, expect, it } from "vitest";

import {
  SCRIPTED_HARNESS_TOGGLE_VAR,
  interpretScriptedHarnessToggle,
} from "./toggle.js";

describe("interpretScriptedHarnessToggle", () => {
  const cases: {
    label: string;
    env: NodeJS.ProcessEnv;
    expected:
      | { mode: "real" }
      | { mode: "scripted" }
      | { mode: "error"; contains: string[] };
  }[] = [
    { label: "unset", env: {}, expected: { mode: "real" } },
    {
      label: "empty string",
      env: { [SCRIPTED_HARNESS_TOGGLE_VAR]: "" },
      expected: { mode: "real" },
    },
    {
      label: "exact 1",
      env: { [SCRIPTED_HARNESS_TOGGLE_VAR]: "1" },
      expected: { mode: "scripted" },
    },
    {
      label: "true",
      env: { [SCRIPTED_HARNESS_TOGGLE_VAR]: "true" },
      expected: {
        mode: "error",
        contains: [SCRIPTED_HARNESS_TOGGLE_VAR, '"1"', '"true"'],
      },
    },
    {
      label: "0",
      env: { [SCRIPTED_HARNESS_TOGGLE_VAR]: "0" },
      expected: {
        mode: "error",
        contains: [SCRIPTED_HARNESS_TOGGLE_VAR, '"1"', '"0"'],
      },
    },
    {
      label: "yes",
      env: { [SCRIPTED_HARNESS_TOGGLE_VAR]: "yes" },
      expected: {
        mode: "error",
        contains: [SCRIPTED_HARNESS_TOGGLE_VAR, '"1"', '"yes"'],
      },
    },
  ];

  it.each(cases)("$label", ({ env, expected }) => {
    const result = interpretScriptedHarnessToggle(env);
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
