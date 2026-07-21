import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type AttachmentHandle,
  asAttachmentHandle,
  asRunId,
  type RepositoryPath,
  type RunId,
  type RunRecord,
  transcriptTerminalOutcome,
} from "@antmay/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
  ExecutionAdapter,
  LivenessResult,
  ReadResult,
} from "../src/adapters/types";
import {
  type ReconcileRunDeps,
  reconcileRun,
} from "../src/observer/reconcile-run";
import {
  canonicalizeRepositoryPath,
  FilesystemRegistryStore,
} from "../src/state/registry-store";
import { resolveStateRoot } from "../src/state/root";
import {
  finalEvidence,
  pendingEvidence,
  type TranscriptEvidence,
  unavailableEvidence,
} from "../src/transcripts/types";

let sandbox: string;

beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), "antmay-reconcile-"));
});

afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

function makeStore(): FilesystemRegistryStore {
  return new FilesystemRegistryStore(
    resolveStateRoot({ ANTMAY_STATE_HOME: join(sandbox, "state") }),
  );
}

function makeRepo(): RepositoryPath {
  const dir = join(sandbox, "repo");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "README.md"), "# repo\n", "utf8");
  return canonicalizeRepositoryPath(dir);
}

function activeRecord(
  repositoryPath: RepositoryPath,
  overrides: Partial<RunRecord> = {},
): RunRecord {
  return {
    id: asRunId("run-0001"),
    repositoryPath,
    threadPath:
      `${repositoryPath}/docs/threads/260718155545Z-x` as RunRecord["threadPath"],
    skill: "implement",
    harness: "claude",
    adapter: "herdr",
    session: { kind: "pinned", id: "session-uuid" },
    attachment: { available: true, handle: asAttachmentHandle("w1:p1") },
    classification: "active",
    reason: null,
    workerHealth: { state: "healthy", detail: null },
    ...overrides,
  };
}

type AdapterBehavior = {
  liveness?: (handle: AttachmentHandle) => LivenessResult;
};

// A read-only-liveness adapter that records any mutating call. reconcileRun must
// never mutate the retained pane, so every mutating spy must stay untouched.
class ObservingAdapter implements ExecutionAdapter {
  readonly name = "herdr" as const;
  readonly mutations: string[] = [];
  livenessProbes = 0;

  constructor(private readonly behavior: AdapterBehavior = {}) {}

  spawn(): never {
    this.mutations.push("spawn");
    throw new Error("spawn must never be called during reconciliation");
  }
  send(): void {
    this.mutations.push("send");
  }
  read(): ReadResult {
    this.mutations.push("read");
    return { output: "" };
  }
  liveness(handle: AttachmentHandle): LivenessResult {
    this.livenessProbes += 1;
    return this.behavior.liveness?.(handle) ?? { alive: true };
  }
  enumerate(): readonly AttachmentHandle[] {
    return [];
  }
  attach(): void {
    this.mutations.push("attach");
  }
}

function deps(
  store: FilesystemRegistryStore,
  adapter: ExecutionAdapter,
  evidence: TranscriptEvidence,
): ReconcileRunDeps {
  return { store, adapter, readEvidence: () => evidence };
}

const RUN = asRunId("run-0001") as RunId;

describe("reconcileRun", () => {
  it("finalizes a reliable transcript DONE into an immutable record", () => {
    const store = makeStore();
    const repo = makeRepo();
    store.register(activeRecord(repo));
    const adapter = new ObservingAdapter();
    const outcome = transcriptTerminalOutcome("done", "shipped it");

    const result = reconcileRun(
      RUN,
      deps(store, adapter, finalEvidence(outcome)),
    );

    expect(result.terminalized).toBe(true);
    expect(result.record.classification).toBe("done");
    expect(result.record.reason).toBe("shipped it");
    expect(adapter.mutations).toEqual([]);
  });

  it.each(["blocked", "refused"] as const)(
    "finalizes a reliable transcript %s outcome with its reason",
    (kind) => {
      const store = makeStore();
      const repo = makeRepo();
      store.register(activeRecord(repo));
      const outcome = transcriptTerminalOutcome(kind, `${kind}: needs input`);

      const result = reconcileRun(
        RUN,
        deps(store, new ObservingAdapter(), finalEvidence(outcome)),
      );

      expect(result.record.classification).toBe(kind);
      expect(result.record.reason).toBe(`${kind}: needs input`);
    },
  );

  it("is idempotent: a duplicate reconciliation yields one terminal record", () => {
    const store = makeStore();
    const repo = makeRepo();
    store.register(activeRecord(repo));
    const outcome = transcriptTerminalOutcome("done", "shipped it");

    const first = reconcileRun(
      RUN,
      deps(store, new ObservingAdapter(), finalEvidence(outcome)),
    );
    // A later reconciliation seeing an entirely different signal must not
    // regress or rewrite the already-terminal record.
    const second = reconcileRun(
      RUN,
      deps(store, new ObservingAdapter(), pendingEvidence("still running?")),
    );

    expect(first.terminalized).toBe(true);
    expect(second.terminalized).toBe(false);
    expect(second.record.classification).toBe("done");
    expect(second.record.reason).toBe("shipped it");
  });

  it("leaves the run active and degraded on a transient transcript failure", () => {
    const store = makeStore();
    const repo = makeRepo();
    store.register(activeRecord(repo));

    const result = reconcileRun(
      RUN,
      deps(
        store,
        new ObservingAdapter(),
        unavailableEvidence("transcript missing"),
      ),
    );

    expect(result.terminalized).toBe(false);
    expect(result.record.classification).toBe("active");
    expect(result.health.state).toBe("degraded");
    expect(result.diagnostic).toBe("transcript missing");
  });

  it("leaves the run active and degraded on a transient adapter failure", () => {
    const store = makeStore();
    const repo = makeRepo();
    store.register(activeRecord(repo));
    const adapter = new ObservingAdapter({
      liveness: () => {
        throw new Error("herdr unreachable");
      },
    });

    const result = reconcileRun(
      RUN,
      deps(store, adapter, pendingEvidence("no outcome yet")),
    );

    expect(result.record.classification).toBe("active");
    expect(result.health.state).toBe("degraded");
    expect(result.health.detail).toContain("herdr unreachable");
  });

  it("yields unknown only after positive endpoint end without a reliable outcome", () => {
    const store = makeStore();
    const repo = makeRepo();
    store.register(activeRecord(repo));
    const adapter = new ObservingAdapter({
      liveness: () => ({ alive: false }),
    });

    const result = reconcileRun(
      RUN,
      deps(store, adapter, pendingEvidence("no outcome and never will be")),
    );

    expect(result.terminalized).toBe(true);
    expect(result.record.classification).toBe("unknown");
    expect(result.record.reason).toBeNull();
    // Even while confirming the end, reconciliation never mutates the pane.
    expect(adapter.mutations).toEqual([]);
  });

  it("keeps a live run active when the endpoint is alive and no outcome exists", () => {
    const store = makeStore();
    const repo = makeRepo();
    store.register(activeRecord(repo));
    const adapter = new ObservingAdapter({ liveness: () => ({ alive: true }) });

    const result = reconcileRun(
      RUN,
      deps(store, adapter, pendingEvidence("no outcome yet")),
    );

    expect(result.record.classification).toBe("active");
    expect(result.health.state).toBe("healthy");
    expect(adapter.livenessProbes).toBe(1);
  });

  it("never mutates the retained pane across any terminal classification", () => {
    const store = makeStore();
    const repo = makeRepo();
    store.register(activeRecord(repo));
    const adapter = new ObservingAdapter({
      liveness: () => ({ alive: false }),
    });
    const outcome = transcriptTerminalOutcome("done", "shipped it");

    reconcileRun(RUN, deps(store, adapter, finalEvidence(outcome)));

    expect(adapter.mutations).toEqual([]);
  });
});
