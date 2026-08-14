import { describe, expect, it } from "vitest";

import { isValidDocumentName } from "./document-name.js";

describe("shared raw document-name grammar", () => {
  const valid = [
    "a",
    "z",
    "0",
    "9",
    "standard",
    "standard-2",
    "2-stage",
    "plan9",
    "a-b-c",
    "maximum-quality",
    "ab12-34cd",
  ];

  it.each(valid)("accepts %j", (name) => {
    expect(isValidDocumentName(name)).toBe(true);
  });

  const invalid = [
    ["", "empty"],
    ["Standard", "uppercase"],
    ["STANDARD", "all uppercase"],
    ["standarD", "trailing uppercase"],
    ["stañdard", "non-ASCII"],
    ["стандарт", "non-ASCII script"],
    ["my pipeline", "internal whitespace"],
    [" standard", "leading whitespace"],
    ["standard ", "trailing whitespace"],
    ["standard\n", "trailing newline"],
    ["\tstandard", "leading tab"],
    ["my_pipeline", "underscore"],
    ["-standard", "leading hyphen"],
    ["standard-", "trailing hyphen"],
    ["-", "lone hyphen"],
    ["--", "only hyphens"],
    ["stan--dard", "repeated hyphen"],
    ["standard.json", "dot"],
    ["a/b", "path separator"],
    ["standard+2", "punctuation"],
  ];

  it.each(invalid)("rejects %j (%s)", (name) => {
    expect(isValidDocumentName(name)).toBe(false);
  });

  it("applies the grammar to the raw string without normalization", () => {
    expect(isValidDocumentName("  standard  ")).toBe(false);
    expect(isValidDocumentName("Standard")).toBe(false);
    expect(isValidDocumentName("standard́")).toBe(false);
  });
});
