import {
  buildNaverNewsJobIdentity,
  canonicalJson,
  isSha256,
  NAVER_NEWS_PROVIDER,
} from './naverNewsContracts';
import type { NaverNewsIngestionPool } from './naverNewsRepository';
import { bindCanonicalArtistToNaverNews } from './naverNewsArtistBinding';
import { getOfficialNaverNewsShadowEpoch } from './naverNewsShadowEpoch';
import {
  buildNaverNewsSchedulerPlan,
  NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  NAVER_NEWS_SCHEDULER_VERSION,
} from './naverNewsScheduler';

export const NAVER_NEWS_LATEST_OFFICIAL_SHADOW_SLOT_CONTRACT_VERSION =
  'v1_naver_news_latest_official_shadow_slot' as const;

const SCHEDULER_COLLECTION_KEY_PREFIX = 'sched-v125-naver-news-' as const;
const COLLECTION_KEY_PATTERN =
  /^sched-v125-naver-news-(\d{8}t\d{6}z)-([0-9a-f]{12})$/;

type QueryResultLike<T> = Readonly<{
  rowCount: number | null;
  rows: T[];
}>;

type Queryable = Readonly<{
  query<T = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<QueryResultLike<T>>;
}>;

type StoredJobRow = Readonly<{
  job_id: unknown;
  collection_key: unknown;
  request_contract: unknown;
}>;

export type NaverNewsSucceededSchedulerJob = Readonly<{
  jobId: string;
  collectionKey: string;
  requestContract: unknown;
}>;

export type NaverNewsLatestOfficialShadowSlotReadRepository = Readonly<{
  readSucceededSchedulerJobs(): Promise<
    readonly NaverNewsSucceededSchedulerJob[]
  >;
}>;

export type NaverNewsLatestOfficialShadowSlotResult =
  | Readonly<{
      contractVersion:
        typeof NAVER_NEWS_LATEST_OFFICIAL_SHADOW_SLOT_CONTRACT_VERSION;
      status: 'ok';
      canonicalArtistId: 'iu';
      schedulerVersion: typeof NAVER_NEWS_SCHEDULER_VERSION;
      protocolStart: string;
      throughSlotStart: string;
      jobId: string;
      collectionKey: string;
    }>
  | Readonly<{
      contractVersion:
        typeof NAVER_NEWS_LATEST_OFFICIAL_SHADOW_SLOT_CONTRACT_VERSION;
      status: 'data-issue';
      canonicalArtistId: 'iu';
      reason:
        | 'latest-slot-repository-read-failed'
        | 'latest-slot-stored-job-invalid'
        | 'latest-slot-not-found';
    }>;

const SUCCEEDED_SCHEDULER_JOBS_SQL = `SELECT
  job_id, collection_key, request_contract
FROM fandex.source_ingestion_jobs
WHERE provider = $1
  AND status = 'succeeded'
  AND collection_key LIKE $2
ORDER BY collection_key DESC`;

function dataIssue(
  reason: Extract<
    NaverNewsLatestOfficialShadowSlotResult,
    { status: 'data-issue' }
  >['reason'],
): NaverNewsLatestOfficialShadowSlotResult {
  return Object.freeze({
    contractVersion:
      NAVER_NEWS_LATEST_OFFICIAL_SHADOW_SLOT_CONTRACT_VERSION,
    status: 'data-issue' as const,
    canonicalArtistId: 'iu' as const,
    reason,
  });
}

function asStoredJob(row: StoredJobRow): NaverNewsSucceededSchedulerJob {
  if (
    typeof row.job_id !== 'string'
    || !isSha256(row.job_id)
    || typeof row.collection_key !== 'string'
    || !COLLECTION_KEY_PATTERN.test(row.collection_key)
    || row.request_contract === null
    || typeof row.request_contract !== 'object'
    || Array.isArray(row.request_contract)
  ) {
    throw new Error('naver_news_latest_official_slot_stored_job_invalid');
  }

  return Object.freeze({
    jobId: row.job_id,
    collectionKey: row.collection_key,
    requestContract: row.request_contract,
  });
}

function slotFromCollectionKey(collectionKey: string): string | null {
  const match = COLLECTION_KEY_PATTERN.exec(collectionKey);
  if (!match) return null;

  const stamp = match[1];
  const iso = [
    stamp.slice(0, 4),
    '-',
    stamp.slice(4, 6),
    '-',
    stamp.slice(6, 8),
    'T',
    stamp.slice(9, 11),
    ':',
    stamp.slice(11, 13),
    ':',
    stamp.slice(13, 15),
    '.000Z',
  ].join('');

  const timestamp = Date.parse(iso);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== iso) {
    return null;
  }

  return iso;
}

export function createPostgresNaverNewsLatestOfficialShadowSlotRepository(
  pool: NaverNewsIngestionPool,
): NaverNewsLatestOfficialShadowSlotReadRepository {
  return Object.freeze({
    async readSucceededSchedulerJobs() {
      const client: Queryable & { release(): void } = await pool.connect();
      try {
        await client.query('BEGIN READ ONLY');
        const result = await client.query<StoredJobRow>(
          SUCCEEDED_SCHEDULER_JOBS_SQL,
          [NAVER_NEWS_PROVIDER, `${SCHEDULER_COLLECTION_KEY_PREFIX}%`],
        );
        await client.query('ROLLBACK');
        return Object.freeze(result.rows.map(asStoredJob));
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // Fail closed below.
        }
        if (
          error instanceof Error
          && error.message
            === 'naver_news_latest_official_slot_stored_job_invalid'
        ) {
          throw error;
        }
        throw new Error('naver_news_latest_official_slot_read_failed');
      } finally {
        client.release();
      }
    },
  });
}

export async function resolveLatestOfficialNaverNewsShadowThroughSlotStart(
  repository: NaverNewsLatestOfficialShadowSlotReadRepository,
): Promise<NaverNewsLatestOfficialShadowSlotResult> {
  const binding = bindCanonicalArtistToNaverNews('iu');
  const epoch = getOfficialNaverNewsShadowEpoch(binding.canonicalArtistId);

  let jobs: readonly NaverNewsSucceededSchedulerJob[];
  try {
    jobs = await repository.readSucceededSchedulerJobs();
  } catch (error) {
    return dataIssue(
      error instanceof Error
        && error.message
          === 'naver_news_latest_official_slot_stored_job_invalid'
        ? 'latest-slot-stored-job-invalid'
        : 'latest-slot-repository-read-failed',
    );
  }

  const protocolStartTimestamp = Date.parse(epoch.protocolStart);
  let latest: Readonly<{
    slotStart: string;
    timestamp: number;
    jobId: string;
    collectionKey: string;
  }> | null = null;

  for (const job of jobs) {
    const slotStart = slotFromCollectionKey(job.collectionKey);
    if (!slotStart) {
      return dataIssue('latest-slot-stored-job-invalid');
    }

    const timestamp = Date.parse(slotStart);
    if (timestamp < protocolStartTimestamp) continue;

    const plan = buildNaverNewsSchedulerPlan({
      query: binding.query,
      at: slotStart,
      display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
    });
    const identity = buildNaverNewsJobIdentity(plan.command);

    const exactOfficialProtocol =
      plan.slotStart === slotStart
      && plan.collectionKey === job.collectionKey
      && identity.jobId === job.jobId
      && canonicalJson(identity.request)
        === canonicalJson(job.requestContract);

    if (!exactOfficialProtocol) continue;

    if (latest === null || timestamp > latest.timestamp) {
      latest = Object.freeze({
        slotStart,
        timestamp,
        jobId: job.jobId,
        collectionKey: job.collectionKey,
      });
    }
  }

  if (latest === null) {
    return dataIssue('latest-slot-not-found');
  }

  return Object.freeze({
    contractVersion:
      NAVER_NEWS_LATEST_OFFICIAL_SHADOW_SLOT_CONTRACT_VERSION,
    status: 'ok' as const,
    canonicalArtistId: 'iu' as const,
    schedulerVersion: NAVER_NEWS_SCHEDULER_VERSION,
    protocolStart: epoch.protocolStart,
    throughSlotStart: latest.slotStart,
    jobId: latest.jobId,
    collectionKey: latest.collectionKey,
  });
}
