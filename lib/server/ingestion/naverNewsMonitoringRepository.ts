import {
  buildNaverNewsSchedulerPlan,
  type NaverNewsSchedulerPlan,
} from './naverNewsScheduler';
import {
  NAVER_NEWS_MONITORING_PROVIDER,
  type NaverNewsMonitoringJobRow,
  type NaverNewsMonitoringOptions,
  type NaverNewsMonitoringSchedulerRun,
  type NaverNewsMonitoringSnapshot,
  type NaverNewsMonitoringStatus,
} from './naverNewsMonitoringContracts';

type QueryResult<T> = { rowCount: number | null; rows: T[] };
export type NaverNewsMonitoringQueryable = {
  query<T = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<QueryResult<T>>;
};
export type NaverNewsMonitoringPool = { connect(): Promise<NaverNewsMonitoringQueryable & { release(): void }> };

type JobDbRow = Record<string, unknown>;
type StatusDbRow = { status: string; count: number | string };
type ClockDbRow = { observed_at: string | Date };
type SchedulerDbRow = JobDbRow;

function fail(): never { throw new Error('naver_news_monitoring_failed'); }
function asString(value: unknown): string { if (typeof value !== 'string' && !(value instanceof Date)) return fail(); return String(value); }
function asNullableString(value: unknown): string | null { return value === null || value === undefined ? null : asString(value); }
function asInt(value: unknown): number { const result = Number(value); if (!Number.isSafeInteger(result) || result < 0) return fail(); return result; }

function mapJob(row: JobDbRow): NaverNewsMonitoringJobRow {
  return {
    jobId: asString(row.job_id), collectionKey: asString(row.collection_key), status: row.status as NaverNewsMonitoringStatus,
    attemptCount: asInt(row.attempt_count), maxAttempts: asInt(row.max_attempts), leaseExpiresAt: asNullableString(row.lease_expires_at),
    createdAt: asString(row.created_at), updatedAt: asString(row.updated_at), rawEvidenceCount: asInt(row.raw_evidence_count),
    normalizedRecordCount: asInt(row.normalized_record_count), duplicateRecordCount: asInt(row.duplicate_record_count), rejectedItemCount: asInt(row.rejected_item_count),
    observedRawEvidenceCount: asInt(row.observed_raw_evidence_count), normalizedOutcomeCount: asInt(row.normalized_outcome_count),
    duplicateOutcomeCount: asInt(row.duplicate_outcome_count), rejectedOutcomeCount: asInt(row.rejected_outcome_count), linkedEvidenceCount: asInt(row.linked_evidence_count),
    resolvedNormalizedLinkCount: asInt(row.resolved_normalized_link_count), distinctResolvedNormalizedRecordCount: asInt(row.distinct_resolved_normalized_record_count),
    danglingNormalizedReferenceCount: asInt(row.dangling_normalized_reference_count), auditEventCount: asInt(row.audit_event_count),
    auditLastSequence: asInt(row.audit_last_sequence), auditLastEventType: asNullableString(row.audit_last_event_type), auditLastEventAt: asNullableString(row.audit_last_event_at),
  };
}

const JOB_METRICS_SQL = `
WITH selected_jobs AS (
  SELECT job_id, collection_key, status, attempt_count, max_attempts, lease_expires_at, created_at, updated_at,
    raw_evidence_count, normalized_record_count, duplicate_record_count, rejected_item_count
  FROM fandex.source_ingestion_jobs
  WHERE provider = $1
  ORDER BY created_at DESC
  LIMIT $2
), evidence_metrics AS (
  SELECT sj.job_id,
    COUNT(re.evidence_id)::int AS observed_raw_evidence_count,
    COUNT(re.evidence_id) FILTER (WHERE re.normalization_outcome = 'normalized')::int AS normalized_outcome_count,
    COUNT(re.evidence_id) FILTER (WHERE re.normalization_outcome = 'duplicate')::int AS duplicate_outcome_count,
    COUNT(re.evidence_id) FILTER (WHERE re.normalization_outcome = 'rejected')::int AS rejected_outcome_count,
    COUNT(re.evidence_id) FILTER (WHERE re.normalized_record_id IS NOT NULL)::int AS linked_evidence_count,
    COUNT(re.evidence_id) FILTER (WHERE re.normalized_record_id IS NOT NULL AND nr.record_id IS NOT NULL)::int AS resolved_normalized_link_count,
    COUNT(DISTINCT re.normalized_record_id) FILTER (WHERE re.normalization_outcome IN ('normalized','duplicate') AND nr.record_id IS NOT NULL)::int AS distinct_resolved_normalized_record_count,
    COUNT(re.evidence_id) FILTER (WHERE re.normalized_record_id IS NOT NULL AND nr.record_id IS NULL)::int AS dangling_normalized_reference_count
  FROM selected_jobs sj
  LEFT JOIN fandex.source_ingestion_raw_evidence re ON re.job_id = sj.job_id
  LEFT JOIN fandex.source_ingestion_normalized_records nr ON nr.record_id = re.normalized_record_id
  GROUP BY sj.job_id
), audit_metrics AS (
  SELECT sj.job_id, COUNT(a.sequence)::int AS audit_event_count, COALESCE(MAX(a.sequence), 0)::int AS audit_last_sequence,
    (array_agg(a.event_type ORDER BY a.sequence DESC))[1] AS audit_last_event_type,
    (array_agg(a.created_at ORDER BY a.sequence DESC))[1] AS audit_last_event_at
  FROM selected_jobs sj
  LEFT JOIN fandex.source_ingestion_audit_events a ON a.job_id = sj.job_id
  GROUP BY sj.job_id
)
SELECT sj.*, COALESCE(em.observed_raw_evidence_count,0) AS observed_raw_evidence_count,
  COALESCE(em.normalized_outcome_count,0) AS normalized_outcome_count, COALESCE(em.duplicate_outcome_count,0) AS duplicate_outcome_count,
  COALESCE(em.rejected_outcome_count,0) AS rejected_outcome_count, COALESCE(em.linked_evidence_count,0) AS linked_evidence_count,
  COALESCE(em.resolved_normalized_link_count,0) AS resolved_normalized_link_count,
  COALESCE(em.distinct_resolved_normalized_record_count,0) AS distinct_resolved_normalized_record_count,
  COALESCE(em.dangling_normalized_reference_count,0) AS dangling_normalized_reference_count,
  COALESCE(am.audit_event_count,0) AS audit_event_count, COALESCE(am.audit_last_sequence,0) AS audit_last_sequence,
  am.audit_last_event_type, am.audit_last_event_at
FROM selected_jobs sj JOIN evidence_metrics em ON em.job_id = sj.job_id JOIN audit_metrics am ON am.job_id = sj.job_id
ORDER BY sj.created_at DESC`;

const TARGET_JOB_SQL = `SELECT job_id, collection_key, status, attempt_count, max_attempts, lease_expires_at, created_at, updated_at,
  raw_evidence_count, normalized_record_count, duplicate_record_count, rejected_item_count,
  0::int AS observed_raw_evidence_count, 0::int AS normalized_outcome_count, 0::int AS duplicate_outcome_count,
  0::int AS rejected_outcome_count, 0::int AS linked_evidence_count, 0::int AS resolved_normalized_link_count,
  0::int AS distinct_resolved_normalized_record_count, 0::int AS dangling_normalized_reference_count,
  0::int AS audit_event_count, 0::int AS audit_last_sequence, NULL::text AS audit_last_event_type, NULL::timestamptz AS audit_last_event_at
FROM fandex.source_ingestion_jobs WHERE provider = $1 AND collection_key = $2`;

const TARGET_METRICS_SQL = `
WITH evidence_metrics AS (
  SELECT j.job_id, COUNT(re.evidence_id)::int AS observed_raw_evidence_count,
    COUNT(re.evidence_id) FILTER (WHERE re.normalization_outcome='normalized')::int AS normalized_outcome_count,
    COUNT(re.evidence_id) FILTER (WHERE re.normalization_outcome='duplicate')::int AS duplicate_outcome_count,
    COUNT(re.evidence_id) FILTER (WHERE re.normalization_outcome='rejected')::int AS rejected_outcome_count,
    COUNT(re.evidence_id) FILTER (WHERE re.normalized_record_id IS NOT NULL)::int AS linked_evidence_count,
    COUNT(re.evidence_id) FILTER (WHERE re.normalized_record_id IS NOT NULL AND nr.record_id IS NOT NULL)::int AS resolved_normalized_link_count,
    COUNT(DISTINCT re.normalized_record_id) FILTER (WHERE re.normalization_outcome IN ('normalized','duplicate') AND nr.record_id IS NOT NULL)::int AS distinct_resolved_normalized_record_count,
    COUNT(re.evidence_id) FILTER (WHERE re.normalized_record_id IS NOT NULL AND nr.record_id IS NULL)::int AS dangling_normalized_reference_count
  FROM fandex.source_ingestion_jobs j
  LEFT JOIN fandex.source_ingestion_raw_evidence re ON re.job_id=j.job_id
  LEFT JOIN fandex.source_ingestion_normalized_records nr ON nr.record_id=re.normalized_record_id
  WHERE j.provider=$1 AND j.collection_key=$2 GROUP BY j.job_id
), audit_metrics AS (
  SELECT j.job_id, COUNT(a.sequence)::int AS audit_event_count, COALESCE(MAX(a.sequence),0)::int AS audit_last_sequence,
    (array_agg(a.event_type ORDER BY a.sequence DESC))[1] AS audit_last_event_type,
    (array_agg(a.created_at ORDER BY a.sequence DESC))[1] AS audit_last_event_at
  FROM fandex.source_ingestion_jobs j LEFT JOIN fandex.source_ingestion_audit_events a ON a.job_id=j.job_id
  WHERE j.provider=$1 AND j.collection_key=$2 GROUP BY j.job_id
)
SELECT em.*, am.audit_event_count, am.audit_last_sequence, am.audit_last_event_type, am.audit_last_event_at
FROM evidence_metrics em JOIN audit_metrics am ON am.job_id=em.job_id`;

export async function readNaverNewsMonitoringSnapshot(
  pool: NaverNewsMonitoringPool,
  options: NaverNewsMonitoringOptions,
): Promise<NaverNewsMonitoringSnapshot> {
  let client: NaverNewsMonitoringQueryable & { release(): void };
  try { client = await pool.connect(); } catch { return fail(); }
  try {
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const clock = await client.query<ClockDbRow>('SELECT CURRENT_TIMESTAMP AS observed_at');
    const observedAt = asString(clock.rows[0]?.observed_at);
    const plan: NaverNewsSchedulerPlan = buildNaverNewsSchedulerPlan({ query: options.query, display: options.display, at: observedAt });
    const statuses = await client.query<StatusDbRow>(`SELECT status, COUNT(*)::int AS count FROM fandex.source_ingestion_jobs WHERE provider = $1 GROUP BY status`, [NAVER_NEWS_MONITORING_PROVIDER]);
    const statusCounts = { pending: 0, running: 0, succeeded: 0, retryable_failed: 0, dead_letter: 0 } as Record<NaverNewsMonitoringStatus, number>;
    for (const row of statuses.rows) {
      if (!Object.hasOwn(statusCounts, row.status)) return fail();
      statusCounts[row.status as NaverNewsMonitoringStatus] = asInt(row.count);
    }
    const jobsResult = await client.query<JobDbRow>(JOB_METRICS_SQL, [NAVER_NEWS_MONITORING_PROVIDER, options.recentJobs]);
    const jobs = jobsResult.rows.map(mapJob);
    const success = await client.query<{ last_succeeded_at: string | Date | null }>(`SELECT MAX(a.created_at) FILTER (WHERE a.event_type = 'job_succeeded') AS last_succeeded_at FROM fandex.source_ingestion_audit_events a JOIN fandex.source_ingestion_jobs j ON j.job_id=a.job_id WHERE j.provider=$1`, [NAVER_NEWS_MONITORING_PROVIDER]);
    const targetResult = await client.query<JobDbRow>(TARGET_JOB_SQL, [NAVER_NEWS_MONITORING_PROVIDER, plan.collectionKey]);
    let target: NaverNewsMonitoringJobRow | null = targetResult.rows[0] ? mapJob(targetResult.rows[0]) : null;
    if (target) {
      const metrics = await client.query<JobDbRow>(TARGET_METRICS_SQL, [NAVER_NEWS_MONITORING_PROVIDER, plan.collectionKey]);
      if (metrics.rows.length !== 1) return fail();
      target = mapJob({ ...targetResult.rows[0], ...metrics.rows[0] });
    }
    const runs = await client.query<SchedulerDbRow>(`SELECT collection_key, status, lease_expires_at, created_at, updated_at FROM fandex.source_ingestion_jobs WHERE provider=$1 AND collection_key LIKE 'sched-v125-naver-news-%' ORDER BY created_at DESC LIMIT $2`, [NAVER_NEWS_MONITORING_PROVIDER, options.recentRuns]);
    const schedulerRuns: NaverNewsMonitoringSchedulerRun[] = runs.rows.map((row) => ({ collectionKey: asString(row.collection_key), status: row.status as NaverNewsMonitoringStatus,
      leaseExpiresAt: asNullableString(row.lease_expires_at), createdAt: asString(row.created_at), updatedAt: asString(row.updated_at) }));
    await client.query('ROLLBACK');
    return Object.freeze({ observedAt, statusCounts: Object.freeze(statusCounts), lastSucceededAt: success.rows[0]?.last_succeeded_at === null || success.rows[0]?.last_succeeded_at === undefined ? null : asString(success.rows[0].last_succeeded_at), jobs: Object.freeze(jobs), targetSchedulerJob: target, schedulerRuns: Object.freeze(schedulerRuns) });
  } catch { try { await client.query('ROLLBACK'); } catch { /* bounded failure */ } return fail();
  } finally { try { client.release(); } catch { throw new Error('naver_news_monitoring_failed'); } }
}
