import { describe, expect, it } from "vitest";

import { parseCliArguments, type CliCommand } from "./parse.js";
import {
  AFK_USAGE,
  LIST_USAGE,
  RESUME_USAGE,
  RUN_USAGE,
  TOP_USAGE,
} from "./help.js";

describe("parseCliArguments — accepted grammar", () => {
  it("accepts `afk run <recipe> --thread <path>`", () => {
    expect(
      parseCliArguments(["afk", "run", "standard", "--thread", "docs/threads/x"]),
    ).toEqual({
      kind: "run",
      recipe: "standard",
      thread: "docs/threads/x",
      dangerouslySkipPermissions: false,
    });
  });

  it("accepts the dangerous-permission flag on run", () => {
    expect(
      parseCliArguments([
        "afk",
        "run",
        "standard",
        "--thread",
        "t",
        "--dangerously-skip-permissions",
      ]),
    ).toEqual({
      kind: "run",
      recipe: "standard",
      thread: "t",
      dangerouslySkipPermissions: true,
    });
  });

  it("accepts `afk resume <run-id>`", () => {
    expect(parseCliArguments(["afk", "resume", "run-123"])).toEqual({
      kind: "resume",
      runId: "run-123",
    });
  });

  it("accepts `afk list`", () => {
    expect(parseCliArguments(["afk", "list"])).toEqual({ kind: "list" });
  });
});

function expectUsageError(command: CliCommand, usage: string): void {
  expect(command.kind).toBe("usage-error");
  if (command.kind !== "usage-error") return;
  expect(command.usage).toBe(usage);
  expect(command.message.length).toBeGreaterThan(0);
}

describe("parseCliArguments — rejections name the nearest usage", () => {
  it("rejects an unknown flag on run", () => {
    expectUsageError(
      parseCliArguments(["afk", "run", "standard", "--thread", "t", "--nope"]),
      RUN_USAGE,
    );
  });

  it("rejects a missing --thread value", () => {
    expectUsageError(
      parseCliArguments(["afk", "run", "standard", "--thread"]),
      RUN_USAGE,
    );
  });

  it("rejects a missing --thread option entirely", () => {
    expectUsageError(parseCliArguments(["afk", "run", "standard"]), RUN_USAGE);
  });

  it("rejects an extra positional on run", () => {
    expectUsageError(
      parseCliArguments(["afk", "run", "standard", "extra", "--thread", "t"]),
      RUN_USAGE,
    );
  });

  it("rejects an unknown subcommand under afk", () => {
    expectUsageError(parseCliArguments(["afk", "frobnicate"]), AFK_USAGE);
  });

  it("rejects an unknown top-level command", () => {
    expectUsageError(parseCliArguments(["nope"]), TOP_USAGE);
  });

  it("rejects `resume --dangerously-skip-permissions`", () => {
    expectUsageError(
      parseCliArguments(["afk", "resume", "run-1", "--dangerously-skip-permissions"]),
      RESUME_USAGE,
    );
  });

  it("rejects any option on list", () => {
    expectUsageError(parseCliArguments(["afk", "list", "--anything"]), LIST_USAGE);
  });

  it("rejects an extra positional on list", () => {
    expectUsageError(parseCliArguments(["afk", "list", "extra"]), LIST_USAGE);
  });

  it("rejects a missing run-id on resume", () => {
    expectUsageError(parseCliArguments(["afk", "resume"]), RESUME_USAGE);
  });
});

describe("parseCliArguments — help and version at every level", () => {
  it("recognizes --help at the top level", () => {
    expect(parseCliArguments(["--help"]).kind).toBe("help");
  });

  it("recognizes --help at the afk level", () => {
    expect(parseCliArguments(["afk", "--help"]).kind).toBe("help");
  });

  it("recognizes --help at each subcommand level", () => {
    expect(parseCliArguments(["afk", "run", "--help"]).kind).toBe("help");
    expect(parseCliArguments(["afk", "resume", "--help"]).kind).toBe("help");
    expect(parseCliArguments(["afk", "list", "--help"]).kind).toBe("help");
  });

  it("recognizes --version at every level", () => {
    expect(parseCliArguments(["--version"]).kind).toBe("version");
    expect(parseCliArguments(["afk", "--version"]).kind).toBe("version");
    expect(parseCliArguments(["afk", "run", "--version"]).kind).toBe("version");
    expect(parseCliArguments(["afk", "resume", "--version"]).kind).toBe("version");
    expect(parseCliArguments(["afk", "list", "--version"]).kind).toBe("version");
  });
});

describe("parseCliArguments — short flags", () => {
  it("treats -h as help at every level", () => {
    expect(parseCliArguments(["-h"]).kind).toBe("help");
    expect(parseCliArguments(["afk", "-h"]).kind).toBe("help");
    expect(parseCliArguments(["afk", "run", "-h"]).kind).toBe("help");
    expect(parseCliArguments(["afk", "resume", "-h"]).kind).toBe("help");
    expect(parseCliArguments(["afk", "list", "-h"]).kind).toBe("help");
  });

  it("rejects any other short flag", () => {
    expectUsageError(parseCliArguments(["-x"]), TOP_USAGE);
    expectUsageError(parseCliArguments(["afk", "-x"]), AFK_USAGE);
    expectUsageError(
      parseCliArguments(["afk", "run", "standard", "--thread", "t", "-x"]),
      RUN_USAGE,
    );
  });
});
