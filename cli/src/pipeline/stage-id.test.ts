import { describe, expect, it } from "vitest";

import { CATALOG_STAGE_IDS, isCatalogStageId } from "./stage-id.js";

describe("catalog-stage identity", () => {
  it("owns the exact release stage set in catalog order", () => {
    expect(CATALOG_STAGE_IDS).toEqual([
      "spec",
      "reconcile-spec",
      "review-spec",
      "plan-brief",
      "plan-strict",
      "reconcile-plan",
      "implement",
      "implement-plan",
      "implement-plan-with-subagents",
    ]);
  });

  it("recognizes every catalog ID", () => {
    for (const id of CATALOG_STAGE_IDS) {
      expect(isCatalogStageId(id)).toBe(true);
    }
  });

  it.each([
    "",
    "Spec",
    "toString",
    "propose",
    "reconcile-proposal",
    "roadmap",
    "reconcile-roadmap",
    "review-roadmap",
  ])("rejects the non-catalog ID %j", (value) => {
    expect(isCatalogStageId(value)).toBe(false);
  });
});
