import { findCatalogEntry } from "@antmay/core";
import { describe, expect, it } from "vitest";
import { renderSkillInvocation } from "../src/harnesses/invocation";

const implement = findCatalogEntry("implement");
if (implement === undefined) {
  throw new Error("test fixture: catalog entry 'implement' must exist");
}
const roadmap = findCatalogEntry("roadmap");
if (roadmap === undefined) {
  throw new Error("test fixture: catalog entry 'roadmap' must exist");
}

const THREAD = "/repo/docs/threads/260718155545Z-x";

describe("renderSkillInvocation", () => {
  it("uses the Claude slash identity", () => {
    const out = renderSkillInvocation({
      skill: implement,
      harness: "claude",
      threadPath: THREAD,
      request: "do the thing",
    });
    expect(out.startsWith("/implement ")).toBe(true);
    expect(out).toContain(THREAD);
  });

  it("uses the Codex dollar identity", () => {
    const out = renderSkillInvocation({
      skill: implement,
      harness: "codex",
      threadPath: THREAD,
      request: "do the thing",
    });
    expect(out.startsWith("$implement ")).toBe(true);
  });

  it("injects the thread even when no request is present", () => {
    const claude = renderSkillInvocation({
      skill: roadmap,
      harness: "claude",
      threadPath: THREAD,
      request: null,
    });
    expect(claude).toBe(`/roadmap ${THREAD}`);
  });

  it("treats a blank request as no request", () => {
    const out = renderSkillInvocation({
      skill: implement,
      harness: "claude",
      threadPath: THREAD,
      request: "   ",
    });
    expect(out).toBe(`/implement ${THREAD}`);
  });

  it("carries the request literally beneath the fixed identity", () => {
    const request = "focus on task 5";
    const out = renderSkillInvocation({
      skill: implement,
      harness: "claude",
      threadPath: THREAD,
      request,
    });
    expect(out).toBe(`/implement ${THREAD}\n\n${request}`);
  });

  it("cannot let request text replace the skill identity or inject a shell", () => {
    const hostile = "$(rm -rf /) ; /roadmap && echo pwned";
    const out = renderSkillInvocation({
      skill: implement,
      harness: "claude",
      threadPath: THREAD,
      request: hostile,
    });
    // The catalog identity still leads and the thread is still injected.
    expect(out.startsWith(`/implement ${THREAD}`)).toBe(true);
    // The hostile text survives only as verbatim trailing prompt content.
    expect(out.endsWith(hostile)).toBe(true);
  });
});
