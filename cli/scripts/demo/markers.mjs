/**
 * What a scenario declares its invocation must show, and whether the captured
 * output shows it.
 *
 * An expected exit code alone does not say which rendering an invocation
 * reached: every pause exits `2` and every preflight refusal exits `1`, so a
 * scenario that lands on the wrong screen still matches its number. A marker is
 * the missing half of that declaration — the output that identifies the
 * rendering the scenario exists to show. What identifies a rendering is the
 * conjunction of a scenario's markers, so a marker set pairs the banner with the
 * line that tells this scenario apart from its neighbours.
 *
 * A marker takes one of three forms:
 *
 * - a plain string, required to appear somewhere in the output;
 * - a `(ctx) => string`, for the values that vary between runs — chiefly the run
 *   id in the pause's `Resume:` line, which `ctx.runId()` resolves, so the
 *   assertion names the correct id rather than any id;
 * - `{ text, atLeast: n }`, for a rendering whose subject is repetition rather
 *   than presence, such as the heartbeat's recurring elapsed line.
 *
 * Matching is substring containment against the invocation's accumulated output
 * with ANSI escapes stripped. There is deliberately no regular-expression form,
 * so a marker can only ever claim that a string appears, and no "must not
 * appear" form. Marker order is never asserted: the driver merges the child's
 * two pipes, which makes cross-stream sequence approximate.
 */

/** Every ANSI escape the CLI emits — eight colors plus bold and dim. */
const ANSI_PATTERN = /\x1b\[\d+m/g;

/**
 * The exact `antmay afk resume <run-id>` command a pause prints, resolved from
 * the run this scenario created. Requiring it asserts the run's own id rather
 * than any id, and it is checked against the child's output alone — the driver
 * prints that same command as a step label, which is why the driver captures
 * nothing of its own.
 */
export const printedResumeCommand = (ctx) => `antmay afk resume ${ctx.runId()}`;

/**
 * Whether `marker` is the counted form. The key set is checked exactly, so a
 * misspelled `atleast` is a load-time error rather than a marker that silently
 * degrades to plain containment.
 */
function isCountedMarker(marker) {
  if (typeof marker !== "object" || marker === null || Array.isArray(marker)) {
    return false;
  }
  const keys = Object.keys(marker).sort();
  return (
    keys.length === 2 &&
    keys[0] === "atLeast" &&
    keys[1] === "text" &&
    typeof marker.text === "string" &&
    marker.text.length > 0 &&
    Number.isInteger(marker.atLeast) &&
    marker.atLeast >= 1
  );
}

/**
 * Reject a step whose marker list is absent, empty, or malformed, the way a step
 * factory already rejects a non-integer `expectExit`. Every invocation in the
 * catalog produces output, including one that exists only to establish state for
 * a later step, so there is no invocation for which naming a marker is
 * impossible — and an unannotated scenario fails at load rather than passing
 * review.
 */
export function assertMarkers(markers, stepName) {
  if (!Array.isArray(markers) || markers.length === 0) {
    throw new TypeError(
      `${stepName}() requires a non-empty markers array naming the output that ` +
        "identifies the rendering this invocation must reach.",
    );
  }
  for (const marker of markers) {
    if (typeof marker === "function" || isCountedMarker(marker)) continue;
    if (typeof marker === "string" && marker.length > 0) continue;
    throw new TypeError(
      `${stepName}() markers must each be a non-empty string, a (ctx) => string, ` +
        `or { text, atLeast }; got ${JSON.stringify(marker)}.`,
    );
  }
  return markers;
}

/** What one marker requires of the output, with the fixture context applied. */
export function resolveMarker(marker, ctx) {
  if (typeof marker === "function") {
    const text = marker(ctx);
    if (typeof text !== "string" || text.length === 0) {
      throw new TypeError(
        `A marker function returned ${JSON.stringify(text)} instead of a non-empty string.`,
      );
    }
    return { text, atLeast: 1 };
  }
  if (typeof marker === "string") {
    return { text: marker, atLeast: 1 };
  }
  return { text: marker.text, atLeast: marker.atLeast };
}

/**
 * A marker's text when it is known without a fixture context, else `undefined`.
 * The catalog's duplicate-declaration check compares these, so a marker resolved
 * from `ctx` sits it out — which only ever weakens that check.
 */
export function staticMarkerText(marker) {
  if (typeof marker === "function") return undefined;
  return typeof marker === "string" ? marker : marker.text;
}

/** How many non-overlapping times `needle` occurs in `haystack`. */
function occurrences(haystack, needle) {
  let count = 0;
  for (
    let index = haystack.indexOf(needle);
    index !== -1;
    index = haystack.indexOf(needle, index + needle.length)
  ) {
    count += 1;
  }
  return count;
}

/**
 * Which of `markers` the invocation's captured output does not satisfy, named as
 * the driver reports them. An empty array means the invocation reached the
 * rendering it declared.
 */
export function missingMarkers(markers, ctx, output) {
  const plain = output.replace(ANSI_PATTERN, "");
  const missing = [];
  for (const marker of markers) {
    const { text, atLeast } = resolveMarker(marker, ctx);
    const found = occurrences(plain, text);
    if (found >= atLeast) continue;
    missing.push(
      atLeast === 1
        ? JSON.stringify(text)
        : `${JSON.stringify(text)} (needs ${atLeast} occurrences, found ${found})`,
    );
  }
  return missing;
}
