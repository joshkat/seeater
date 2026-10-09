/**
 * Serializes saves and collapses bursts: while a write is in flight, newer
 * values for the same key replace each other, and only the latest is written
 * next. Writes never run concurrently, so they can't land out of order.
 *
 * This is how the editor persists on every change without debouncing: typing a
 * table name fires many saves, but at most one is in flight and one is queued.
 */
export interface CoalescedWriter<T> {
  schedule: (value: T) => void;
  /** Resolves once everything scheduled so far has been written (or failed). */
  flush: () => Promise<void>;
  /** True when nothing is queued or in flight. */
  isIdle: () => boolean;
}

export interface WriterHooks {
  onStart?: () => void;
  /** Called when the queue drains; `failed` is true if any write threw. */
  onIdle?: (failed: boolean) => void;
  onError?: (error: unknown) => void;
}

export function createCoalescedWriter<T>(
  keyOf: (value: T) => string,
  write: (value: T) => Promise<unknown>,
  hooks: WriterHooks = {},
): CoalescedWriter<T> {
  const pending = new Map<string, T>();
  let running: Promise<void> | null = null;

  async function drain(): Promise<void> {
    let failed = false;
    hooks.onStart?.();
    while (pending.size > 0) {
      const [key, value] = pending.entries().next().value as [string, T];
      pending.delete(key);
      try {
        await write(value);
      } catch (error) {
        failed = true;
        hooks.onError?.(error);
      }
    }
    running = null;
    hooks.onIdle?.(failed);
  }

  return {
    schedule(value) {
      pending.set(keyOf(value), value);
      if (!running) running = drain();
    },
    async flush() {
      while (running) await running;
    },
    isIdle() {
      return running === null && pending.size === 0;
    },
  };
}
