/**
 * The stream and rendering context every terminal renderer and standalone
 * render helper shares. `color` decides whether ANSI color codes are emitted,
 * as one settled answer rather than the inputs to recombine; the rule that
 * produces it is `resolveDisplayColor` below, so both the question and its
 * answer live here.
 */
export interface DisplayOptions {
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
  color: boolean;
}

/**
 * Whether the display emits ANSI color, resolved from the environment and the
 * stream a caller reads them from.
 *
 * `NO_COLOR` outranks everything: any non-empty value keeps color off, so an
 * explicit off never loses to an on switch a wrapper exported. Otherwise
 * `FORCE_COLOR` turns color on — any value but empty or `0` — which is what
 * makes a piped stdout render in color for a pager, a CI log, or a driver
 * capturing the stream. With neither set, a terminal stdout decides. No
 * color-level value is interpreted: color is on or off.
 */
export function resolveDisplayColor(
  env: NodeJS.ProcessEnv,
  isTTY: boolean,
): boolean {
  if ((env.NO_COLOR ?? "") !== "") return false;
  const forced = env.FORCE_COLOR ?? "";
  if (forced !== "" && forced !== "0") return true;
  return isTTY;
}

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  brightBlue: "\x1b[94m",
  brightWhite: "\x1b[97m",
} as const;

export type Ansi = Exclude<keyof typeof ANSI, "reset">;

/** The style every `key: value` label carries, so the key reads as a label
 * distinct from its value. */
export const KEY_STYLE: readonly Ansi[] = ["brightBlue"];

/** The style every `key: value` value carries, kept a shade quieter than live
 * harness output so the two never read as the same voice. */
export const VALUE_STYLE: readonly Ansi[] = ["white"];

/** Paints text in the requested styles, or returns it unchanged when color is
 * off. Every renderer gets its painter from here. */
export type Painter = (text: string, ...codes: Ansi[]) => string;

export function createPainter(options: Pick<DisplayOptions, "color">): Painter {
  return (text, ...codes) =>
    options.color
      ? `${codes.map((code) => ANSI[code]).join("")}${text}${ANSI.reset}`
      : text;
}

/** Write a block as one newline-terminated chunk, exactly as composed. */
export function emit(stream: NodeJS.WritableStream, text: string): void {
  stream.write(`${text}\n`);
}

/**
 * Render one `key: value` info line. The key is painted so it reads as a label;
 * padding is applied outside the color codes so values stay aligned at
 * `keyWidth` regardless of whether color is on.
 */
export function infoLine(
  paint: Painter,
  indent: string,
  key: string,
  value: string,
  keyWidth: number,
): string {
  const label = `${key}:`;
  const gap = " ".repeat(Math.max(1, keyWidth - label.length + 1));
  return `${indent}${paint(label, ...KEY_STYLE)}${gap}${paint(value, ...VALUE_STYLE)}`;
}

/** The widest `key:` label in a group, used as that group's alignment column. */
export function keyWidth(...keys: string[]): number {
  return Math.max(...keys.map((key) => key.length + 1));
}

/** Pad `text` to `width` outside any color codes, so a column stays aligned
 * whether or not color is on. */
export function pad(text: string, width: number): string {
  return " ".repeat(Math.max(0, width - text.length));
}

/** Prefix every line of `text` with `gutter`, so a quoted or flagged block reads
 * as such on every one of its lines rather than only on the first. */
export function withGutter(text: string, gutter: string): string {
  return text
    .split("\n")
    .map((line) => `${gutter}${line}`)
    .join("\n");
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(" ");
}

/** Displayed tool-call arguments are truncated to this many characters; the
 * full data always survives untouched in the attempt log. */
const TOOL_ARG_DISPLAY_LIMIT = 160;

export function truncateArgs(args: string): string {
  if (args.length <= TOOL_ARG_DISPLAY_LIMIT) return args;
  return `${args.slice(0, TOOL_ARG_DISPLAY_LIMIT)}…`;
}

/**
 * How an unmet artifact prerequisite is counted and named. Preflight refusals
 * and runtime rechecks are one diagnostic interface for a reader, so both open
 * their `Problem` line with this exact sentence.
 */
export function unmetRequirementsProblem(stageId: string, count: number): string {
  return (
    `${count} requirement${count === 1 ? "" : "s"} for "${stageId}" ` +
    `${count === 1 ? "is" : "are"} not satisfied.`
  );
}
