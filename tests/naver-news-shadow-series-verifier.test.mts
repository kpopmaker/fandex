/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import type { NaverNewsCanonicalJobEvidenceReadRepository } from '../lib/server/ingestion/naverNewsCanonicalJobEvidence';
import type { NaverNewsShadowFirstSeenSeriesResult } from '../lib/server/ingestion/naverNewsShadowFirstSeenSeries';
import {
  parseNaverNewsShadowSeriesVerificationCommand,
  runNaverNewsShadowSeriesVerification,
  summarizeNaverNewsShadowSeriesVerification,
} from '../scripts/ingestion/verify-naver-news-shadow-series.mjs';

const protocolStart = '2026-09-15T16:00:00.000Z';
const throughSlotStart = '2026-09-15T17:00:00.000Z';
const command = Object.freeze({ canonicalArtistId: 'iu', protocolStart, throughSlotStart });
const argv = ['--artist', 'iu', '--protocol-start', protocolStart, '--through-slot-start', throughSlotStart];
const runtimeDatabaseUrl = 'postgresql://fandex_runtime:secret@unit-test-pooler.example/neondb';

function fixtureSeries(): NaverNewsShadowFirstSeenSeriesResult {
  return {
    contractVersion: 'v1_naver_news_shadow_first_seen_series',
    lifecycle: 'shadow',
    directProductContributionEligible: false,
    canonicalArtistId: 'iu',
    schedulerVersion: 'v125_naver_news_scheduler_v1',
    protocolStart,
    throughSlotStart,
    expectedSlots: [
      { slotStart: protocolStart, jobId: 'a'.repeat(64) },
      { slotStart: throughSlotStart, jobId: 'b'.repeat(64) },
    ],
    snapshots: [{ title: 'must-not-be-emitted' }, { summary: 'must-not-be-emitted' }] as any,
    status: 'available',
    reason: 'shadow_series_available',
    missingSlotStart: null,
    missingJobId: null,
    activity: {
      contractVersion: 'v1_naver_news_shadow_first_seen_activity',
      metricKey: 'naverNewsShadowFirstSeenActivity',
      lifecycle: 'shadow',
      directProductContributionEligible: false,
      canonicalArtistId: 'iu',
      protocolStart,
      protocol: {
        provider: 'naver-news',
        schedulerVersion: 'v125_naver_news_scheduler_v1',
        cadenceMinutes: 60,
        start: 1,
        display: 100,
        sort: 'date',
        completeCollectionRequired: false,
        observationSetCoverageRequired: 'proven',
      },
      status: 'available',
      reason: 'shadow_series_available',
      slots: [
        {
          slotStart: protocolStart,
          jobId: 'a'.repeat(64),
          collectionCompleteness: 'truncated',
          observedObservationCount: 100,
          firstSeenObservationCount: null,
          firstSeenObservationIds: [],
          bootstrap: true,
        },
        {
          slotStart: throughSlotStart,
          jobId: 'b'.repeat(64),
          collectionCompleteness: 'truncated',
          observedObservationCount: 100,
          firstSeenObservationCount: 0,
          firstSeenObservationIds: [],
          bootstrap: false,
        },
      ],
      unavailableAtSlotStart: null,
    },
  } as NaverNewsShadowFirstSeenSeriesResult;
}

test('CLI requires explicit canonical artist and canonical hourly interval', () => {
  assert.deepEqual(parseNaverNewsShadowSeriesVerificationCommand(argv), command);
  assert.throws(() => parseNaverNewsShadowSeriesVerificationCommand([]), /argument_invalid/);
  assert.throws(() => parseNaverNewsShadowSeriesVerificationCommand(['--artist', 'iu']), /argument_invalid/);
  assert.throws(() => parseNaverNewsShadowSeriesVerificationCommand([
    '--artist', 'unknown-artist', '--protocol-start', protocolStart, '--through-slot-start', throughSlotStart,
  ]), /argument_invalid/);
  assert.throws(() => parseNaverNewsShadowSeriesVerificationCommand([
    '--artist', 'iu', '--protocol-start', '2026-09-15T16:01:00.000Z', '--through-slot-start', throughSlotStart,
  ]), /argument_invalid/);
  assert.throws(() => parseNaverNewsShadowSeriesVerificationCommand([
    '--artist', 'iu', '--protocol-start', throughSlotStart, '--through-slot-start', protocolStart,
  ]), /argument_invalid/);
  assert.throws(() => parseNaverNewsShadowSeriesVerificationCommand([...argv, '--artist', 'iu']), /argument_invalid/);
});

test('verifier creates one hardened runtime pool, invokes the real series seam, and closes the pool', async () => {
  let poolConfig: unknown = null;
  let ended = 0;
  let repositoryPool: unknown = null;
  let observedCommand: unknown = null;
  let observedRepository: unknown = null;
  const repository = { readJobEvidence: async () => null } satisfies NaverNewsCanonicalJobEvidenceReadRepository;
  const pool = {
    async connect() { throw new Error('repository is replaced by test dependency'); },
    async end() { ended += 1; },
  };

  const result = await runNaverNewsShadowSeriesVerification(argv, {
    FANDEX_RUNTIME_DATABASE_URL: runtimeDatabaseUrl,
  }, {
    poolFactory(config) { poolConfig = config; return pool; },
    repositoryFactory(candidatePool) { repositoryPool = candidatePool; return repository; },
    async assemble(input, candidateRepository) {
      observedCommand = input;
      observedRepository = candidateRepository;
      return fixtureSeries();
    },
  });

  assert.deepEqual(observedCommand, command);
  assert.equal(repositoryPool, pool);
  assert.equal(observedRepository, repository);
  assert.equal(ended, 1);
  assert.deepEqual(poolConfig, {
    connectionString: runtimeDatabaseUrl,
    max: 1,
    connectionTimeoutMillis: 5_000,
    query_timeout: 15_000,
    statement_timeout: 15_000,
    ssl: { rejectUnauthorized: true },
  });
  assert.equal(result.status, 'available');
  assert.equal(result.reason, 'shadow_series_available');
  assert.equal(result.expectedSlotCount, 2);
  assert.equal(result.snapshotCount, 2);
  assert.deepEqual(result.activity?.slots.map((slot) => [slot.bootstrap, slot.firstSeenObservationCount]), [
    [true, null],
    [false, 0],
  ]);
});

test('summary returns verification facts without article bodies, observations, or first-seen ID lists', () => {
  const summary = summarizeNaverNewsShadowSeriesVerification(fixtureSeries());
  const serialized = JSON.stringify(summary);
  assert.equal(summary.lifecycle, 'shadow');
  assert.equal(summary.directProductContributionEligible, false);
  assert.doesNotMatch(serialized, /must-not-be-emitted/);
  assert.doesNotMatch(serialized, /firstSeenObservationIds|observations|rawEvidenceIds|sourceRecordIds|title|summary/);
});

test('invalid input and missing runtime DB fail closed without creating a pool', async () => {
  let created = 0;
  const poolFactory = () => {
    created += 1;
    throw new Error('must not create');
  };
  await assert.rejects(
    runNaverNewsShadowSeriesVerification(['--artist', 'iu'], {}, { poolFactory }),
    /argument_invalid/,
  );
  assert.equal(created, 0);
  await assert.rejects(
    runNaverNewsShadowSeriesVerification(argv, {}, { poolFactory }),
    /naver_news_shadow_series_verifier_failed/,
  );
  assert.equal(created, 0);
});

test('verifier source has no collection, mutation, network-fetch, scheduler, or secret-output path', async () => {
  const cliSource = await readFile(
    new URL('../scripts/ingestion/verify-naver-news-shadow-series.mts', import.meta.url),
    'utf8',
  );
  const serverSource = await readFile(
    new URL('../lib/server/ingestion/naverNewsShadowSeriesVerifier.ts', import.meta.url),
    'utf8',
  );
  const source = `${cliSource}\n${serverSource}`;
  assert.doesNotMatch(source, /naverNewsExternalCollector|naverNewsWorker|write-naver-news|dispatch-naver-news|fetch\(|setInterval\(|setTimeout\(|\b(?:INSERT|UPDATE|DELETE|MERGE|TRUNCATE|ALTER|CREATE|DROP|GRANT|REVOKE|CALL|COPY|DO|LOCK)\b/i);
  assert.doesNotMatch(source, /console\.(?:log|debug|info)\(|connectionString\)|FANDEX_RUNTIME_DATABASE_URL\s*\]|raw_payload|normalized_payload/i);
  assert.match(serverSource, /createPostgresNaverNewsCanonicalJobEvidenceReadRepository/);
  assert.match(serverSource, /assembleNaverNewsShadowFirstSeenSeries/);
  assert.match(cliSource, /naverNewsShadowSeriesVerifier/);
});
