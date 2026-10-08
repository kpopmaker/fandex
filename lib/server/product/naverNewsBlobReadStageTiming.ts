export const NAVER_NEWS_BLOB_READ_STAGE_TIMING_VERSION =
  'naver-news-blob-read-stage-timing-v1' as const;

export const NAVER_NEWS_BLOB_READ_STAGE_IDS = [
  'credential-resolution',
  'store-initialization',
  'manifest-list',
  'manifest-load',
  'latest-slot-resolution',
  'canonical-evidence-batch',
  'series-assembly',
  'methodology-evaluation',
] as const;

export type NaverNewsBlobReadStageId =
  (typeof NAVER_NEWS_BLOB_READ_STAGE_IDS)[number];

export type NaverNewsBlobReadStageTiming = Readonly<{
  contractVersion: typeof NAVER_NEWS_BLOB_READ_STAGE_TIMING_VERSION;
  stage: NaverNewsBlobReadStageId;
  outcome: 'fulfilled' | 'rejected';
  durationMs: number | null;
}>;

export type NaverNewsBlobReadStageTimingOptions = Readonly<{
  enabled: boolean;
  now?: () => number;
  log?: (line: string) => void;
}>;

/**
 * Read-only timing telemetry. Stage names are fixed, and no evidence paths,
 * job IDs, URLs, credentials, response bodies, or error details are emitted.
 *
 * Timings can be nested: manifest-list is included in manifest-load;
 * manifest-load is included in latest-slot-resolution; and
 * canonical-evidence-batch is included in series-assembly.
 */
export function createNaverNewsBlobReadStageTimer(
  options: NaverNewsBlobReadStageTimingOptions,
): Readonly<{
  measure<T>(
    stage: NaverNewsBlobReadStageId,
    task: () => Promise<T> | T,
  ): Promise<T>;
}> {
  if (!options.enabled) {
    return Object.freeze({
      async measure<T>(
        _stage: NaverNewsBlobReadStageId,
        task: () => Promise<T> | T,
      ): Promise<T> {
        return task();
      },
    });
  }

  const now = options.now ?? (() => performance.now());
  const log = options.log ?? ((line: string) => console.info(line));

  return Object.freeze({
    async measure<T>(
      stage: NaverNewsBlobReadStageId,
      task: () => Promise<T> | T,
    ): Promise<T> {
      let started: number | null = null;
      try {
        started = now();
      } catch {
        // A failed clock must not stop the underlying Product source read.
      }
      let outcome: NaverNewsBlobReadStageTiming['outcome'] = 'rejected';
      try {
        const result = await task();
        outcome = 'fulfilled';
        return result;
      } finally {
        try {
          const delta = started === null ? Number.NaN : now() - started;
          const durationMs =
            Number.isFinite(delta)
              ? Math.max(0, Math.round(delta))
              : null;
          const record: NaverNewsBlobReadStageTiming = Object.freeze({
            contractVersion: NAVER_NEWS_BLOB_READ_STAGE_TIMING_VERSION,
            stage,
            outcome,
            durationMs,
          });
          log('FANDEX_NAVER_NEWS_BLOB_READ_STAGE=' + JSON.stringify(record));
        } catch {
          // Observability can never replace a read's value or error.
        }
      }
    },
  });
}
