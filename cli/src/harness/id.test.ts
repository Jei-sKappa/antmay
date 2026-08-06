import { describe, expect, it } from "vitest";

import { HARNESS_IDS, isHarnessId } from "./id.js";

describe("the harness id vocabulary", () => {
  // The contents and their order are what user-facing diagnostics list and what
  // the provider registry is held total over, so they are pinned here rather than
  // derived from the module under test: adding or reordering an id has to be done
  // deliberately, in two places.
  it("declares both ids in diagnostic order", () => {
    expect(HARNESS_IDS).toEqual(["codex", "claude-code"]);
  });

  it("recognizes exactly the declared ids", () => {
    for (const id of HARNESS_IDS) {
      expect(isHarnessId(id)).toBe(true);
    }
    for (const value of ["", "Codex", "claude", "claude-code ", "gemini"]) {
      expect(isHarnessId(value), `"${value}" is not an id`).toBe(false);
    }
  });

  it("rejects a value that is not a string", () => {
    for (const value of [null, undefined, 0, true, ["codex"], { codex: true }]) {
      expect(isHarnessId(value), `${JSON.stringify(value)} is not an id`).toBe(false);
    }
  });
});
