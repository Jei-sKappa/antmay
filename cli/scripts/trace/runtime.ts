/**
 * The call-trace runtime, copied into the instrumented source tree as
 * `src/__antmay-trace.ts` by `scripts/trace/instrument.mjs`.
 *
 * Tracing is off unless `ANTMAY_TRACE_DIR` names a directory, so the
 * instrumented binary is an ordinary CLI otherwise: `__traceWrap` hands the
 * function straight back and no wrapper stands between any two calls.
 *
 * Each traced call records the frame that called it rather than a stack depth,
 * because the executor is asynchronous throughout: a stack depth counted at
 * call time would flatten everything a function does after its first `await`
 * up to the top level. `AsyncLocalStorage` carries the calling frame across
 * awaits, so the recorded parent is the function a call was really made from.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { mkdirSync, openSync, writeSync } from "node:fs";
import path from "node:path";

type Wrapped = (...args: unknown[]) => unknown;

const traceDir = process.env.ANTMAY_TRACE_DIR;
const frames = new AsyncLocalStorage<number>();
const pending: string[] = [];
const startedAt = Date.now();
let handle = -1;
let sequence = 0;

const FLUSH_AT = 1024;

function open(): number {
  if (handle < 0) {
    mkdirSync(traceDir as string, { recursive: true });
    handle = openSync(path.join(traceDir as string, `trace-${process.pid}.jsonl`), "a");
  }
  return handle;
}

function flush(): void {
  if (pending.length === 0) return;
  const payload = `${pending.join("\n")}\n`;
  pending.length = 0;
  try {
    writeSync(open(), payload);
  } catch {
    // A tracer must never take the process down with it.
  }
}

function emit(event: Record<string, unknown>): void {
  pending.push(JSON.stringify(event));
  if (pending.length >= FLUSH_AT) flush();
}

function isThenable(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

/**
 * Replace one module-level function with a frame-recording wrapper. Called once
 * per declared function at module evaluation time, before any of them run.
 */
export function __traceWrap(module: string, name: string, fn: Wrapped): Wrapped {
  if (traceDir === undefined || traceDir === "") return fn;
  const wrapper = function (this: unknown, ...args: unknown[]): unknown {
    const id = (sequence += 1);
    emit({
      e: ">",
      id,
      p: frames.getStore() ?? 0,
      m: module,
      n: name,
      t: Date.now() - startedAt,
    });
    let result: unknown;
    try {
      result = frames.run(id, () => fn.apply(this, args));
    } catch (error) {
      emit({
        e: "!",
        id,
        x: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        t: Date.now() - startedAt,
      });
      throw error;
    }
    // A settled return is complete; a thenable one only means the function has
    // reached its first suspension point. Marking which is which keeps the
    // rendered tree honest about where a frame is still open.
    emit({
      e: "<",
      id,
      ...(isThenable(result) ? { a: 1 } : {}),
      t: Date.now() - startedAt,
    });
    return result;
  };
  Object.defineProperty(wrapper, "name", { value: name, configurable: true });
  return wrapper;
}

if (traceDir !== undefined && traceDir !== "") {
  emit({
    e: "proc",
    pid: process.pid,
    argv: process.argv.slice(2),
    at: new Date().toISOString(),
  });
  process.on("exit", flush);
}
