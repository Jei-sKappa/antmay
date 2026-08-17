import {
  chmodSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { tempDirSync } from "./temp-root.js";
import { isAppleGitStub, resolveExecutableOnPath } from "./direct-git.js";

function executable(directory: string, name = "git"): string {
  const file = path.join(directory, name);
  writeFileSync(file, "#!/bin/sh\nexit 0\n", "utf8");
  chmodSync(file, 0o755);
  return file;
}

describe("resolveExecutableOnPath", () => {
  it("returns the first executable selected by PATH", () => {
    const first = tempDirSync("antmay-path-first-");
    const second = tempDirSync("antmay-path-second-");
    const selected = executable(first);
    executable(second);

    expect(
      resolveExecutableOnPath(
        "git",
        `${first}${path.delimiter}${second}`,
        process.cwd(),
      ),
    ).toBe(realpathSync(selected));
  });

  it("returns the canonical target of a selected symlink", () => {
    const bin = tempDirSync("antmay-path-bin-");
    const targetDir = tempDirSync("antmay-path-target-");
    const target = executable(targetDir, "actual-git");
    symlinkSync(target, path.join(bin, "git"));

    expect(resolveExecutableOnPath("git", bin, process.cwd())).toBe(
      realpathSync(target),
    );
  });
});

describe("isAppleGitStub", () => {
  it("rejects a PATH wrapper that delegates to the system Git", () => {
    const bin = tempDirSync("antmay-git-wrapper-");
    const wrapper = path.join(bin, "git");
    writeFileSync(wrapper, '#!/bin/sh\nexec /usr/bin/git "$@"\n', "utf8");
    chmodSync(wrapper, 0o755);

    const selected = resolveExecutableOnPath("git", bin, process.cwd());
    expect(selected).toBe(realpathSync(wrapper));
    expect(isAppleGitStub("darwin", selected)).toBe(false);
  });

  it("accepts only the canonical Apple stub on macOS", () => {
    expect(isAppleGitStub("darwin", "/usr/bin/git")).toBe(true);
    expect(isAppleGitStub("darwin", "/tmp/git-wrapper")).toBe(false);
    expect(isAppleGitStub("linux", "/usr/bin/git")).toBe(false);
    expect(isAppleGitStub("darwin", null)).toBe(false);
  });
});
