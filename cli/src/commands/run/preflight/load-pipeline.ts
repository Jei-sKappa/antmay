import { resolveDocumentReference } from "../../../config/references.js";
import { loadPipelineDocument } from "../../../pipeline/documents.js";
import type { PipelineDocument } from "../../../pipeline/types.js";
import type { RunPreflightResult } from "../types.js";

/**
 * Resolve, load, and strictly validate the required pipeline document. The
 * reference is resolved by syntax alone, then exactly that source is read and
 * validated in full before `--from` selects anything from it.
 */
export function loadRunPipeline(
  pipelineRef: string,
  configRoot: string,
  cwd: string,
): RunPreflightResult<{
  document: PipelineDocument;
  pipelineSourcePath: string;
}> {
  const resolved = resolveDocumentReference(
    pipelineRef,
    "pipeline",
    configRoot,
    cwd,
  );
  if (!resolved.ok) {
    return {
      ok: false,
      refusal: { kind: "message", message: resolved.message },
    };
  }
  const pipelineSourcePath = resolved.reference.sourcePath;
  const pipelineLoad = loadPipelineDocument(pipelineSourcePath);
  if (!pipelineLoad.ok) {
    return {
      ok: false,
      refusal: {
        kind: "rejected-document",
        label: "pipeline document",
        sourcePath: pipelineSourcePath,
        errors: pipelineLoad.errors,
      },
    };
  }
  return {
    ok: true,
    document: pipelineLoad.document,
    pipelineSourcePath,
  };
}
