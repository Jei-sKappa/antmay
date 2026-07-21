import { describe, expect, it } from "vitest";
import rootPackage from "../../../package.json" with { type: "json" };
import cliPackage from "../../cli/package.json" with { type: "json" };
import corePackage from "../package.json" with { type: "json" };

describe("workspace package contract", () => {
  it("keeps the root as a private ESM workspace with no binary", () => {
    expect(rootPackage.private).toBe(true);
    expect(rootPackage.name).toBe("antmay-workspace");
    expect(rootPackage).not.toHaveProperty("bin");
    expect(rootPackage.type).toBe("module");
    expect(rootPackage.workspaces).toEqual(["packages/*"]);
    expect(rootPackage.engines.node).toBe(">=20");
  });

  it("declares core as a private ESM library with declaration exports", () => {
    expect(corePackage.name).toBe("@antmay/core");
    expect(corePackage.private).toBe(true);
    expect(corePackage.type).toBe("module");
    expect(corePackage.exports).toEqual({
      ".": {
        types: "./dist/index.d.ts",
        import: "./dist/index.js",
      },
    });
  });

  it("declares the antmay executable with its binary, engine, and core dependency", () => {
    expect(cliPackage.name).toBe("antmay");
    expect(cliPackage.type).toBe("module");
    expect(cliPackage.bin).toEqual({ antmay: "./dist/index.js" });
    expect(cliPackage.engines.node).toBe(">=20");
    expect(cliPackage.dependencies["@antmay/core"]).toBe("workspace:*");
  });
});
