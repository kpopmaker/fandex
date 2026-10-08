export const FANDEX_RUNTIME_SOURCE_READ_TIMING_VERSION =
  'fandex-runtime-source-read-timing-v1' as const;

export const FANDEX_RUNTIME_SOURCE_READ_IDS = [
  'musicAlbumPoint',
  'newsIssuePoint',
  'snsFandomPoint',
  'brandFitPoint',
  'comebackActivityPoint',
  'growthMomentumPoint',
  'growthMomentumReadiness',
] as const;

export type FandexRuntimeSourceReadId =
  (typeof FANDEX_RUNTIME_SOURCE_READ_IDS)[number];

export type FandexRuntimeSourceReadTimingOptions = Readonly<{
  enabled: boolean;
  now?: () => number;
  log?: (message: string) => void;
}>;

/**
 * Records metadata-only timings when explicitly enabled.
 * Do not log evidence, exception details, tokens, or source identifiers.
 * The original read result (including a rejected read) remains authoritative.
 */
export function observeFandexRuntimeSourceRead<T>(
  source: FandexRuntimeSourceReadId,
  read: Promise<T>,
  options: FandexRuntimeSourceReadTimingOptions,
): Promise<T> {
  if (!options.enabled) return read;

  const now = options.now ?? (() => performance.now());
  const log = options.log ?? ((message: string) => console.info(message));
  const started = now();

  const report = (outcome: 'fulfilled' | 'rejected'): void => {
    try {
      const measured = now() - started;
      const durationMs = Number.isFinite(measured)
        ? Math.max(0, Math.round(measured))
        : null;
      log('FANDEX_PRODUCT_RUNTIME_READ_TIMING=' + JSON.stringify({
        contractVersion: FANDEX_RUNTIME_SOURCE_READ_TIMING_VERSION,
        source,
        outcome,
        durationMs,
      }));
    } catch {
      // An observability failure must never change Product read semantics.
    }
  };

  return read.then(
    (value) => {
      report('fulfilled');
      return value;
    },
    (error: unknown) => {
      report('rejected');
      throw error;
    },
  );
}
