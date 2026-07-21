import { describe, expect, it } from "vitest";
import {
  type CaseManifest,
  validateCaseManifest,
  validateSafeRelPath,
} from "../harness/case-manifest";

const source = { filePath: "cases/self-test.yml" };

function base(): Record<string, unknown> {
  return {
    id: "sample-case",
    covers: ["ANTMAY-FR-0001.AC-0101"],
    title: "sample",
    description: "a valid minimal manifest",
    steps: [
      { argv: ["--help"], expect: { exitCode: 0, stdoutContains: ["antmay"] } },
    ],
  };
}

describe("case-manifest schema", () => {
  it("accepts a valid minimal manifest and fills defaults", () => {
    const manifest: CaseManifest = validateCaseManifest(base(), source);
    expect(manifest.id).toBe("sample-case");
    expect(manifest.repos).toEqual(["main"]);
    expect(manifest.auditRepoWrites).toBe(true);
    expect(manifest.steps[0]?.tty).toBe(false);
  });

  it("rejects an unknown top-level field", () => {
    expect(() => validateCaseManifest({ ...base(), bogus: 1 }, source)).toThrow(
      /unknown case field bogus/,
    );
  });

  it("rejects an invalid case id", () => {
    expect(() =>
      validateCaseManifest({ ...base(), id: "Bad_Id" }, source),
    ).toThrow(/invalid case id/);
  });

  it("rejects a malformed acceptance ref", () => {
    expect(() =>
      validateCaseManifest({ ...base(), covers: ["FR-1.AC-1"] }, source),
    ).toThrow(/acceptance criterion ref/);
  });

  it("rejects a manifest with no steps", () => {
    expect(() =>
      validateCaseManifest({ ...base(), steps: [] }, source),
    ).toThrow(/steps must be a non-empty array/);
  });

  it("rejects stdin without tty", () => {
    const manifest = base();
    (manifest.steps as Array<Record<string, unknown>>)[0] = {
      argv: ["spawn"],
      stdin: ["x"],
      expect: { exitCode: 0, stdoutContains: ["x"] },
    };
    expect(() => validateCaseManifest(manifest, source)).toThrow(
      /stdin requires tty/,
    );
  });
});

describe("safe temp paths", () => {
  it("accepts a plain relative path", () => {
    expect(validateSafeRelPath("f", "docs/threads/x", source)).toBe(
      "docs/threads/x",
    );
  });

  it("rejects an absolute path", () => {
    expect(() => validateSafeRelPath("f", "/etc/passwd", source)).toThrow(
      /must not be absolute/,
    );
  });

  it("rejects a parent-escape path", () => {
    expect(() => validateSafeRelPath("f", "../../etc", source)).toThrow(
      /must not contain \.\./,
    );
  });

  it("rejects a backslash path", () => {
    expect(() => validateSafeRelPath("f", "a\\b", source)).toThrow(
      /forward slashes/,
    );
  });
});
