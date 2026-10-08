export const FANDEX_PRODUCT_RUNTIME_SOURCE_READ_DIAGNOSTICS_VERSION =
  'fandex-product-runtime-source-read-diagnostics-v1' as const;

export type FandexProductRuntimeSourceId =
  | 'musicAlbumPoint'
  | 'newsIssuePoint'
  | 'snsFandomPoint'
  | 'brandFitPoint'
  | 'comebackActivityPoint'
  | 'growthMomentumPoint.shadow'
  | 'growthMomentumPoint.readiness';

export type FandexProductRuntimeSourceReadDiagnostic = Readonly<{
  source: FandexProductRuntimeSourceId;
  durationMs: number;
  outcome: 'fulfilled' | 'rejected';
}>;

// Only the allowlisted source name, duration and settlement state are emitted.
// Never include provider payloads, credentials, error messages or evidence data.
export async function measureFandexProductRuntimeSourceRead<T>(
  input: Readonly<{
    source: FandexProductRuntimeSourceId;
    read: () => Promise<T>;
    now?: () => number;
    emit?: (diagnostic: FandexProductRuntimeSourceReadDiagnostic) => void;
  }>,
): Promise<T> {
  const now = input.now ?? (() => performance.now());
  const start = now();
  let outcome: FandexProductRuntimeSourceReadDiagnostic['outcome'] =
    'rejected';

  try {
    const value = await input.read();
    outcome = 'fulfilled';
    return value;
  } finally {
    const durationMs = Math.max(0, Math.round(now() - start));
    input.emit?.(Object.freeze({
      source: input.source,
      durationMs: Number.isFinite(durationMs) ? durationMs : 0,
      outcome,
    }));
  }
}
