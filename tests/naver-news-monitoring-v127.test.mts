/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildNaverNewsSchedulerPlan } from '../lib/server/ingestion/naverNewsScheduler';
import {
  buildNaverNewsMonitoringReport,
  NAVER_NEWS_MONITORING_REPORT_VERSION,
  type NaverNewsMonitoringJobRow,
  type NaverNewsMonitoringOptions,
  type NaverNewsMonitoringSnapshot,
} from '../lib/server/ingestion/naverNewsMonitoringContracts';
import { readNaverNewsMonitoringSnapshot, type NaverNewsMonitoringPool } from '../lib/server/ingestion/naverNewsMonitoringRepository';
import { parseNaverNewsMonitoringCommand, runNaverNewsMonitoring } from '../scripts/ingestion/report-naver-news-monitoring-v127.mjs';

const observedAt = '2026-08-30T12:00:00.000Z';
const options: NaverNewsMonitoringOptions = { query: 'FANDEX', display: 100, recentJobs: 20, recentRuns: 20, freshnessMinutes: 120 };
const baseJob = (overrides: Partial<NaverNewsMonitoringJobRow> = {}): NaverNewsMonitoringJobRow => ({
  jobId: 'a'.repeat(64), collectionKey: 'manual-v127-test', status: 'succeeded', attemptCount: 1, maxAttempts: 8,
  leaseExpiresAt: null, createdAt: '2026-08-30T10:00:00.000Z', updatedAt: '2026-08-30T10:01:00.000Z',
  rawEvidenceCount: 3, normalizedRecordCount: 2, duplicateRecordCount: 1, rejectedItemCount: 0,
  observedRawEvidenceCount: 3, normalizedOutcomeCount: 2, duplicateOutcomeCount: 1, rejectedOutcomeCount: 0,
  linkedEvidenceCount: 3, resolvedNormalizedLinkCount: 3, distinctResolvedNormalizedRecordCount: 2,
  danglingNormalizedReferenceCount: 0, auditEventCount: 6, auditLastSequence: 6,
  auditLastEventType: 'job_succeeded', auditLastEventAt: '2026-08-30T10:01:00.000Z', ...overrides,
});
const snapshot = (jobs: NaverNewsMonitoringJobRow[], overrides: Partial<NaverNewsMonitoringSnapshot> = {}): NaverNewsMonitoringSnapshot => ({
  observedAt, statusCounts: { pending: 0, running: 0, succeeded: jobs.length, retryable_failed: 0, dead_letter: 0 }, expiredRunningCount: 0,
  lastSucceededAt: jobs.length ? '2026-08-30T10:01:00.000Z' : null, jobs, targetSchedulerJob: null, schedulerRuns: [], ...overrides,
});

test('v127 contract distinguishes linked evidence from distinct resolved normalized IDs', () => {
  const report = buildNaverNewsMonitoringReport(snapshot([baseJob()]), options) as any;
  assert.equal(report.reportVersion, NAVER_NEWS_MONITORING_REPORT_VERSION);
  assert.equal(report.overallStatus, 'healthy');
  assert.deepEqual(report.recentJobs[0].observedCounts, {
    rawEvidenceCount: 3, normalizedOutcomeCount: 2, duplicateOutcomeCount: 1, rejectedOutcomeCount: 0,
    linkedEvidenceCount: 3, resolvedNormalizedLinkCount: 3, distinctResolvedNormalizedRecordCount: 2, danglingNormalizedReferenceCount: 0,
  });
  assert.equal(report.recentJobs[0].consistency.normalizedCountMatches, true);
  assert.deepEqual(report.recentJobs[0].normalizedRowCreation, { state: 'not_recorded', createdRowCount: null });
});

test('statuses, attempts, leases, freshness, and overall policy are explicit', () => {
  const jobs = [
    baseJob({ jobId: 'b'.repeat(64), status: 'pending', attemptCount: 0, leaseExpiresAt: null, auditEventCount: 0, auditLastSequence: 0, auditLastEventType: null, auditLastEventAt: null }),
    baseJob({ jobId: 'c'.repeat(64), status: 'running', leaseExpiresAt: '2026-08-30T11:59:59.000Z' }),
    baseJob({ jobId: 'd'.repeat(64), status: 'retryable_failed', attemptCount: 2 }),
    baseJob({ jobId: 'e'.repeat(64), status: 'dead_letter', attemptCount: 8 }),
  ];
  const report = buildNaverNewsMonitoringReport(snapshot(jobs, { statusCounts: { pending: 1, running: 1, succeeded: 0, retryable_failed: 1, dead_letter: 1 }, lastSucceededAt: null }), options) as any;
  assert.equal(report.overallStatus, 'critical');
  assert.equal(report.recentJobs.find((job: any) => job.status === 'running').lease.state, 'expired');
  assert.equal(report.freshness.state, 'no_success');
  const stale = buildNaverNewsMonitoringReport(snapshot([baseJob()], { lastSucceededAt: '2026-08-30T08:00:00.000Z' }), options) as any;
  assert.equal(stale.freshness.state, 'stale');
  assert.equal(stale.overallStatus, 'healthy');
});

test('global expired running aggregate raises attention outside the recentJobs limit', () => {
  const recent = baseJob({ status: 'succeeded' });
  const report = buildNaverNewsMonitoringReport(snapshot([recent], {
    statusCounts: { pending: 0, running: 1, succeeded: 1, retryable_failed: 0, dead_letter: 0 },
    expiredRunningCount: 1,
  }), { ...options, recentJobs: 1 }) as any;
  assert.equal(report.recentJobs.length, 1);
  assert.equal(report.recentJobs[0].status, 'succeeded');
  assert.equal(report.expiredRunningCount, 1);
  assert.equal(report.overallStatus, 'attention');
  const active = buildNaverNewsMonitoringReport(snapshot([recent], {
    statusCounts: { pending: 0, running: 1, succeeded: 1, retryable_failed: 0, dead_letter: 0 }, expiredRunningCount: 0,
  }), options) as any;
  assert.equal(active.overallStatus, 'healthy');
});

test('consistency violations and dangling forward references are critical', () => {
  const report = buildNaverNewsMonitoringReport(snapshot([baseJob({ danglingNormalizedReferenceCount: 1 })]), options) as any;
  assert.equal(report.overallStatus, 'critical');
  assert.equal(report.recentJobs[0].consistency.noDanglingNormalizedReferences, false);
  const mismatch = buildNaverNewsMonitoringReport(snapshot([baseJob({ normalizedRecordCount: 3 })]), options) as any;
  assert.equal(mismatch.overallStatus, 'critical');
  assert.equal(mismatch.recentJobs[0].consistency.state, 'inconsistent');
});

test('no job is no_data and on-demand scheduler not_run is informational', () => {
  const report = buildNaverNewsMonitoringReport(snapshot([]), options) as any;
  assert.equal(report.overallStatus, 'no_data');
  assert.equal(report.scheduler.activation, 'manual-only');
  assert.equal(report.scheduler.expectation, 'on_demand');
  assert.equal(report.scheduler.outcome, 'not_run');
  assert.equal(report.scheduler.detail, 'job_absent');
});

test('scheduler target outcome maps succeeded, pending, running, failures, and absent', () => {
  const plan = buildNaverNewsSchedulerPlan({ query: options.query, display: options.display, at: observedAt });
  const target = baseJob({ jobId: 'f'.repeat(64), collectionKey: plan.collectionKey });
  assert.equal((buildNaverNewsMonitoringReport(snapshot([target], { targetSchedulerJob: target }), options) as any).scheduler.outcome, 'succeeded');
  const pending = { ...target, status: 'pending' as const, attemptCount: 0, auditEventCount: 0, auditLastSequence: 0, auditLastEventType: null, auditLastEventAt: null };
  assert.equal((buildNaverNewsMonitoringReport(snapshot([pending], { targetSchedulerJob: pending }), options) as any).scheduler.detail, 'pending');
  const failed = { ...target, status: 'retryable_failed' as const };
  assert.equal((buildNaverNewsMonitoringReport(snapshot([failed], { targetSchedulerJob: failed }), options) as any).scheduler.outcome, 'failed');
});

test('recent scheduler runs expose only parsed v125 slot and outcome fields', () => {
  const plan = buildNaverNewsSchedulerPlan({ query: options.query, display: options.display, at: observedAt });
  const makeRun = (status: any, leaseExpiresAt: string | null = null, collectionKey = plan.collectionKey) => ({ collectionKey, status, leaseExpiresAt, createdAt: observedAt, updatedAt: observedAt });
  const report = buildNaverNewsMonitoringReport(snapshot([baseJob()], { schedulerRuns: [
    makeRun('succeeded'), makeRun('pending'), makeRun('running', '2026-08-30T12:01:00.000Z'), makeRun('running', '2026-08-30T11:59:00.000Z'), makeRun('retryable_failed'), makeRun('dead_letter'),
  ] }), options) as any;
  assert.deepEqual(report.recentSchedulerRuns.map((run: any) => run.slotOutcome), ['succeeded', 'in_progress', 'in_progress', 'failed', 'failed', 'failed']);
  assert.equal(report.recentSchedulerRuns[0].slotStart, '2026-08-30T12:00:00.000Z');
  assert.equal(report.recentSchedulerRuns[0].jobStatus, 'succeeded');
  assert.deepEqual(Object.keys(report.recentSchedulerRuns[0]).sort(), ['collectionKey', 'jobStatus', 'slotOutcome', 'slotStart']);
  for (const timestamp of ['120100', '120001', '123456']) {
    assert.throws(() => buildNaverNewsMonitoringReport(snapshot([baseJob()], { schedulerRuns: [makeRun('succeeded', null, `sched-v125-naver-news-20260830t${timestamp}z-abcdef123456`)] }), options), /scheduler_key_invalid/);
  }
  assert.throws(() => buildNaverNewsMonitoringReport(snapshot([baseJob()], { schedulerRuns: [makeRun('succeeded', null, 'sched-v125-naver-news-20260230t120000z-abcdef123456')] }), options), /scheduler_key_invalid/);
});

test('CLI arguments are bounded and invalid input fails before DB creation', async () => {
  assert.deepEqual(parseNaverNewsMonitoringCommand(['--query', 'FANDEX']), options);
  assert.deepEqual(parseNaverNewsMonitoringCommand(['--query', '  FＡＮＤＥＸ\t']), { ...options, query: 'FＡＮＤＥＸ' });
  assert.throws(() => parseNaverNewsMonitoringCommand(['--query', '   ']), /argument_invalid/);
  assert.throws(() => parseNaverNewsMonitoringCommand(['--query', '가'.repeat(171)]), /argument_invalid/);
  assert.throws(() => parseNaverNewsMonitoringCommand([]), /argument_invalid/);
  assert.throws(() => parseNaverNewsMonitoringCommand(['--query', 'FANDEX', '--recent-jobs', '51']), /argument_invalid/);
  let created = 0;
  await assert.rejects(runNaverNewsMonitoring(['--query', 'FANDEX', '--bad'], { FANDEX_RUNTIME_DATABASE_URL: 'postgresql://fandex_runtime:x@pooler.example/neondb' }, { poolFactory: () => { created += 1; throw new Error('must not create'); } }), /argument_invalid/);
  await assert.rejects(runNaverNewsMonitoring(['--query', '   '], {}, { poolFactory: () => { created += 1; throw new Error('must not create'); } }), /argument_invalid/);
  assert.equal(created, 0);
});

test('repository uses one read-only snapshot, only allow-listed SQL, rollback, release, and no payload columns', async () => {
  const calls: string[] = [];
  const validJob = baseJob();
  const pool: NaverNewsMonitoringPool = { async connect() {
    return { async query(sql: string) { calls.push(sql); if (sql.startsWith('BEGIN')) return { rowCount: 0, rows: [] } as any; if (sql.startsWith('SELECT CURRENT_TIMESTAMP')) return { rowCount: 1, rows: [{ observed_at: observedAt }] } as any;
      if (sql.includes('GROUP BY status')) return { rowCount: 1, rows: [{ status: 'succeeded', count: 1 }] } as any;
      if (sql.includes("status = 'running' AND lease_expires_at <= CURRENT_TIMESTAMP")) return { rowCount: 1, rows: [{ expired_running_count: 0 }] } as any;
      if (sql.includes('WITH selected_jobs')) return { rowCount: 1, rows: [{ job_id: validJob.jobId, collection_key: validJob.collectionKey, status: validJob.status, attempt_count: 1, max_attempts: 8, lease_expires_at: null, created_at: validJob.createdAt, updated_at: validJob.updatedAt, raw_evidence_count: 3, normalized_record_count: 2, duplicate_record_count: 1, rejected_item_count: 0, observed_raw_evidence_count: 3, normalized_outcome_count: 2, duplicate_outcome_count: 1, rejected_outcome_count: 0, linked_evidence_count: 3, resolved_normalized_link_count: 3, distinct_resolved_normalized_record_count: 2, dangling_normalized_reference_count: 0, audit_event_count: 6, audit_last_sequence: 6, audit_last_event_type: 'job_succeeded', audit_last_event_at: validJob.auditLastEventAt }] } as any;
      if (sql.includes('MAX(a.created_at)')) return { rowCount: 1, rows: [{ last_succeeded_at: validJob.auditLastEventAt }] } as any;
      if (sql.includes('FROM fandex.source_ingestion_jobs WHERE provider = $1 AND collection_key = $2')) return { rowCount: 0, rows: [] } as any;
      if (sql.includes("LIKE 'sched-v125-naver-news-%'")) return { rowCount: 0, rows: [] } as any;
      if (sql.startsWith('ROLLBACK')) return { rowCount: 0, rows: [] } as any;
      throw new Error(`unexpected query ${sql}`);
    }, release() {} };
  } };
  const result = await readNaverNewsMonitoringSnapshot(pool, options);
  assert.equal(result.jobs.length, 1);
  assert.equal(calls[0], 'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  assert.equal(calls.at(-1), 'ROLLBACK');
  assert.equal(calls.filter((sql) => /^\s*(?:SELECT|WITH)\b/i.test(sql)).length, calls.length - 2);
  assert.equal(calls.some((sql) => /\b(?:INSERT|UPDATE|DELETE|MERGE|TRUNCATE|ALTER|CREATE|DROP|GRANT|REVOKE|CALL|COPY|DO|LOCK)\b/i.test(sql)), false);
  assert.equal(calls.some((sql) => /raw_payload|normalized_payload|bounded_payload|request_contract|bounded_error_metadata|claim_token/i.test(sql)), false);
});

test('repository rolls back and redacts malformed/database failures', async () => {
  const calls: string[] = [];
  const pool: NaverNewsMonitoringPool = { async connect() { return { async query(sql: string) { calls.push(sql); if (sql.startsWith('BEGIN')) return { rowCount: 0, rows: [] }; throw new Error('postgresql://user:secret@host/neondb'); }, release() {} }; } };
  await assert.rejects(readNaverNewsMonitoringSnapshot(pool, options), { message: 'naver_news_monitoring_failed' });
  assert.equal(calls.at(-1), 'ROLLBACK');
});

test('CLI output source has no external collector, dispatch, write, cron, migration, or payload leakage path', async () => {
  const source = await readFile(new URL('../scripts/ingestion/report-naver-news-monitoring-v127.mts', import.meta.url), 'utf8');
  const packageJson = await readFile(new URL('../package.json', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /naverNewsExternalCollector|naverNewsWorker|write-naver-news|dispatch-naver-news|fetch\(|setInterval\(|setTimeout\(|cron|migration|INSERT|UPDATE|DELETE|raw_payload|normalized_payload|bounded_payload|request_contract|claim_token|process\.env\s*\[/i);
  assert.match(packageJson, /"test:ingestion:v127": "tsx --test tests\/naver-news-monitoring-v127\.test\.mts"/);
  assert.match(packageJson, /"ingestion:naver-news:monitor": "tsx scripts\/ingestion\/report-naver-news-monitoring-v127\.mts"/);
});
