// The transient-prompt boundary the spawn command gathers missing input
// through. It is injectable so tests drive every branch without a real terminal,
// and `isInteractive` gates whether any prompt is attempted at all: on a
// non-interactive stream the command never constructs a prompt and instead fails
// naming the missing flag. Prompts are transient — each question opens and closes
// its own readline interface and leaves no persistent handle on the event loop.

import { createInterface } from "node:readline/promises";

/** One missing spawn input a prompt can gather. */
export type PromptField =
  | "thread"
  | "skill"
  | "harness"
  | "adapter"
  | "request";

/** Extra context a prompt may surface, such as the skill a request belongs to. */
export type PromptContext = {
  readonly skill?: string;
};

/**
 * The prompt surface the spawn command depends on. Every method is injectable:
 * `isInteractive` decides whether prompting is possible at all, `gather` collects
 * one missing field, and `confirmAdditionalRun` asks whether to launch alongside
 * existing active runs.
 */
export interface PromptProvider {
  /** Whether prompting is possible on the current streams (a real TTY). */
  isInteractive(): boolean;
  /** Gather one missing value for the given field. */
  gather(field: PromptField, context: PromptContext): Promise<string>;
  /** Confirm launching an additional run alongside existing active runs. */
  confirmAdditionalRun(activeRunIds: readonly string[]): Promise<boolean>;
}

function promptLabel(field: PromptField, context: PromptContext): string {
  switch (field) {
    case "thread":
      return "Thread (folder name, docs/threads/<name>, or absolute root): ";
    case "skill":
      return "Catalog skill: ";
    case "harness":
      return "Harness (claude|codex): ";
    case "adapter":
      return "Adapter (herdr): ";
    case "request":
      return `Request for the "${context.skill ?? "selected"}" skill: `;
  }
}

/**
 * The production prompt provider backed by an interactive terminal. It reports
 * interactivity only when both streams are TTYs, and opens a fresh readline
 * interface per question so nothing lingers on the event loop.
 */
export class TerminalPromptProvider implements PromptProvider {
  constructor(
    private readonly input: NodeJS.ReadStream = process.stdin,
    private readonly output: NodeJS.WriteStream = process.stdout,
  ) {}

  isInteractive(): boolean {
    return Boolean(this.input.isTTY) && Boolean(this.output.isTTY);
  }

  async gather(field: PromptField, context: PromptContext): Promise<string> {
    const rl = createInterface({ input: this.input, output: this.output });
    try {
      const answer = await rl.question(promptLabel(field, context));
      return answer.trim();
    } finally {
      rl.close();
    }
  }

  async confirmAdditionalRun(
    activeRunIds: readonly string[],
  ): Promise<boolean> {
    const rl = createInterface({ input: this.input, output: this.output });
    try {
      const answer = await rl.question(
        `An active run already exists for this repository (${activeRunIds.join(", ")}). Launch an additional run anyway? [y/N] `,
      );
      return /^y(es)?$/i.test(answer.trim());
    } finally {
      rl.close();
    }
  }
}
