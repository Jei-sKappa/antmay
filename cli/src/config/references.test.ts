import fs from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import { resolveDocumentReference, type DocumentRole } from "./references.js";
import { tempDirSync } from "../test-helpers/temp-root.js";

const CONFIG_ROOT = "/tmp/antmay-config";
const CWD = "/work/repo";

function resolveOk(
  reference: string,
  role: DocumentRole = "pipeline",
  configRoot = CONFIG_ROOT,
  cwd = CWD,
) {
  const result = resolveDocumentReference(reference, role, configRoot, cwd);
  if (!result.ok) {
    throw new Error(`expected "${reference}" to resolve: ${result.message}`);
  }
  return result.reference;
}

function resolveError(
  reference: string,
  role: DocumentRole = "pipeline",
): string {
  const result = resolveDocumentReference(reference, role, CONFIG_ROOT, CWD);
  if (result.ok) {
    throw new Error(`expected "${reference}" to be rejected`);
  }
  return result.message;
}

describe("bare name references", () => {
  it("resolves a pipeline name below the config root's pipelines directory", () => {
    expect(resolveOk("standard", "pipeline")).toEqual({
      role: "pipeline",
      sourcePath: path.join(CONFIG_ROOT, "pipelines", "standard.json"),
    });
  });

  it("resolves a profile name below the config root's profiles directory", () => {
    expect(resolveOk("maximum-quality", "profile")).toEqual({
      role: "profile",
      sourcePath: path.join(CONFIG_ROOT, "profiles", "maximum-quality.json"),
    });
  });

  it.each(["standard-2", "2-stage", "9"])(
    "resolves the grammar edge form %j",
    (name) => {
      expect(resolveOk(name).sourcePath).toBe(
        path.join(CONFIG_ROOT, "pipelines", `${name}.json`),
      );
    },
  );
});

describe("explicit path references", () => {
  const cases = [
    ["./standard.json", path.join(CWD, "standard.json")],
    ["pipelines/standard.json", path.join(CWD, "pipelines", "standard.json")],
    ["../shared/standard.json", path.resolve(CWD, "../shared/standard.json")],
    ["./Standard.JSON", path.join(CWD, "Standard.JSON")],
    ["./my_pipeline.txt", path.join(CWD, "my_pipeline.txt")],
    ["./no-extension", path.join(CWD, "no-extension")],
    ["/etc/antmay/standard.json", "/etc/antmay/standard.json"],
    ["/etc/antmay/../antmay/p.json", "/etc/antmay/p.json"],
  ];

  it.each(cases)("resolves %j against the working directory", (reference, expected) => {
    // The path form is evidenced by the source path itself: it lands below the
    // working directory, never below the config root.
    expect(resolveOk(reference)).toEqual({
      role: "pipeline",
      sourcePath: expected,
    });
  });

  it("keeps a path a path whatever its filename, for either role", () => {
    expect(resolveOk("./Weird Name.json", "profile")).toEqual({
      role: "profile",
      sourcePath: path.join(CWD, "Weird Name.json"),
    });
    expect(resolveOk("./Weird Name.json", "pipeline")).toEqual({
      role: "pipeline",
      sourcePath: path.join(CWD, "Weird Name.json"),
    });
  });
});

describe("rejected references", () => {
  it("names both legal alternatives for a bare filename", () => {
    const message = resolveError("standard.json");
    expect(message).toContain('"standard"');
    expect(message).toContain('"./standard.json"');
    expect(message).toContain("pipelines/standard.json");
  });

  it("names both legal alternatives for a bare profile filename", () => {
    const message = resolveError("maximum-quality.json", "profile");
    expect(message).toContain('"maximum-quality"');
    expect(message).toContain('"./maximum-quality.json"');
    expect(message).toContain("profiles/maximum-quality.json");
  });

  it("offers the explicit path form when the filename stem is not a valid name", () => {
    const message = resolveError("My_Pipeline.json");
    expect(message).toContain('"./My_Pipeline.json"');
    expect(message).not.toContain('"My_Pipeline"');
  });

  it.each(["Standard", "my_pipeline", "-standard", "standard-", "stan--dard", "my pipeline"])(
    "rejects the invalid bare reference %j with the grammar",
    (raw) => {
      expect(resolveError(raw)).toContain("^[a-z0-9]+(?:-[a-z0-9]+)*$");
    },
  );

  it("rejects an empty reference", () => {
    expect(resolveError("")).toContain("must not be empty");
  });
});

describe("syntax-directed routing does not consult the filesystem", () => {
  let dir: string;

  beforeEach(() => {
    dir = tempDirSync("antmay-references-");
  });

  it("keeps a bare name in the config root even when a same-named file sits in the cwd", () => {
    const cwd = path.join(dir, "cwd");
    fs.mkdirSync(cwd);
    fs.writeFileSync(path.join(cwd, "standard.json"), "{}", "utf8");

    expect(resolveOk("standard", "pipeline", dir, cwd).sourcePath).toBe(
      path.join(dir, "pipelines", "standard.json"),
    );
  });

  it("keeps an explicit path a path even when the config root holds that name", () => {
    const cwd = path.join(dir, "cwd");
    fs.mkdirSync(cwd);
    fs.mkdirSync(path.join(dir, "pipelines"));
    fs.writeFileSync(
      path.join(dir, "pipelines", "standard.json"),
      "{}",
      "utf8",
    );

    // The cwd file does not exist: a missing explicit path never falls back to
    // the config-root lookup that would have succeeded.
    expect(resolveOk("./standard.json", "pipeline", dir, cwd).sourcePath).toBe(
      path.join(cwd, "standard.json"),
    );
  });

  it("resolves identically whether or not the source exists, and creates nothing", () => {
    const before = resolveOk("standard", "pipeline", dir, dir);
    fs.mkdirSync(path.join(dir, "pipelines"));
    fs.writeFileSync(before.sourcePath, "{}", "utf8");
    expect(resolveOk("standard", "pipeline", dir, dir)).toEqual(before);

    const missing = resolveOk("./nowhere/deep.json", "profile", dir, dir);
    expect(missing.sourcePath).toBe(path.join(dir, "nowhere", "deep.json"));
    expect(fs.existsSync(path.join(dir, "nowhere"))).toBe(false);
    expect(fs.existsSync(path.join(dir, "profiles"))).toBe(false);
  });

  it("performs no environment interpolation", () => {
    process.env.ANTMAY_REFERENCE_TEST = "expanded";
    try {
      expect(resolveOk("./$ANTMAY_REFERENCE_TEST.json").sourcePath).toBe(
        path.join(CWD, "$ANTMAY_REFERENCE_TEST.json"),
      );
    } finally {
      delete process.env.ANTMAY_REFERENCE_TEST;
    }
  });
});
