/**
 * Narrow an unknown value to a plain JSON object: the shape every document
 * validator needs before it may read a field. Arrays and `null` are objects to
 * `typeof` but carry no named fields, so both are rejected.
 */
export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
