import { VERSION } from "../cli/help.js";
import {
  KEY_STYLE,
  createPainter,
  emit,
  infoLine,
  keyWidth,
  resolveDisplayColor,
  withGutter,
} from "./format.js";

/**
 * What the bootstrap knows when a throw escapes it. The renderer reads no
 * global, so the whole rendering is a function of these facts and the value
 * that was thrown. `isTTY` is stdout's, matching every other renderer, so
 * `NO_COLOR`, `FORCE_COLOR`, and piping behave here exactly as they do
 * everywhere else even though the block itself goes to stderr.
 */
export type CrashProcess = {
  stderr: NodeJS.WritableStream;
  env: NodeJS.ProcessEnv;
  isTTY: boolean;
  argv: readonly string[];
  nodeVersion: string;
};

/** Where a reader is asked to send the report this block is written to be. */
const ISSUES_URL = "https://github.com/Jei-sKappa/antmay/issues";

/** Marks the reported value as quoted evidence rather than antmay's own voice. */
const TRACE_GUTTER = "  │ ";

/**
 * How far a `cause` or aggregate chain is followed. Deep enough that a real
 * chain arrives whole, shallow enough that a pathological one cannot fill the
 * screen with the thing a reader is supposed to forward.
 */
const MAX_CAUSE_DEPTH = 8;

/** Stringify an untrusted thrown value without throwing a second time. */
function safeString(value: unknown): string {
  if (typeof value === "symbol") return value.toString();
  try {
    return String(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

/** What kind of thing was thrown, named the way a reader would name it. */
function describeType(value: unknown): string {
  return value === null ? "null" : typeof value;
}

/** An error's own report: its stack when the engine captured one, and the name
 * and message it would otherwise open with. */
function describeError(error: Error): string {
  const { stack } = error;
  if (typeof stack === "string" && stack !== "") return stack;
  const name = safeString(error.name);
  const message = safeString(error.message);
  return message === "" ? name : `${name}: ${message}`;
}

/**
 * The thrown value and everything it was caused by, as the lines to quote.
 * Node's own unhandled-rejection printer already follows `cause` and
 * `AggregateError.errors`, so a report that stopped at the outermost stack
 * would say less than the raw output it replaces.
 */
function reportLines(thrown: unknown): string[] {
  const lines: string[] = [];
  const seen = new Set<object>();

  const visit = (value: unknown, depth: number, label: string): void => {
    if (depth > MAX_CAUSE_DEPTH) {
      lines.push(`${label}(further causes omitted)`);
      return;
    }
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        lines.push(`${label}(already reported above)`);
        return;
      }
      seen.add(value);
    }

    const described =
      value instanceof Error ? describeError(value) : safeString(value);
    lines.push(...`${label}${described}`.split("\n"));

    if (!(value instanceof Error)) return;
    if (value instanceof AggregateError) {
      for (const nested of value.errors) {
        visit(nested, depth + 1, "Aggregated error: ");
      }
    }
    if (value.cause !== undefined) {
      visit(value.cause, depth + 1, "Caused by: ");
    }
  };

  visit(thrown, 0, "");
  return lines;
}

/** Quote an argument that a reader could not paste back verbatim otherwise. */
function quoteArgument(argument: string): string {
  if (argument !== "" && !/[\s"'\\$`]/.test(argument)) return argument;
  return `'${argument.replaceAll("'", "'\\''")}'`;
}

/**
 * Report a throw that escaped every handler in antmay.
 *
 * Every failure antmay supports is a structured refusal with its own renderer,
 * so reaching this one means the executor hit a defect: the block says that
 * plainly, states what the invocation left behind, and asks for a report. The
 * thrown value follows in full underneath, because a crash a reader cannot
 * forward is worse than a stack trace, and it may not reproduce on a second
 * run. The run id is deliberately absent — the bootstrap never learns it — so
 * the block points at `antmay afk list` rather than printing a resume command
 * it would have to invent.
 */
export function printCrash(io: CrashProcess, thrown: unknown): void {
  const paint = createPainter({ color: resolveDisplayColor(io.env, io.isTTY) });
  const width = keyWidth("Problem", "Error", "Command", "Version", "Result");
  const line = (key: string, value: string): string =>
    infoLine(paint, "  ", key, value, width);

  const isError = thrown instanceof Error;
  const report = reportLines(thrown);
  const headline = isError
    ? (report[0] ?? "(the error carried no detail)")
    : `a non-Error value was thrown (${describeType(thrown)})`;
  const command = ["antmay", ...io.argv.map(quoteArgument)].join(" ");

  const lines = [
    paint("antmay stopped unexpectedly ❌", "bold", "red"),
    line("Problem", "An internal error escaped every handler in antmay."),
    line("Error", headline),
    line("Command", command),
    line("Version", `antmay ${VERSION} · Node.js ${io.nodeVersion}`),
    "",
    `  ${paint("Why:", ...KEY_STYLE)}`,
    "    - This is a defect in antmay, not a problem with your pipeline, thread, or configuration.",
    "    - Every failure antmay handles says what happened and what to do next. Reaching this",
    "      block means none of them recognized this one, so the detail below is the whole",
    "      diagnosis.",
    "",
    `  ${paint("State:", ...KEY_STYLE)}`,
    "    - Any workspace lock this invocation held was released as it stopped.",
    "    - Checkpoints are written atomically, so the last durable one is intact.",
    "    - If a run had already been allocated, `antmay afk list` shows it and",
    "      `antmay afk resume <run-id>` is the way back in.",
    "",
    `  ${paint("Report:", ...KEY_STYLE)}`,
    `    ${ISSUES_URL}`,
    "    Include the command, the version, and everything below.",
    line("Result", "The command did not complete. Nothing else was attempted."),
    "",
    paint(isError ? "Stack trace" : "Thrown value", "bold"),
    withGutter(report.join("\n"), paint(TRACE_GUTTER, "dim")),
  ];

  emit(io.stderr, lines.join("\n"));
}
