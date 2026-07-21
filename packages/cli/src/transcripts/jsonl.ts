// Lenient JSONL line reader shared by the Claude and Codex transcript parsers.
// Every line is parsed independently: a line that is not valid JSON, or that
// decodes to something other than a JSON object, is skipped and counted as
// malformed rather than aborting the read. Unknown object fields are preserved
// untouched, so additive schema drift is accepted without any version gate.

export type JsonlRecord = Record<string, unknown>;

export type JsonlScan = {
  readonly records: readonly JsonlRecord[];
  readonly malformedLines: number;
};

/** Split `content` into records, skipping and counting malformed lines. */
export function parseJsonl(content: string): JsonlScan {
  const records: JsonlRecord[] = [];
  let malformedLines = 0;
  for (const rawLine of content.split("\n")) {
    const line = rawLine.replace(/\r$/, "").trim();
    if (line.length === 0) {
      continue;
    }
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      malformedLines += 1;
      continue;
    }
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      records.push(value as JsonlRecord);
    } else {
      malformedLines += 1;
    }
  }
  return { records, malformedLines };
}

/** Read a string field from a record, or `undefined` when it is not a string. */
export function readString(
  record: JsonlRecord,
  key: string,
): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

/** Read an object field from a record, or `undefined` when it is not an object. */
export function readObject(
  record: JsonlRecord,
  key: string,
): JsonlRecord | undefined {
  const value = record[key];
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as JsonlRecord;
  }
  return undefined;
}
