import { parseTerminalOutcome } from "@antmay/core";
import { describe, expect, it } from "vitest";

describe("parseTerminalOutcome recognizes genuine anchored lines", () => {
  it("recognizes DONE, BLOCKED, and REFUSED with their complete reasons", () => {
    expect(parseTerminalOutcome("Outcome: DONE — shipped the change")).toEqual({
      classification: "done",
      reason: "shipped the change",
    });
    expect(
      parseTerminalOutcome("Outcome: BLOCKED — missing an approved decision"),
    ).toEqual({
      classification: "blocked",
      reason: "missing an approved decision",
    });
    expect(
      parseTerminalOutcome("Outcome: REFUSED — request is out of scope"),
    ).toEqual({
      classification: "refused",
      reason: "request is out of scope",
    });
  });

  it("finds the anchored line among surrounding prose", () => {
    const text = [
      "Here is my summary of the work.",
      "Everything is verified and tested.",
      "",
      "Outcome: DONE — implemented and verified the change",
    ].join("\n");
    expect(parseTerminalOutcome(text)).toEqual({
      classification: "done",
      reason: "implemented and verified the change",
    });
  });

  it("keeps the complete reason including embedded punctuation and em dashes", () => {
    expect(
      parseTerminalOutcome(
        "Outcome: BLOCKED — waiting on DR7 — the notify sink is undecided",
      ),
    ).toEqual({
      classification: "blocked",
      reason: "waiting on DR7 — the notify sink is undecided",
    });
  });

  it("takes the last anchored line when several appear", () => {
    const text = [
      "Outcome: BLOCKED — first attempt stalled",
      "Retried and finished.",
      "Outcome: DONE — second attempt succeeded",
    ].join("\n");
    expect(parseTerminalOutcome(text)).toEqual({
      classification: "done",
      reason: "second attempt succeeded",
    });
  });

  it("tolerates a trailing carriage return and trailing spaces", () => {
    expect(parseTerminalOutcome("Outcome: DONE — done here  \r")).toEqual({
      classification: "done",
      reason: "done here",
    });
  });
});

describe("parseTerminalOutcome rejects lookalikes", () => {
  it("returns null when there is no outcome line", () => {
    expect(parseTerminalOutcome("Still working on the task.")).toBeNull();
    expect(parseTerminalOutcome("")).toBeNull();
  });

  it("rejects a mid-sentence occurrence", () => {
    expect(
      parseTerminalOutcome("The final Outcome: DONE — not at line start"),
    ).toBeNull();
  });

  it("rejects a quoted or blockquoted line", () => {
    expect(parseTerminalOutcome('"Outcome: DONE — quoted"')).toBeNull();
    expect(parseTerminalOutcome("> Outcome: DONE — blockquoted")).toBeNull();
  });

  it("rejects an indented line", () => {
    expect(parseTerminalOutcome("  Outcome: DONE — indented")).toBeNull();
    expect(parseTerminalOutcome("\tOutcome: DONE — tab indented")).toBeNull();
  });

  it("rejects a hyphen separator instead of an em dash", () => {
    expect(
      parseTerminalOutcome("Outcome: DONE - hyphen not em dash"),
    ).toBeNull();
  });

  it("rejects an empty or whitespace-only reason", () => {
    expect(parseTerminalOutcome("Outcome: DONE —")).toBeNull();
    expect(parseTerminalOutcome("Outcome: DONE — ")).toBeNull();
  });

  it("rejects an unknown or lowercase status token", () => {
    expect(parseTerminalOutcome("Outcome: MAYBE — unknown status")).toBeNull();
    expect(parseTerminalOutcome("Outcome: done — lowercase status")).toBeNull();
    expect(parseTerminalOutcome("outcome: DONE — lowercase label")).toBeNull();
  });

  it("rejects a missing space after the label", () => {
    expect(parseTerminalOutcome("Outcome:DONE — no space")).toBeNull();
  });
});
