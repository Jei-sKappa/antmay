import { describe, expect, it } from "vitest";

import { parseTerminalOutcome } from "./outcome.js";

describe("parseTerminalOutcome", () => {
  it("parses a bare token with empty detail", () => {
    expect(parseTerminalOutcome("Outcome: DONE")).toEqual({
      token: "DONE",
      candidateLine: "Outcome: DONE",
      detail: "",
    });
  });

  it("parses an em-dash detail form", () => {
    expect(parseTerminalOutcome("Outcome: BLOCKED — needs a human")).toEqual({
      token: "BLOCKED",
      candidateLine: "Outcome: BLOCKED — needs a human",
      detail: "— needs a human",
    });
  });

  it("parses plain trailing text as detail", () => {
    expect(parseTerminalOutcome("Outcome: REFUSED dirty worktree")).toEqual({
      token: "REFUSED",
      candidateLine: "Outcome: REFUSED dirty worktree",
      detail: "dirty worktree",
    });
  });

  it("ignores trailing blank lines and normalizes CRLF endings", () => {
    const text = "some log\r\nOutcome: DONE — shipped\r\n\r\n  \r\n";
    expect(parseTerminalOutcome(text)).toEqual({
      token: "DONE",
      candidateLine: "Outcome: DONE — shipped",
      detail: "— shipped",
    });
  });

  it("normalizes lone CR endings", () => {
    expect(parseTerminalOutcome("line one\rOutcome: DONE\r")).toEqual({
      token: "DONE",
      candidateLine: "Outcome: DONE",
      detail: "",
    });
  });

  it("ignores an earlier Outcome: DONE when the final line differs", () => {
    const text = "Outcome: DONE\nmore work happened after\nOutcome: BLOCKED — retry";
    expect(parseTerminalOutcome(text)).toEqual({
      token: "BLOCKED",
      candidateLine: "Outcome: BLOCKED — retry",
      detail: "— retry",
    });
  });

  it("does not advance on an earlier DONE when the final line is plain text", () => {
    const text = "Outcome: DONE\nthen the agent kept talking";
    expect(parseTerminalOutcome(text)).toEqual({
      token: null,
      candidateLine: "then the agent kept talking",
    });
  });

  it("rejects a lowercase token", () => {
    expect(parseTerminalOutcome("outcome: done")).toEqual({
      token: null,
      candidateLine: "outcome: done",
    });
  });

  it("rejects a prefixed token", () => {
    expect(parseTerminalOutcome("Final Outcome: DONE")).toEqual({
      token: null,
      candidateLine: "Final Outcome: DONE",
    });
  });

  it("rejects a mid-line token", () => {
    expect(parseTerminalOutcome("The Outcome: DONE was reached")).toEqual({
      token: null,
      candidateLine: "The Outcome: DONE was reached",
    });
  });

  it("rejects an unrecognized token word", () => {
    expect(parseTerminalOutcome("Outcome: MAYBE")).toEqual({
      token: null,
      candidateLine: "Outcome: MAYBE",
    });
  });

  it("rejects a token immediately followed by a word character (word boundary)", () => {
    expect(parseTerminalOutcome("Outcome: DONELY")).toEqual({
      token: null,
      candidateLine: "Outcome: DONELY",
    });
  });

  it("returns a null candidate for whitespace-only text", () => {
    expect(parseTerminalOutcome("   \n\r\n  \t  ")).toEqual({
      token: null,
      candidateLine: null,
    });
  });

  it("returns a null candidate for empty text", () => {
    expect(parseTerminalOutcome("")).toEqual({
      token: null,
      candidateLine: null,
    });
  });
});
