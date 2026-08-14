import { describe, expect, it } from "vitest";

import type { AgentBinding } from "../binding/types.js";
import { validateProfileDocument } from "./validate.js";

const CODEX: AgentBinding = { harness: "codex", model: "gpt-5.6-sol" };

function errorsFor(document: unknown): string[] {
  const result = validateProfileDocument(document);
  if (result.ok) {
    throw new Error("expected the profile document to be rejected");
  }
  return result.errors;
}

describe("the execution profile envelope", () => {
  it("accepts the canonical document and keeps its declared identity", () => {
    expect(
      validateProfileDocument({
        schemaVersion: 0,
        name: "maximum-quality",
        stages: {
          spec: { agent: CODEX, idleTimeoutSeconds: 86400, heartbeatSeconds: 300 },
        },
      }),
    ).toEqual({
      ok: true,
      profile: {
        name: "maximum-quality",
        stages: {
          spec: { agent: CODEX, idleTimeoutSeconds: 86400, heartbeatSeconds: 300 },
        },
      },
    });
  });

  const rootCases = [
    {
      label: "a missing schemaVersion",
      document: { name: "p", stages: { spec: { agent: CODEX } } },
      contains: "schemaVersion is required",
    },
    {
      label: "a future schemaVersion",
      document: { schemaVersion: 1, name: "p", stages: { spec: { agent: CODEX } } },
      contains: "schemaVersion must be 0",
    },
    {
      label: "a stringly typed schemaVersion",
      document: {
        schemaVersion: "0",
        name: "p",
        stages: { spec: { agent: CODEX } },
      },
      contains: "schemaVersion must be 0",
    },
    {
      label: "a missing name",
      document: { schemaVersion: 0, stages: { spec: { agent: CODEX } } },
      contains: "name is required",
    },
    {
      label: "an invalid name",
      document: {
        schemaVersion: 0,
        name: "Maximum Quality",
        stages: { spec: { agent: CODEX } },
      },
      contains: "name must be a string matching",
    },
    {
      label: "a missing stages map",
      document: { schemaVersion: 0, name: "p" },
      contains: "stages is required",
    },
    {
      label: "an empty stages map",
      document: { schemaVersion: 0, name: "p", stages: {} },
      contains: "stages must bind at least one stage",
    },
    {
      label: "an unknown root field",
      document: {
        schemaVersion: 0,
        name: "p",
        stages: { spec: { agent: CODEX } },
        defaults: { agent: CODEX },
      },
      contains: "defaults is not a recognized execution profile field",
    },
    {
      label: "a non-object root",
      document: [],
      contains: "root must be an object",
    },
  ];

  it.each(rootCases)("rejects $label", ({ document, contains }) => {
    expect(errorsFor(document).join("\n")).toContain(contains);
  });

  it.each(["Standard", "-p", "p-", "p--q", "p_q", ""])(
    "rejects the declared name %j",
    (name) => {
      expect(
        errorsFor({
          schemaVersion: 0,
          name,
          stages: { spec: { agent: CODEX } },
        }).join("\n"),
      ).toContain("name must be a string matching");
    },
  );

  it("reports an empty stage map in place, among the envelope's own problems", () => {
    expect(
      errorsFor({ schemaVersion: 1, name: "Bad Name", stages: {} }),
    ).toEqual([
      "schemaVersion must be 0.",
      "name must be a string matching ^[a-z0-9]+(?:-[a-z0-9]+)*$.",
      "stages must bind at least one stage.",
    ]);
  });

  it("says nothing about emptiness when the container is not a map", () => {
    expect(errorsFor({ schemaVersion: 0, name: "p", stages: [] })).toEqual([
      "stages must be an object.",
    ]);
  });
});

describe("the base path a profile hands the shared schema", () => {
  it("names every stage-binding problem under stages, after the envelope's", () => {
    expect(
      errorsFor({
        schemaVersion: 1,
        name: "Bad Name",
        stages: {
          spec: { agent: { harness: "codex" }, instructions: "x" },
          propose: { agent: CODEX },
        },
        defaults: {},
      }),
    ).toEqual([
      "defaults is not a recognized execution profile field.",
      "schemaVersion must be 0.",
      "name must be a string matching ^[a-z0-9]+(?:-[a-z0-9]+)*$.",
      "stages.spec.instructions is not a recognized stage binding field.",
      "stages.spec.agent.model is required.",
      "stages.propose is not a supported catalog stage ID.",
    ]);
  });
});
