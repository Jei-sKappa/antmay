import {
  type AttachmentHandle,
  asAttachmentHandle,
  asRepositoryPath,
  asRunId,
  asThreadPath,
  type RunClassification,
  type RunRecord,
} from "@antmay/core";
import { describe, expect, it } from "vitest";
import {
  attachableCandidates,
  selectContextualRun,
} from "../src/attach/select-run";

const REPO = asRepositoryPath("/canonical/repo");
const THREAD = asThreadPath("/canonical/repo/docs/threads/260718155545Z-x");

function run(
  id: string,
  overrides: {
    handle?: string | null;
    classification?: RunClassification;
  } = {},
): RunRecord {
  const handle = overrides.handle === undefined ? "w1:p1" : overrides.handle;
  return {
    id: asRunId(id),
    repositoryPath: REPO,
    threadPath: THREAD,
    skill: "propose",
    harness: "claude",
    adapter: "herdr",
    session: { kind: "pinned", id: "s" },
    attachment: {
      available: handle !== null,
      handle: handle === null ? null : asAttachmentHandle(handle),
    },
    classification: overrides.classification ?? "active",
    reason: null,
    workerHealth: { state: "healthy", detail: null },
  };
}

const allAlive = (_handle: AttachmentHandle): boolean => true;
const noneAlive = (_handle: AttachmentHandle): boolean => false;

describe("attachableCandidates", () => {
  it("keeps only records whose pane the adapter reports alive", () => {
    const alive = run("alive", { handle: "w1:p1" });
    const dead = run("dead", { handle: "w1:p2" });
    const candidates = attachableCandidates(
      [alive, dead],
      (handle) => handle === asAttachmentHandle("w1:p1"),
    );
    expect(candidates.map((c) => c.record.id)).toEqual([asRunId("alive")]);
    expect(candidates[0]?.handle).toBe(asAttachmentHandle("w1:p1"));
  });

  it("skips records without a recorded handle without probing", () => {
    let probes = 0;
    const candidates = attachableCandidates(
      [run("no-handle", { handle: null })],
      () => {
        probes += 1;
        return true;
      },
    );
    expect(candidates).toEqual([]);
    expect(probes).toBe(0);
  });

  it("keeps both an active and a terminal run whose panes remain alive", () => {
    const active = run("active", { classification: "active", handle: "w1:p1" });
    const terminal = run("done", { classification: "done", handle: "w1:p2" });
    const candidates = attachableCandidates([active, terminal], allAlive);
    expect(candidates.map((c) => c.record.id)).toEqual([
      asRunId("active"),
      asRunId("done"),
    ]);
  });
});

describe("selectContextualRun", () => {
  it("returns the sole attachable candidate directly", () => {
    const selection = selectContextualRun(
      [run("only", { handle: "w1:p1" }), run("dead", { handle: "w1:p2" })],
      (handle) => handle === asAttachmentHandle("w1:p1"),
    );
    expect(selection.kind).toBe("single");
    if (selection.kind === "single") {
      expect(selection.candidate.record.id).toBe(asRunId("only"));
    }
  });

  it("reports none when nothing is attachable", () => {
    const selection = selectContextualRun([run("a"), run("b")], noneAlive);
    expect(selection).toEqual({ kind: "none" });
  });

  it("reports ambiguous with every candidate when several are attachable", () => {
    const selection = selectContextualRun(
      [run("a", { handle: "w1:p1" }), run("b", { handle: "w1:p2" })],
      allAlive,
    );
    expect(selection.kind).toBe("ambiguous");
    if (selection.kind === "ambiguous") {
      expect(selection.candidates.map((c) => c.record.id)).toEqual([
        asRunId("a"),
        asRunId("b"),
      ]);
    }
  });
});
