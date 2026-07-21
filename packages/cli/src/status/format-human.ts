// Human rendering of the canonical status document. It reads the same
// {@link StatusDocumentV1} the JSON projection emits, so the two renderings
// carry identical run identities, classifications, reasons, attach data, and
// attention counts. Every field named in the status contract appears here, and
// an attach hint is printed for every retained available pane.

import type { StatusDocumentV1 } from "@antmay/core";

// One run block: identity, skill/harness/adapter, session, an optional reason,
// and an attach hint whenever a retained pane is available.
function renderRun(run: StatusDocumentV1["runs"][number]): string[] {
  const lines = [
    `- ${run.id} [${run.classification}]`,
    `    repository: ${run.repositoryPath}`,
    `    thread:     ${run.threadPath}`,
    `    skill:      ${run.skill} (${run.harness}, ${run.adapter})`,
    `    session:    ${run.session.kind}${
      run.session.id === null ? "" : ` ${run.session.id}`
    }`,
  ];
  if (run.reason !== null) {
    lines.push(`    reason:     ${run.reason}`);
  }
  if (run.attach.available && run.attach.handle !== null) {
    lines.push(
      `    attach:     antmay attach ${run.id} (pane ${run.attach.handle})`,
    );
  } else {
    lines.push("    attach:     unavailable");
  }
  return lines;
}

function renderAttention(
  entry: StatusDocumentV1["attention"][number],
): string[] {
  return [
    `- ${entry.threadPath}`,
    `    repository:        ${entry.repositoryPath}`,
    `    pending decisions: ${entry.pendingDecisions}`,
    `    pending reviews:   ${entry.pendingReviews}`,
  ];
}

/** Render the canonical status document as human-readable text. */
export function formatStatusHuman(document: StatusDocumentV1): string {
  const lines: string[] = [];

  lines.push(
    document.scope.mode === "repository"
      ? `Runs for ${document.scope.repositoryPath}`
      : "Runs across all repositories",
  );
  if (document.runs.length === 0) {
    lines.push("  (no runs)");
  } else {
    for (const run of document.runs) {
      lines.push(...renderRun(run));
    }
  }

  lines.push("");
  lines.push("Attention:");
  if (document.attention.length === 0) {
    lines.push("  (none)");
  } else {
    for (const entry of document.attention) {
      lines.push(...renderAttention(entry));
    }
  }

  return `${lines.join("\n")}\n`;
}
