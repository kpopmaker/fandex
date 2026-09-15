import { pathToFileURL } from 'node:url';
import { Pool } from 'pg';
import { requireRuntimeDatabaseUrl } from '../../lib/server/persistence/contracts';
import {
  createPostgresNaverNewsCanonicalJobEvidenceReadRepository,
  type NaverNewsCanonicalJobEvidenceReadRepository,
} from '../../lib/server/ingestion/naverNewsCanonicalJobEvidence';
import {
  assembleNaverNewsShadowFirstSeenSeries,
  type NaverNewsShadowFirstSeenSeriesResult,
} from '../../lib/server/ingestion/naverNewsShadowFirstSeenSeries';
import { bindCanonicalArtistToNaverNews } from '../../lib/server/ingestion/naverNewsArtistBinding';
import {
  buildNaverNewsSchedulerPlan,
  NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
} from '../../lib/server/ingestion/naverNewsScheduler';
import type { NaverNewsIngestionPool } from '../../lib/server/ingestion/naverNewsRepository';

const FLAGS = Object.freeze(['--artist', '--protocol-start', '--through-slot-start']);
const ARTIST_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

export type NaverNewsShadowSeriesVerificationCommand = Readonly<{
  canonicalArtistId: string;
  protocolStart: string;
  throughSlotStart: string;
}>;

export type NaverNewsShadowSeriesVerifierPoolConfig = Readonly<{
  connectionString: string;
  max: 1;
  connectionTimeoutMillis: 5_000;
  query_timeout: 15_000;
  statement_timeout: 15_000;
  ssl: Readonly<{ rejectUnauthorized: true }>;
}>;

type VerifierPool = NaverNewsIngestionPool & { end(): Promise<void> };

type SeriesAssembler = (
  input: NaverNewsShadowSeriesVerificationCommand,
  repository: NaverNewsCanonicalJobEvidenceReadRepository,
) => Promise<NaverNewsShadowFirstSeenSeriesResult>;

export type NaverNewsShadowSeriesVerifierDependencies = Readonly<{
  poolFactory?: (config: NaverNewsShadowSeriesVerifierPoolConfig) => VerifierPool;
  repositoryFactory?: (pool: NaverNewsIngestionPool) => NaverNewsCanonicalJobEvidenceReadRepository;
  assemble?: SeriesAssembler;
}>;

function invalid(): never {
  throw new Error('naver_news_shadow_series_verifier_argument_invalid');
}

function valueAfter(argv: readonly string[], index: number): string {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) return invalid();
  return value;
}

function exactIso(value: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) return invalid();
  return timestamp;
}

export function parseNaverNewsShadowSeriesVerificationCommand(
  argv: readonly string[],
): NaverNewsShadowSeriesVerificationCommand {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!FLAGS.includes(flag) || values.has(flag)) return invalid();
    values.set(flag, valueAfter(argv, index));
    index += 1;
  }

  const canonicalArtistId = values.get('--artist');
  const protocolStart = values.get('--protocol-start');
  const throughSlotStart = values.get('--through-slot-start');
  if (!canonicalArtistId || !ARTIST_ID.test(canonicalArtistId) || !protocolStart || !throughSlotStart) {
    return invalid();
  }

  const protocolStartTimestamp = exactIso(protocolStart);
  const throughTimestamp = exactIso(throughSlotStart);
  if (throughTimestamp < protocolStartTimestamp) return invalid();

  let query: string;
  try {
    query = bindCanonicalArtistToNaverNews(canonicalArtistId).query;
  } catch {
    return invalid();
  }

  for (const slotStart of [protocolStart, throughSlotStart]) {
    const plan = buildNaverNewsSchedulerPlan({
      query,
      at: slotStart,
      display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
    });
    if (plan.slotStart !== slotStart) return invalid();
  }

  return Object.freeze({ canonicalArtistId, protocolStart, throughSlotStart });
}

function defaultPool(config: NaverNewsShadowSeriesVerifierPoolConfig): VerifierPool {
  return new Pool(config) as unknown as VerifierPool;
}

export function summarizeNaverNewsShadowSeriesVerification(
  series: NaverNewsShadowFirstSeenSeriesResult,
) {
  const activity = series.activity;
  return Object.freeze({
    contractVersion: series.contractVersion,
    lifecycle: series.lifecycle,
    directProductContributionEligible: series.directProductContributionEligible,
    canonicalArtistId: series.canonicalArtistId,
    schedulerVersion: series.schedulerVersion,
    protocolStart: series.protocolStart,
    throughSlotStart: series.throughSlotStart,
    expectedSlotCount: series.expectedSlots.length,
    snapshotCount: series.snapshots.length,
    status: series.status,
    reason: series.reason,
    missingSlotStart: series.missingSlotStart,
    missingJobId: series.missingJobId,
    activity: activity === null ? null : Object.freeze({
      contractVersion: activity.contractVersion,
      metricKey: activity.metricKey,
      lifecycle: activity.lifecycle,
      directProductContributionEligible: activity.directProductContributionEligible,
      canonicalArtistId: activity.canonicalArtistId,
      protocolStart: activity.protocolStart,
      protocol: activity.protocol,
      status: activity.status,
      reason: activity.reason,
      unavailableAtSlotStart: activity.unavailableAtSlotStart,
      slots: Object.freeze(activity.slots.map((slot) => Object.freeze({
        slotStart: slot.slotStart,
        jobId: slot.jobId,
        collectionCompleteness: slot.collectionCompleteness,
        observedObservationCount: slot.observedObservationCount,
        firstSeenObservationCount: slot.firstSeenObservationCount,
        bootstrap: slot.bootstrap,
      }))),
    }),
  });
}

export async function runNaverNewsShadowSeriesVerification(
  argv: readonly string[],
  environment: Readonly<Record<string, string | undefined>>,
  dependencies: NaverNewsShadowSeriesVerifierDependencies = {},
) {
  const command = parseNaverNewsShadowSeriesVerificationCommand(argv);
  let pool: VerifierPool | null = null;
  let result: ReturnType<typeof summarizeNaverNewsShadowSeriesVerification> | null = null;
  let failed = false;

  try {
    const connectionString = requireRuntimeDatabaseUrl(environment);
    const activePool = (dependencies.poolFactory ?? defaultPool)({
      connectionString,
      max: 1,
      connectionTimeoutMillis: 5_000,
      query_timeout: 15_000,
      statement_timeout: 15_000,
      ssl: { rejectUnauthorized: true },
    });
    pool = activePool;
    const repository = (dependencies.repositoryFactory
      ?? createPostgresNaverNewsCanonicalJobEvidenceReadRepository)(activePool);
    const series = await (dependencies.assemble ?? assembleNaverNewsShadowFirstSeenSeries)(
      command,
      repository,
    );
    result = summarizeNaverNewsShadowSeriesVerification(series);
  } catch {
    failed = true;
  } finally {
    if (pool) {
      try {
        await pool.end();
      } catch {
        failed = true;
      }
    }
  }

  if (failed || result === null) throw new Error('naver_news_shadow_series_verifier_failed');
  return result;
}

export async function main(
  argv = process.argv.slice(2),
  environment: Readonly<Record<string, string | undefined>> = process.env,
) {
  const result = await runNaverNewsShadowSeriesVerification(argv, environment);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch(() => {
    console.error('NAVER News shadow series verification failed closed. No credential, SQL, article content, or database detail was logged.');
    process.exitCode = 1;
  });
}
