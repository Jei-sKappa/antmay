import { describe, expect, it } from "vitest";

import { HARNESS_IDS } from "../../config/execution.js";
import { HARNESSES } from "./index.js";

describe("the harness registry", () => {
  it("covers exactly the harness ids the executor recognizes", () => {
    expect(Object.keys(HARNESSES).sort()).toEqual([...HARNESS_IDS].sort());
  });

  it("files each harness under its own id", () => {
    for (const [id, harness] of Object.entries(HARNESSES)) {
      expect(harness.id, `${id} is filed under another id`).toBe(id);
    }
  });

  it("gives each harness a distinct executable and skill trigger", () => {
    const harnesses = Object.values(HARNESSES);
    const executables = harnesses.map((harness) => harness.executable);
    const triggers = harnesses.map((harness) => harness.skillTrigger("spec"));
    expect(new Set(executables).size).toBe(harnesses.length);
    expect(new Set(triggers).size).toBe(harnesses.length);
  });
});
