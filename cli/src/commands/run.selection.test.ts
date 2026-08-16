import { promises as fs } from "node:fs";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import type { HarnessId } from "../harness/id.js";
import type { HarnessExecutableProbe } from "../harness/runtime.js";
import { readCheckpoint } from "../state/checkpoint/read.js";
import {
  DEFAULT_STAGE_IDS,
  STANDARD_STAGE_IDS,
  commitSubjects,
  lockNames,
  okProbe,
  pipelineDocument,
  releaseTestResources,
  run,
  settingsFor,
  setup,
  soleCheckpointDir,
  standardSteps,
  writeThreadFile,
} from "../test-helpers/run-harness.js";

/**
 * What a new run resolves and snapshots: the documents it selects, the stages it
 * composes from them, and the resolved-execution block it prints before the first
 * attempt.
 */

afterAll(releaseTestResources, 120_000);

describe.concurrent("runCommand — happy path (AC-1.3, AC-20.2)", () => {
  it("runs the standard pipeline to completion, committing only the boundaries that changed", async () => {
    // The whole Standard sequence is what this case is about.
    const h = await setup({ stages: STANDARD_STAGE_IDS });
    const folder = h.fixture.threadFolder as string;
    const before = (await commitSubjects(h.fixture)).length;

    const result = await run(h, standardSteps(h.fixture));

    expect(result.code).toBe(0);
    const subjects = await commitSubjects(h.fixture);
    expect(subjects.length).toBe(before + 4);
    expect(subjects.slice(0, 4)).toEqual([
      `docs(${folder}): implementation report`,
      `docs(${folder}): plan`,
      `docs(${folder}): reconcile spec`,
      `docs(${folder}): spec`,
    ]);
    expect(subjects).not.toContain(`docs(${folder}): reconcile plan`);

    const runDir = await soleCheckpointDir(h.stateRoot);
    const cp = await readCheckpoint(runDir);
    expect(cp.ok).toBe(true);
    if (cp.ok) {
      expect(cp.checkpoint.condition).toBe("completed");
      expect(cp.checkpoint.stageIndex).toBe(6);
    }
    // Lock released on completion.
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });

  it("stores every selected-harness version outside the immutable stage snapshot", async () => {
    const h = await setup();
    await run(h, standardSteps(h.fixture));
    const cp = await readCheckpoint(await soleCheckpointDir(h.stateRoot));
    expect(cp.ok).toBe(true);
    if (cp.ok) {
      expect(cp.checkpoint.observedHarnessVersions.codex).toBe("codex 99.9.9");
      expect(JSON.stringify(cp.checkpoint.stages)).not.toContain("99.9.9");
    }
  });

  it("keeps the created snapshot fixed even when settings are edited afterward (AC-4.2)", async () => {
    const h = await setup();
    await run(h, standardSteps(h.fixture));
    const runDir = await soleCheckpointDir(h.stateRoot);
    await fs.writeFile(
      path.join(h.configRoot, "settings.json"),
      JSON.stringify(settingsFor(STANDARD_STAGE_IDS, "changed-model")),
      "utf8",
    );
    const cp = await readCheckpoint(runDir);
    expect(cp.ok).toBe(true);
    if (cp.ok) {
      expect(
        cp.checkpoint.stages.every(
          (stage) => stage.binding.agent.model === "test-model",
        ),
      ).toBe(true);
    }
  });

  it("emits the unrestricted-permissions warning when the flag is set", async () => {
    const h = await setup();
    const result = await run(h, standardSteps(h.fixture), {
      dangerouslySkipPermissions: true,
    });
    expect(result.code).toBe(0);
    expect(result.err).toContain("dangerously-skip-permissions");
  });
});

describe.concurrent("runCommand — external documents and selection (FR-1, FR-4, FR-5, FR-6)", () => {
  it("snapshots the declared identity and resolved source of a named pipeline", async () => {
    const h = await setup();
    const result = await run(h, standardSteps(h.fixture));
    expect(result.code).toBe(0);
    const cp = await readCheckpoint(await soleCheckpointDir(h.stateRoot));
    expect(cp.ok).toBe(true);
    if (!cp.ok) return;
    expect(cp.checkpoint.pipelineName).toBe("standard");
    expect(cp.checkpoint.pipelineSourcePath).toBe(
      path.join(h.configRoot, "pipelines", "standard.json"),
    );
    expect(cp.checkpoint.profileSelection).toEqual({ kind: "settings-only" });
    expect(cp.checkpoint.fromStage).toBeUndefined();
  });

  it("loads an explicit relative path whose filename differs from the declared name", async () => {
    const h = await setup({ pipeline: null });
    const documentPath = path.join(h.fixture.root, "my-pipeline.json");
    await fs.writeFile(
      documentPath,
      JSON.stringify(pipelineDocument(DEFAULT_STAGE_IDS, "standard")),
      "utf8",
    );
    await h.fixture.git(["add", "-A"]);
    await h.fixture.git(["commit", "-m", "chore: check in a pipeline"]);

    const result = await run(h, standardSteps(h.fixture), {
      pipeline: "./my-pipeline.json",
    });
    expect(result.code).toBe(0);
    const cp = await readCheckpoint(await soleCheckpointDir(h.stateRoot));
    expect(cp.ok).toBe(true);
    if (!cp.ok) return;
    // The declared name is the identity; the filename is only provenance.
    expect(cp.checkpoint.pipelineName).toBe("standard");
    expect(cp.checkpoint.pipelineSourcePath).toBe(documentPath);
  });

  it("runs a complete selected profile with no settings file at all", async () => {
    const h = await setup({
      settings: null,
      profile: {
        schemaVersion: 0,
        name: "maximum-quality",
        stages: Object.fromEntries(
          STANDARD_STAGE_IDS.map((stage) => [
            stage,
            {
              agent: { harness: "codex", model: "profile-model" },
              idleTimeoutSeconds: 120,
              heartbeatSeconds: 30,
            },
          ]),
        ),
      },
      profileName: "maximum-quality",
    });

    const result = await run(h, standardSteps(h.fixture), {
      profile: "maximum-quality",
    });
    expect(result.code).toBe(0);
    const cp = await readCheckpoint(await soleCheckpointDir(h.stateRoot));
    expect(cp.ok).toBe(true);
    if (!cp.ok) return;
    expect(cp.checkpoint.profileSelection).toEqual({
      kind: "profile",
      name: "maximum-quality",
      sourcePath: path.join(h.configRoot, "profiles", "maximum-quality.json"),
    });
    expect(
      cp.checkpoint.stages.every(
        (stage) =>
          stage.binding.agent.model === "profile-model" &&
          stage.binding.idleTimeoutSeconds === 120 &&
          stage.binding.heartbeatSeconds === 30,
      ),
    ).toBe(true);
  });

  it("falls back to the whole settings binding for a stage the profile omits", async () => {
    const h = await setup({
      profile: {
        schemaVersion: 0,
        name: "partial",
        stages: {
          spec: { agent: { harness: "codex", model: "profile-model" } },
        },
      },
      profileName: "partial",
    });

    const result = await run(h, standardSteps(h.fixture), { profile: "partial" });
    expect(result.code).toBe(0);
    const cp = await readCheckpoint(await soleCheckpointDir(h.stateRoot));
    expect(cp.ok).toBe(true);
    if (!cp.ok) return;
    expect(cp.checkpoint.stages[0]!.binding.agent.model).toBe("profile-model");
    expect(cp.checkpoint.stages[1]!.binding.agent.model).toBe("test-model");
    // Omitted timing fields settle to the intrinsic defaults on both sources.
    expect(cp.checkpoint.stages[0]!.binding.idleTimeoutSeconds).toBe(86_400);
    expect(cp.checkpoint.stages[1]!.binding.heartbeatSeconds).toBe(300);
  });

  it("snapshots only the selected suffix and records the entry point", async () => {
    const h = await setup({ stages: STANDARD_STAGE_IDS });
    await writeThreadFile(h.fixture, "spec.md", "# Spec\n");
    await h.fixture.git(["add", "-A"]);
    await h.fixture.git(["commit", "-m", "docs: spec"]);

    const result = await run(h, standardSteps(h.fixture).slice(3), {
      from: "plan-strict",
    });
    expect(result.code).toBe(0);
    const cp = await readCheckpoint(await soleCheckpointDir(h.stateRoot));
    expect(cp.ok).toBe(true);
    if (!cp.ok) return;
    expect(cp.checkpoint.fromStage).toBe("plan-strict");
    expect(cp.checkpoint.stages.map((stage) => stage.id)).toEqual([
      "plan-strict",
      "reconcile-plan",
      "implement-plan-with-subagents",
    ]);
    // Nothing credits the three skipped stages: they were never attempted.
    expect(cp.checkpoint.attempts.map((attempt) => attempt.stageId)).toEqual([
      "plan-strict",
      "reconcile-plan",
      "implement-plan-with-subagents",
    ]);
  });

  it("snapshots the catalog contract and concrete target of every selected stage", async () => {
    const h = await setup({ stages: STANDARD_STAGE_IDS });
    await run(h, standardSteps(h.fixture));
    const cp = await readCheckpoint(await soleCheckpointDir(h.stateRoot));
    expect(cp.ok).toBe(true);
    if (!cp.ok) return;
    const rel = h.fixture.threadRelPath as string;
    const spec = cp.checkpoint.stages[0]!;
    expect(spec.prerequisite).toEqual({ validThread: true });
    expect(spec.promises).toEqual({ spec: true });
    expect(spec.resolvedTarget).toBe(`${rel}/`);
    expect(cp.checkpoint.stages[3]!.resolvedTarget).toBe(`${rel}/spec.md`);
  });

  it("appends portable stage instructions after the trigger and target", async () => {
    const h = await setup({
      pipeline: pipelineDocument([
        { stage: "spec", instructions: "Cover the migration path." },
        ...DEFAULT_STAGE_IDS.slice(1),
      ]),
    });

    const result = await run(h, standardSteps(h.fixture));
    expect(result.code).toBe(0);
    const rel = h.fixture.threadRelPath as string;
    expect(result.invoker.calls[0]!.prompt).toBe(
      `$spec \`${rel}/\`. Cover the migration path.`,
    );
    expect(result.invoker.calls[1]!.prompt).toBe(
      `$reconcile-spec \`${rel}/spec.md\`.`,
    );
    const cp = await readCheckpoint(await soleCheckpointDir(h.stateRoot));
    expect(cp.ok).toBe(true);
    if (!cp.ok) return;
    expect(cp.checkpoint.stages[0]!.instructions).toBe(
      "Cover the migration path.",
    );
    expect(cp.checkpoint.stages[1]!.instructions).toBeUndefined();
  });

  it("probes only the harnesses the selected stages bind", async () => {
    const h = await setup({
      settings: {
        afk: {
          stages: {
            ...(settingsFor(STANDARD_STAGE_IDS).afk as {
              stages: Record<string, unknown>;
            }).stages,
            "plan-brief": {
              agent: { harness: "claude-code", model: "unused-model" },
            },
          },
        },
      },
    });
    let probed: HarnessId[] = [];
    const trackingProbe: HarnessExecutableProbe = async (harnesses, repoRoot) => {
      probed = [...harnesses];
      return okProbe(harnesses, repoRoot);
    };

    const result = await run(h, standardSteps(h.fixture), {
      probe: trackingProbe,
    });
    expect(result.code).toBe(0);
    // `plan-brief` is bound but never selected, so its harness is never probed.
    expect(probed).toEqual(["codex"]);
  });
});

describe.concurrent("runCommand — resolved-execution startup display (AC-11)", () => {
  it("shows the pipeline source, `settings only`, and every stage's binding and target", async () => {
    // The block lists every selected stage, so this case shows the whole set.
    const h = await setup({ stages: STANDARD_STAGE_IDS });
    const result = await run(h, standardSteps(h.fixture));
    expect(result.code).toBe(0);

    const startup = result.out.slice(
      result.out.indexOf("Run details"),
      result.out.indexOf("Stage 1/6"),
    );
    expect(startup).toContain(
      `standard (${path.join(h.configRoot, "pipelines", "standard.json")})`,
    );
    expect(startup).toContain("settings only");
    // Every selected stage, in execution order, with its resolved binding and
    // the concrete repository-relative target composition settled on.
    const thread = h.fixture.threadFolder as string;
    expect(startup).toContain(`1. spec`);
    expect(startup).toContain(`codex · test-model`);
    expect(startup).toContain(`→ docs/threads/${thread}/`);
    expect(startup).toContain(`2. reconcile-spec`);
    expect(startup).toContain(`→ docs/threads/${thread}/spec.md`);
    expect(startup).toContain(`6. implement-plan-with-subagents`);
    expect(startup).toContain(`→ docs/threads/${thread}/plan.md`);
    // The block never mentions an entry point it was not given.
    expect(startup).not.toContain("From:");
  });

  it("shows the selected profile's declared name and source, and the entry point", async () => {
    const h = await setup({
      stages: STANDARD_STAGE_IDS,
      profile: {
        schemaVersion: 0,
        name: "maximum-quality",
        stages: {
          "plan-strict": {
            agent: { harness: "claude-code", model: "profile-model" },
          },
        },
      },
      profileName: "maximum-quality",
    });
    await writeThreadFile(h.fixture, "spec.md", "# Spec\n");
    await h.fixture.git(["add", "-A"]);
    await h.fixture.git(["commit", "-m", "docs: spec"]);

    const result = await run(h, standardSteps(h.fixture).slice(3), {
      from: "plan-strict",
      profile: "maximum-quality",
      probe: async (harnesses, repoRoot) => okProbe(harnesses, repoRoot),
    });
    expect(result.code).toBe(0);

    const startup = result.out.slice(
      result.out.indexOf("Run details"),
      result.out.indexOf("Stage 1/3"),
    );
    expect(startup).toContain(
      `maximum-quality (${path.join(h.configRoot, "profiles", "maximum-quality.json")})`,
    );
    expect(startup).toContain("plan-strict");
    // The profile binds only the entry stage; the rest keep the settings agent.
    expect(startup).toContain("claude-code · profile-model");
    expect(startup).toMatch(/codex +· test-model/);
  });

  it("prints the whole block before the first attempt and prompts for nothing", async () => {
    const h = await setup();
    const result = await run(h, standardSteps(h.fixture));
    expect(result.code).toBe(0);
    expect(result.out.indexOf("Run details")).toBeLessThan(
      result.out.indexOf("Stage 1/3"),
    );
    expect(result.out.indexOf("Stages:")).toBeLessThan(
      result.out.indexOf("Stage 1/3"),
    );
    // Non-interactive: nothing reads stdin and no confirmation is solicited.
    expect(result.out).not.toMatch(/\b(y\/n|\[Y\/n\]|press enter|confirm)\b/i);
  });
});
