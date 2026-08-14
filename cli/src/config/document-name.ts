/**
 * The raw name grammar shared by pipeline references, pipeline documents, and
 * execution-profile documents. This leaf imports nothing, so validating a
 * declared name never reaches path resolution.
 */

/** Lowercase ASCII letters and digits in non-empty hyphen-separated segments. */
export const DOCUMENT_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Whether `value` satisfies the shared raw document-name grammar. */
export function isValidDocumentName(value: string): boolean {
  return DOCUMENT_NAME_PATTERN.test(value);
}
