import { parseArgs, type ParseArgsConfig } from "node:util";

import {
  AFK_HELP,
  AFK_USAGE,
  LIST_HELP,
  LIST_USAGE,
  RESUME_HELP,
  RESUME_USAGE,
  RUN_HELP,
  RUN_USAGE,
  TOP_HELP,
  TOP_USAGE,
} from "./help.js";

/**
 * The parsed intent of an invocation. Parsing never performs I/O: it maps an
 * `argv` slice to exactly one of these shapes and defers all side effects to
 * the caller.
 */
export type CliCommand =
  | { kind: "help"; text: string }
  | { kind: "version" }
  | {
      kind: "run";
      recipe: string;
      thread: string;
      dangerouslySkipPermissions: boolean;
    }
  | { kind: "resume"; runId: string }
  | { kind: "list" }
  | { kind: "usage-error"; message: string; usage: string };

function usageError(message: string, usage: string): CliCommand {
  return { kind: "usage-error", message, usage };
}

type ParseArgsOptions = NonNullable<ParseArgsConfig["options"]>;

type StrictParseResult =
  | { ok: true; values: Record<string, unknown>; positionals: string[] }
  | { ok: false; message: string };

function strictParse(args: string[], options: ParseArgsOptions): StrictParseResult {
  try {
    const { values, positionals } = parseArgs({
      args,
      options,
      strict: true,
      allowPositionals: true,
    });
    return { ok: true, values, positionals };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}

/**
 * Parse a CLI `argv` slice (`process.argv.slice(2)`) into a single
 * `CliCommand`. Unknown flags, missing values, extra positionals, and unknown
 * (sub)commands resolve to a `usage-error` carrying the nearest usage text.
 * `-h` is the only short flag; `--help`/`--version` are honored at the top,
 * `afk`, and subcommand levels.
 */
export function parseCliArguments(argv: string[]): CliCommand {
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!;
    if (token === "-h" || token === "--help") {
      return { kind: "help", text: TOP_HELP };
    }
    if (token === "--version") {
      return { kind: "version" };
    }
    if (token.startsWith("-")) {
      return usageError(`Unknown option: ${token}`, TOP_USAGE);
    }
    if (token === "afk") {
      return parseAfk(argv.slice(i + 1));
    }
    return usageError(`Unknown command: ${token}`, TOP_USAGE);
  }
  return usageError("Missing command.", TOP_USAGE);
}

function parseAfk(args: string[]): CliCommand {
  for (let i = 0; i < args.length; i++) {
    const token = args[i]!;
    if (token === "-h" || token === "--help") {
      return { kind: "help", text: AFK_HELP };
    }
    if (token === "--version") {
      return { kind: "version" };
    }
    if (token.startsWith("-")) {
      return usageError(`Unknown option: ${token}`, AFK_USAGE);
    }
    const subArgs = args.slice(i + 1);
    switch (token) {
      case "run":
        return parseRun(subArgs);
      case "resume":
        return parseResume(subArgs);
      case "list":
        return parseList(subArgs);
      default:
        return usageError(`Unknown subcommand: ${token}`, AFK_USAGE);
    }
  }
  return usageError("Missing subcommand.", AFK_USAGE);
}

function parseRun(args: string[]): CliCommand {
  const parsed = strictParse(args, {
    help: { type: "boolean", short: "h" },
    version: { type: "boolean" },
    thread: { type: "string" },
    "dangerously-skip-permissions": { type: "boolean" },
  });
  if (!parsed.ok) {
    return usageError(parsed.message, RUN_USAGE);
  }
  if (parsed.values.help === true) {
    return { kind: "help", text: RUN_HELP };
  }
  if (parsed.values.version === true) {
    return { kind: "version" };
  }
  if (parsed.positionals.length === 0) {
    return usageError("Missing required <recipe> argument.", RUN_USAGE);
  }
  if (parsed.positionals.length > 1) {
    return usageError(
      `Unexpected extra argument: ${parsed.positionals[1]}`,
      RUN_USAGE,
    );
  }
  const thread = parsed.values.thread;
  if (typeof thread !== "string") {
    return usageError("Missing required option --thread.", RUN_USAGE);
  }
  return {
    kind: "run",
    recipe: parsed.positionals[0]!,
    thread,
    dangerouslySkipPermissions:
      parsed.values["dangerously-skip-permissions"] === true,
  };
}

function parseResume(args: string[]): CliCommand {
  const parsed = strictParse(args, {
    help: { type: "boolean", short: "h" },
    version: { type: "boolean" },
  });
  if (!parsed.ok) {
    return usageError(parsed.message, RESUME_USAGE);
  }
  if (parsed.values.help === true) {
    return { kind: "help", text: RESUME_HELP };
  }
  if (parsed.values.version === true) {
    return { kind: "version" };
  }
  if (parsed.positionals.length === 0) {
    return usageError("Missing required <run-id> argument.", RESUME_USAGE);
  }
  if (parsed.positionals.length > 1) {
    return usageError(
      `Unexpected extra argument: ${parsed.positionals[1]}`,
      RESUME_USAGE,
    );
  }
  return { kind: "resume", runId: parsed.positionals[0]! };
}

function parseList(args: string[]): CliCommand {
  const parsed = strictParse(args, {
    help: { type: "boolean", short: "h" },
    version: { type: "boolean" },
  });
  if (!parsed.ok) {
    return usageError(parsed.message, LIST_USAGE);
  }
  if (parsed.values.help === true) {
    return { kind: "help", text: LIST_HELP };
  }
  if (parsed.values.version === true) {
    return { kind: "version" };
  }
  if (parsed.positionals.length > 0) {
    return usageError(
      `Unexpected extra argument: ${parsed.positionals[0]}`,
      LIST_USAGE,
    );
  }
  return { kind: "list" };
}
