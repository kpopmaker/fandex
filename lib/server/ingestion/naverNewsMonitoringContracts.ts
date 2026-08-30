import { buildNaverNewsSchedulerPlan, NAVER_NEWS_SCHEDULER_VERSION } from './naverNewsScheduler';

export const NAVER_NEWS_MONITORING_REPORT_VERSION = 'v127_naver_news_monitoring_v1' as const;
export const NAVER_NEWS_MONITORING_PROVIDER = 'naver-news' as const;
export const NAVER_NEWS_MONITORING_SCHEDULER_ACTIVATION = 'manual-only' as const;
export const NAVER_NEWS_MONITORING_SCHEDULER_EXPECTATION = 'on_demand' as const;

export const NAVER_NEWS_MONITORING_STATUSES = Object.freeze([
  'pending', 'running', 'succeeded', 'retryable_failed', 'dead_letter',
] as const);
export type NaverNewsMonitoringStatus = typeof NAVER_NEWS_MONITORING_STATUSES[number];

export type NaverNewsMonitoringJobRow = Readonly<{
  jobId: string;
  collectionKey: string;
  status: NaverNewsMonitoringStatus;
  attemptCount: number;
  maxAttempts: number;
  leaseExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  rawEvidenceCount: number;
  normalizedRecordCount: number;
  duplicateRecordCount: number;
  rejectedItemCount: number;
  observedRawEvidenceCount: number;
  normalizedOutcomeCount: number;
  duplicateOutcomeCount: number;
  rejectedOutcomeCount: number;
  linkedEvidenceCount: number;
  resolvedNormalizedLinkCount: number;
  distinctResolvedNormalizedRecordCount: number;
  danglingNormalizedReferenceCount: number;
  auditEventCount: number;
  auditLastSequence: number;
  auditLastEventType: string | null;
  auditLastEventAt: string | null;
}>;

export type NaverNewsMonitoringSchedulerRun = Readonly<{
  collectionKey: string;
  status: NaverNewsMonitoringStatus;
  leaseExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type NaverNewsMonitoringSnapshot = Readonly<{
  observedAt: string;
  statusCounts: Readonly<Record<NaverNewsMonitoringStatus, number>>;
  expiredRunningCount: number;
  lastSucceededAt: string | null;
  jobs: readonly NaverNewsMonitoringJobRow[];
  targetSchedulerJob: NaverNewsMonitoringJobRow | null;
  schedulerRuns: readonly NaverNewsMonitoringSchedulerRun[];
}>;

export type NaverNewsMonitoringOptions = Readonly<{
  query: string;
  display: number;
  recentJobs: number;
  recentRuns: number;
  freshnessMinutes: number;
}>;

type LeaseState = 'not_applicable' | 'active' | 'expired';
type SlotOutcome = 'succeeded' | 'failed' | 'in_progress' | 'not_run';
const AUDIT_EVENT_TYPES = new Set(['job_enqueued', 'job_claimed', 'collection_received', 'raw_evidence_prepared', 'normalization_prepared', 'job_succeeded', 'job_retryable_failed', 'job_dead_lettered']);
const V125_HOURLY_COLLECTION_KEY_PATTERN = /^sched-v125-naver-news-(\d{8})t(\d{2})0000z-[0-9a-f]{12}$/;

function finiteInteger(value: unknown, name: string, minimum = 0): number {
  const result = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(result) || result < minimum) throw new Error(`naver_news_monitoring_${name}_invalid`);
  return result;
}

function iso(value: unknown, name: string): string {
  const timestamp = Date.parse(String(value));
  if (!Number.isFinite(timestamp)) throw new Error(`naver_news_monitoring_${name}_invalid`);
  return new Date(timestamp).toISOString();
}

function nullableIso(value: unknown, name: string): string | null {
  return value === null || value === undefined ? null : iso(value, name);
}

function status(value: unknown): NaverNewsMonitoringStatus {
  if (typeof value !== 'string' || !NAVER_NEWS_MONITORING_STATUSES.includes(value as NaverNewsMonitoringStatus)) {
    throw new Error('naver_news_monitoring_status_invalid');
  }
  return value as NaverNewsMonitoringStatus;
}

function jobId(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value)) throw new Error('naver_news_monitoring_job_id_invalid');
  return value;
}

function collectionKey(value: unknown): string {
  if (typeof value !== 'string' || Buffer.byteLength(value, 'utf8') < 1 || Buffer.byteLength(value, 'utf8') > 128
      || !/^[a-z0-9][a-z0-9._:-]*$/.test(value)) throw new Error('naver_news_monitoring_collection_key_invalid');
  return value;
}

function count(value: unknown, name: string): number { return finiteInteger(value, name); }

function validateJob(row: NaverNewsMonitoringJobRow): NaverNewsMonitoringJobRow {
  const validated = {
    ...row,
    jobId: jobId(row.jobId),
    collectionKey: collectionKey(row.collectionKey),
    status: status(row.status),
    attemptCount: count(row.attemptCount, 'attempt_count'),
    maxAttempts: count(row.maxAttempts, 'max_attempts'),
    leaseExpiresAt: nullableIso(row.leaseExpiresAt, 'lease_expires_at'),
    createdAt: iso(row.createdAt, 'created_at'),
    updatedAt: iso(row.updatedAt, 'updated_at'),
    rawEvidenceCount: count(row.rawEvidenceCount, 'raw_evidence_count'),
    normalizedRecordCount: count(row.normalizedRecordCount, 'normalized_record_count'),
    duplicateRecordCount: count(row.duplicateRecordCount, 'duplicate_record_count'),
    rejectedItemCount: count(row.rejectedItemCount, 'rejected_item_count'),
    observedRawEvidenceCount: count(row.observedRawEvidenceCount, 'observed_raw_evidence_count'),
    normalizedOutcomeCount: count(row.normalizedOutcomeCount, 'normalized_outcome_count'),
    duplicateOutcomeCount: count(row.duplicateOutcomeCount, 'duplicate_outcome_count'),
    rejectedOutcomeCount: count(row.rejectedOutcomeCount, 'rejected_outcome_count'),
    linkedEvidenceCount: count(row.linkedEvidenceCount, 'linked_evidence_count'),
    resolvedNormalizedLinkCount: count(row.resolvedNormalizedLinkCount, 'resolved_normalized_link_count'),
    distinctResolvedNormalizedRecordCount: count(row.distinctResolvedNormalizedRecordCount, 'distinct_resolved_normalized_record_count'),
    danglingNormalizedReferenceCount: count(row.danglingNormalizedReferenceCount, 'dangling_normalized_reference_count'),
    auditEventCount: count(row.auditEventCount, 'audit_event_count'),
    auditLastSequence: count(row.auditLastSequence, 'audit_last_sequence'),
    auditLastEventAt: nullableIso(row.auditLastEventAt, 'audit_last_event_at'),
  } satisfies NaverNewsMonitoringJobRow;
  if (validated.attemptCount > validated.maxAttempts || validated.maxAttempts < 1) throw new Error('naver_news_monitoring_attempt_state_invalid');
  if (validated.status === 'running' && validated.leaseExpiresAt === null) throw new Error('naver_news_monitoring_lease_state_invalid');
  if (validated.status !== 'running' && validated.leaseExpiresAt !== null) throw new Error('naver_news_monitoring_lease_state_invalid');
  if (validated.auditEventCount !== 0 && validated.auditLastSequence < 1) throw new Error('naver_news_monitoring_audit_state_invalid');
  if (validated.auditEventCount === 0 && validated.auditLastSequence !== 0) throw new Error('naver_news_monitoring_audit_state_invalid');
  if (validated.auditLastEventAt !== null && validated.auditLastEventType === null) throw new Error('naver_news_monitoring_audit_state_invalid');
  if (validated.auditLastEventType !== null && !AUDIT_EVENT_TYPES.has(validated.auditLastEventType)) throw new Error('naver_news_monitoring_audit_state_invalid');
  return Object.freeze(validated);
}

function validateSchedulerRun(run: NaverNewsMonitoringSchedulerRun): NaverNewsMonitoringSchedulerRun {
  const validated = {
    ...run,
    collectionKey: collectionKey(run.collectionKey),
    status: status(run.status),
    leaseExpiresAt: nullableIso(run.leaseExpiresAt, 'scheduler_lease_expires_at'),
    createdAt: iso(run.createdAt, 'scheduler_created_at'),
    updatedAt: iso(run.updatedAt, 'scheduler_updated_at'),
  } satisfies NaverNewsMonitoringSchedulerRun;
  if (!V125_HOURLY_COLLECTION_KEY_PATTERN.test(validated.collectionKey)) throw new Error('naver_news_monitoring_scheduler_key_invalid');
  if (validated.status === 'running' && validated.leaseExpiresAt === null) throw new Error('naver_news_monitoring_scheduler_lease_invalid');
  if (validated.status !== 'running' && validated.leaseExpiresAt !== null) throw new Error('naver_news_monitoring_scheduler_lease_invalid');
  return Object.freeze(validated);
}

function schedulerSlotStart(collectionKeyValue: string): string {
  const match = V125_HOURLY_COLLECTION_KEY_PATTERN.exec(collectionKeyValue);
  if (!match) throw new Error('naver_news_monitoring_scheduler_key_invalid');
  const stamp = match[1] + match[2] + '0000';
  const year = Number(stamp.slice(0, 4));
  const month = Number(stamp.slice(4, 6));
  const day = Number(stamp.slice(6, 8));
  const hour = Number(stamp.slice(8, 10));
  const minute = Number(stamp.slice(10, 12));
  const second = Number(stamp.slice(12, 14));
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day
      || date.getUTCHours() !== hour || date.getUTCMinutes() !== minute || date.getUTCSeconds() !== second) {
    throw new Error('naver_news_monitoring_scheduler_key_invalid');
  }
  return date.toISOString();
}

function schedulerOutcome(run: NaverNewsMonitoringSchedulerRun, observedAt: string): 'succeeded' | 'failed' | 'in_progress' {
  if (run.status === 'succeeded') return 'succeeded';
  if (run.status === 'pending') return 'in_progress';
  if (run.status === 'running') return run.leaseExpiresAt !== null && Date.parse(run.leaseExpiresAt) <= Date.parse(observedAt) ? 'failed' : 'in_progress';
  return 'failed';
}

function leaseState(job: NaverNewsMonitoringJobRow, observedAt: string): LeaseState {
  if (job.status !== 'running') return 'not_applicable';
  return Date.parse(job.leaseExpiresAt as string) <= Date.parse(observedAt) ? 'expired' : 'active';
}

function consistency(job: NaverNewsMonitoringJobRow) {
  const rawEvidenceCountMatches = job.rawEvidenceCount === job.observedRawEvidenceCount;
  const outcomePartitionMatches = job.normalizedOutcomeCount + job.duplicateOutcomeCount + job.rejectedOutcomeCount === job.observedRawEvidenceCount;
  const normalizedCountMatches = job.normalizedRecordCount === job.distinctResolvedNormalizedRecordCount;
  const duplicateCountMatches = job.duplicateRecordCount === job.duplicateOutcomeCount;
  const rejectedCountMatches = job.rejectedItemCount === job.rejectedOutcomeCount;
  const allNonRejectedEvidenceLinked = job.linkedEvidenceCount === job.normalizedOutcomeCount + job.duplicateOutcomeCount;
  const noDanglingNormalizedReferences = job.danglingNormalizedReferenceCount === 0;
  const auditSequenceContinuous = job.auditEventCount === job.auditLastSequence;
  const state = rawEvidenceCountMatches && outcomePartitionMatches && normalizedCountMatches && duplicateCountMatches
    && rejectedCountMatches && allNonRejectedEvidenceLinked && noDanglingNormalizedReferences && auditSequenceContinuous
    ? 'consistent' as const : 'inconsistent' as const;
  return Object.freeze({ rawEvidenceCountMatches, outcomePartitionMatches, normalizedCountMatches, duplicateCountMatches,
    rejectedCountMatches, allNonRejectedEvidenceLinked, noDanglingNormalizedReferences, auditSequenceContinuous, state });
}

function slotOutcome(job: NaverNewsMonitoringJobRow | null, observedAt: string): { outcome: SlotOutcome; detail: string } {
  if (!job) return { outcome: 'not_run', detail: 'job_absent' };
  if (job.status === 'succeeded') return { outcome: 'succeeded', detail: 'succeeded' };
  if (job.status === 'pending') return { outcome: 'in_progress', detail: 'pending' };
  if (job.status === 'running') return Date.parse(job.leaseExpiresAt as string) <= Date.parse(observedAt)
    ? { outcome: 'failed', detail: 'running_lease_expired' } : { outcome: 'in_progress', detail: 'running' };
  return { outcome: 'failed', detail: job.status };
}

function schedulerSlot(snapshot: NaverNewsMonitoringSnapshot, options: NaverNewsMonitoringOptions) {
  const plan = buildNaverNewsSchedulerPlan({ query: options.query, display: options.display, at: snapshot.observedAt });
  const result = slotOutcome(snapshot.targetSchedulerJob, snapshot.observedAt);
  return Object.freeze({ slotStart: plan.slotStart, collectionKey: plan.collectionKey, outcome: result.outcome,
    detail: result.detail, schedulerVersion: NAVER_NEWS_SCHEDULER_VERSION, activation: NAVER_NEWS_MONITORING_SCHEDULER_ACTIVATION,
    expectation: NAVER_NEWS_MONITORING_SCHEDULER_EXPECTATION });
}

export function buildNaverNewsMonitoringReport(
  snapshot: NaverNewsMonitoringSnapshot,
  options: NaverNewsMonitoringOptions,
): Readonly<Record<string, unknown>> {
  const observedAt = iso(snapshot.observedAt, 'observed_at');
  if (!Number.isSafeInteger(options.display) || options.display < 1 || options.display > 100
      || !Number.isSafeInteger(options.recentJobs) || options.recentJobs < 1 || options.recentJobs > 50
      || !Number.isSafeInteger(options.recentRuns) || options.recentRuns < 1 || options.recentRuns > 50
      || !Number.isSafeInteger(options.freshnessMinutes) || options.freshnessMinutes < 1 || options.freshnessMinutes > 10_080) {
    throw new Error('naver_news_monitoring_options_invalid');
  }
  const jobs = snapshot.jobs.slice(0, options.recentJobs).map(validateJob);
  const target = snapshot.targetSchedulerJob === null ? null : validateJob(snapshot.targetSchedulerJob);
  const allJobs = target && !jobs.some((job) => job.jobId === target.jobId) ? [...jobs, target] : jobs;
  const statuses = NAVER_NEWS_MONITORING_STATUSES.reduce((result, key) => {
    const value = count(snapshot.statusCounts[key], `status_${key}`);
    return { ...result, [key]: value };
  }, {} as Record<NaverNewsMonitoringStatus, number>);
  const hasJobs = Object.values(statuses).some((value) => value > 0);
  const freshnessAt = snapshot.lastSucceededAt === null ? null : iso(snapshot.lastSucceededAt, 'last_succeeded_at');
  const ageMinutes = freshnessAt === null ? null : Math.max(0, Math.floor((Date.parse(observedAt) - Date.parse(freshnessAt)) / 60_000));
  const freshness = Object.freeze({ lastSucceededAt: freshnessAt, ageMinutes, state: freshnessAt === null ? 'no_success' as const
    : ageMinutes as number <= options.freshnessMinutes ? 'fresh' as const : 'stale' as const });
  const recentJobs = allJobs.map((job) => {
    const lease = leaseState(job, observedAt);
    const checks = consistency(job);
    const critical = job.status === 'dead_letter' || checks.state === 'inconsistent' || job.danglingNormalizedReferenceCount > 0;
    return Object.freeze({ jobId: job.jobId, collectionKey: job.collectionKey, status: job.status,
      attempts: Object.freeze({ attemptCount: job.attemptCount, maxAttempts: job.maxAttempts, exhausted: job.attemptCount >= job.maxAttempts }),
      lease: Object.freeze({ expiresAt: job.leaseExpiresAt, state: lease }),
      recordedCounts: Object.freeze({ rawEvidenceCount: job.rawEvidenceCount, normalizedRecordCount: job.normalizedRecordCount,
        duplicateRecordCount: job.duplicateRecordCount, rejectedItemCount: job.rejectedItemCount }),
      observedCounts: Object.freeze({ rawEvidenceCount: job.observedRawEvidenceCount, normalizedOutcomeCount: job.normalizedOutcomeCount,
        duplicateOutcomeCount: job.duplicateOutcomeCount, rejectedOutcomeCount: job.rejectedOutcomeCount, linkedEvidenceCount: job.linkedEvidenceCount,
        resolvedNormalizedLinkCount: job.resolvedNormalizedLinkCount, distinctResolvedNormalizedRecordCount: job.distinctResolvedNormalizedRecordCount,
        danglingNormalizedReferenceCount: job.danglingNormalizedReferenceCount }),
      normalizedRowCreation: Object.freeze({ state: 'not_recorded' as const, createdRowCount: null }),
      consistency: checks,
      audit: Object.freeze({ eventCount: job.auditEventCount, lastSequence: job.auditLastSequence,
        lastEventType: job.auditLastEventType, lastEventAt: job.auditLastEventAt }),
      _critical: critical,
      _attention: job.status === 'retryable_failed' || lease === 'expired',
    });
  });
  const expiredRunningCount = finiteInteger(snapshot.expiredRunningCount, 'expired_running_count');
  const critical = recentJobs.some((job) => job._critical) || statuses.dead_letter > 0;
  const attention = recentJobs.some((job) => job._attention) || statuses.retryable_failed > 0 || expiredRunningCount > 0;
  const overallStatus = !hasJobs ? 'no_data' as const : critical ? 'critical' as const : attention ? 'attention' as const : 'healthy' as const;
  const sanitizedJobs = recentJobs.map((job) => {
    const { _critical, _attention, ...safeJob } = job;
    void _critical;
    void _attention;
    return safeJob;
  });
  return Object.freeze({ mode: 'production-monitor-read-only' as const, reportVersion: NAVER_NEWS_MONITORING_REPORT_VERSION,
    observedAt, provider: NAVER_NEWS_MONITORING_PROVIDER, overallStatus,
    limits: Object.freeze({ display: options.display, recentJobs: options.recentJobs, recentRuns: options.recentRuns, freshnessMinutes: options.freshnessMinutes }),
    statusCounts: Object.freeze(statuses), expiredRunningCount,
    freshness, recentJobs: Object.freeze(sanitizedJobs), scheduler: schedulerSlot({ ...snapshot, observedAt }, options),
    recentSchedulerRuns: Object.freeze(snapshot.schedulerRuns.slice(0, options.recentRuns).map((run) => {
      const validated = validateSchedulerRun(run);
      return Object.freeze({ slotStart: schedulerSlotStart(validated.collectionKey), collectionKey: validated.collectionKey,
        jobStatus: validated.status, slotOutcome: schedulerOutcome(validated, observedAt) });
    })),
    effects: Object.freeze({ apiCalls: 0, databaseWrites: 0, schedulerDispatches: 0, retriesTriggered: 0,
      schedulesActivated: 0, migrationsApplied: 0, environmentMutations: 0 }),
  });
}
