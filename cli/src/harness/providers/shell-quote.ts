/**
 * Quote `value` as one POSIX single-quoted shell argument. Every embedded
 * single quote is encoded as `'\''` so the whole value stays one argument when
 * pasted into a POSIX shell.
 */
export function posixSingleQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}
