import {
  ANTMAY_SKILL_CATALOG,
  type CatalogEntry,
  findCatalogEntry,
  isCatalogSkill,
  type RequestPosture,
  validateRequestPosture,
  validateSkillRequest,
} from "@antmay/core";
import { describe, expect, it } from "vitest";

// The exact eighteen v0 catalog entries from spec.md §3.4, transcribed as
// [catalog name, request posture]. Native identities are `/<name>` (Claude)
// and `$<name>` (Codex).
const EXPECTED: ReadonlyArray<readonly [string, RequestPosture]> = [
  ["implement", "required"],
  ["implement-plan", "optional"],
  ["implement-plan-with-subagents", "optional"],
  ["materialize-roadmap-threads", "forbidden"],
  ["merge-artifacts", "required"],
  ["plan-brief", "optional"],
  ["plan-strict", "optional"],
  ["propose", "optional"],
  ["reconcile-plan", "forbidden"],
  ["reconcile-proposal", "forbidden"],
  ["reconcile-roadmap", "forbidden"],
  ["reconcile-spec", "forbidden"],
  ["review-code", "required"],
  ["review-implementation", "required"],
  ["review-roadmap", "forbidden"],
  ["review-spec", "forbidden"],
  ["roadmap", "forbidden"],
  ["spec", "optional"],
];

describe("catalog exactness", () => {
  it("contains exactly the eighteen specified entries in order", () => {
    expect(ANTMAY_SKILL_CATALOG).toHaveLength(18);
    const actual = ANTMAY_SKILL_CATALOG.map(
      (entry): [string, RequestPosture] => [entry.name, entry.requestPosture],
    );
    expect(actual).toEqual(EXPECTED.map(([name, posture]) => [name, posture]));
  });

  it("pins the Claude /name and Codex $name identities for each entry", () => {
    for (const entry of ANTMAY_SKILL_CATALOG) {
      expect(entry.claudeIdentity).toBe(`/${entry.name}`);
      expect(entry.codexIdentity).toBe(`$${entry.name}`);
    }
  });

  it("has no duplicate catalog names", () => {
    const names = new Set(ANTMAY_SKILL_CATALOG.map((entry) => entry.name));
    expect(names.size).toBe(ANTMAY_SKILL_CATALOG.length);
  });
});

describe("catalog lookup", () => {
  it("resolves an exact member and rejects non-members", () => {
    const entry = findCatalogEntry("implement");
    expect(entry?.name).toBe("implement");
    expect(isCatalogSkill("implement")).toBe(true);
    expect(findCatalogEntry("discussion")).toBeUndefined();
    expect(isCatalogSkill("discussion")).toBe(false);
    expect(isCatalogSkill("/implement")).toBe(false);
  });
});

function entryFor(name: string): CatalogEntry {
  const entry = findCatalogEntry(name);
  if (entry === undefined) {
    throw new Error(`test fixture references unknown skill ${name}`);
  }
  return entry;
}

describe("request posture validation", () => {
  it("requires a non-empty request for required entries", () => {
    expect(validateRequestPosture(entryFor("implement"), "do it").ok).toBe(
      true,
    );
    expect(validateRequestPosture(entryFor("implement"), undefined)).toEqual({
      ok: false,
      reason: expect.stringContaining("requires a non-empty --request"),
    });
    expect(validateRequestPosture(entryFor("implement"), "   ").ok).toBe(false);
  });

  it("accepts present or absent requests for optional entries", () => {
    expect(validateRequestPosture(entryFor("propose"), undefined).ok).toBe(
      true,
    );
    expect(validateRequestPosture(entryFor("propose"), "narrow it").ok).toBe(
      true,
    );
  });

  it("rejects any supplied request for forbidden entries", () => {
    expect(validateRequestPosture(entryFor("roadmap"), undefined).ok).toBe(
      true,
    );
    expect(validateRequestPosture(entryFor("roadmap"), "anything")).toEqual({
      ok: false,
      reason: expect.stringContaining("rejects --request"),
    });
    expect(validateRequestPosture(entryFor("roadmap"), "").ok).toBe(false);
  });

  it("reports an unknown catalog name through the by-name validator", () => {
    expect(validateSkillRequest("nope", "x")).toEqual({
      ok: false,
      reason: expect.stringContaining('Unknown catalog skill "nope"'),
    });
    expect(validateSkillRequest("implement", "do it").ok).toBe(true);
  });
});
