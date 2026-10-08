export const FANDEX_RUNTIME_SOURCE_READ_MAX_CONCURRENCY = 2 as const;

/**
 * Run independent runtime reads with a small bounded working set.
 * Result order and per-source rejection are preserved just like
 * Promise.allSettled; no failure is reinterpreted as a zero or success.
 */
export async function settleRuntimeSourceReads<
  const Tasks extends readonly (() => Promise<unknown>)[],
>(
  tasks: Tasks,
  maxConcurrentReads: number = FANDEX_RUNTIME_SOURCE_READ_MAX_CONCURRENCY,
): Promise<{
  readonly [Index in keyof Tasks]:
    PromiseSettledResult<Awaited<ReturnType<Tasks[Index]>>>;
}> {
  if (!Number.isSafeInteger(maxConcurrentReads) || maxConcurrentReads < 1) {
    throw new Error('fandex_runtime_source_read_concurrency_invalid');
  }

  const results: PromiseSettledResult<unknown>[] =
    new Array(tasks.length);
  let nextIndex = 0;

  async function readNext(): Promise<void> {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      try {
        const value = await tasks[index]!();
        results[index] = Object.freeze({
          status: 'fulfilled' as const,
          value,
        });
      } catch (reason) {
        results[index] = Object.freeze({
          status: 'rejected' as const,
          reason,
        });
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(maxConcurrentReads, tasks.length) },
      () => readNext(),
    ),
  );

  return Object.freeze(results) as {
    readonly [Index in keyof Tasks]:
      PromiseSettledResult<Awaited<ReturnType<Tasks[Index]>>>;
  };
}

/**
 * Share only concurrent in-flight reads, not their completed results.
 * A later request always obtains new evidence; rejected calls are not
 * cached and cannot poison subsequent renders.
 */
export function singleFlightRuntimeRead<T>(
  read: () => Promise<T>,
): () => Promise<T> {
  let inFlight: Promise<T> | null = null;

  return () => {
    if (inFlight) return inFlight;
    const current = Promise.resolve().then(read);
    inFlight = current;
    void current.then(
      () => { if (inFlight === current) inFlight = null; },
      () => { if (inFlight === current) inFlight = null; },
    );
    return current;
  };
}
