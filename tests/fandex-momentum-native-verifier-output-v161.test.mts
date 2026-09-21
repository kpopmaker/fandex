import assert from 'node:assert/strict';
import test from 'node:test';

import {
  NAVER_NEWS_MOMENTUM_NATIVE_VERIFIER_OUTPUT_DESCRIPTOR,
  parseNaverNewsMomentumNativeVerifierCommand,
  runNaverNewsMomentumNativeVerifier,
} from '../lib/server/ingestion/naverNewsMomentumNativeVerifier';
import {
  adaptFandexMomentumVerifierOutputToStoredEvidenceAttestationResearch,
} from '../lib/intelligence/fandexMomentumVerifierOutputAttestationAdapterResearch';
import {
  buildNaverNewsJobIdentity,
  NAVER_NEWS_INGESTION_CONTRACT_VERSION,
  NAVER_NEWS_PROVIDER,
  sha256Canonical,
} from '../lib/server/ingestion/naverNewsContracts';
import {
  buildNaverNewsSchedulerPlan,
  NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
} from '../lib/server/ingestion/naverNewsScheduler';
import {
  bindCanonicalArtistToNaverNews,
} from '../lib/server/ingestion/naverNewsArtistBinding';

const SLOT = '2026-09-21T12:00:00.000Z';
const EXECUTED_AT = '2026-09-21T12:50:00.000Z';

function fixture() {
  const binding = bindCanonicalArtistToNaverNews('iu');
  const plan = buildNaverNewsSchedulerPlan({
    query: binding.query,
    at: SLOT,
    display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  });
  const identity = buildNaverNewsJobIdentity(plan.command);

  const rawPayloads = [
    {
      title: 'IU source A',
      originallink: 'https://example.com/a',
      link: 'https://n.news.naver.com/a',
      description: 'A',
      pubDate: 'Sun, 21 Sep 2026 20:00:00 +0900',
    },
    {
      title: 'IU source B',
      originallink: 'https://example.com/b',
      link: 'https://n.news.naver.com/b',
      description: 'B',
      pubDate: 'Sun, 21 Sep 2026 20:01:00 +0900',
    },
  ];

  const evidenceRows = rawPayloads.map((rawPayload, itemIndex) => {
    const rawPayloadSha256 = sha256Canonical(rawPayload);
    const evidenceId = sha256Canonical({
      contractVersion: NAVER_NEWS_INGESTION_CONTRACT_VERSION,
      jobId: identity.jobId,
      itemIndex,
      rawPayloadSha256,
    });
    const normalizedPayload = {
      provider: NAVER_NEWS_PROVIDER,
      sourceType: 'news_article',
      sourceUrl: rawPayload.originallink,
      naverUrl: rawPayload.link,
      sourceHost: 'example.com',
      title: rawPayload.title,
      summary: rawPayload.description,
      publishedAt: new Date(rawPayload.pubDate).toISOString(),
    };
    const recordSha256 = sha256Canonical(normalizedPayload);
    const recordId = sha256Canonical({
      contractVersion: NAVER_NEWS_INGESTION_CONTRACT_VERSION,
      provider: NAVER_NEWS_PROVIDER,
      recordSha256,
    });
    return {
      evidence_id: evidenceId,
      item_index: itemIndex,
      raw_payload: rawPayload,
      raw_payload_sha256: rawPayloadSha256,
      normalization_outcome: 'normalized',
      normalized_record_id: recordId,
      record_id: recordId,
      record_sha256: recordSha256,
      normalized_payload: normalizedPayload,
    };
  });

  return {
    plan,
    identity,
    jobRow: {
      job_id: identity.jobId,
      collection_key: plan.collectionKey,
      request_contract: identity.request,
      status: 'succeeded',
      raw_evidence_count: 2,
      normalized_record_count: 2,
      duplicate_record_count: 0,
      rejected_item_count: 0,
    },
    evidenceRows,
  };
}

function fakePool() {
  const data = fixture();
  const queries: string[] = [];
  let released = false;
  let ended = false;

  const client = {
    async query<T = Record<string, unknown>>(sql: string) {
      queries.push(sql);
      if (sql === 'BEGIN READ ONLY' || sql === 'ROLLBACK') {
        return { rowCount: null, rows: [] as T[] };
      }
      if (sql.includes('FROM fandex.source_ingestion_jobs')) {
        return { rowCount: 1, rows: [data.jobRow as T] };
      }
      if (sql.includes('FROM fandex.source_ingestion_raw_evidence AS raw')) {
        return {
          rowCount: data.evidenceRows.length,
          rows: data.evidenceRows as T[],
        };
      }
      throw new Error('unexpected_query');
    },
    release() {
      released = true;
    },
  };

  const pool = {
    async connect() {
      return client;
    },
    async end() {
      ended = true;
    },
  };

  return {
    data,
    pool,
    queries,
    wasReleased: () => released,
    wasEnded: () => ended,
  };
}

test('v161 is a read-only native verifier-output emitter', () => {
  assert.equal(
    NAVER_NEWS_MOMENTUM_NATIVE_VERIFIER_OUTPUT_DESCRIPTOR.transactionMode,
    'read-only',
  );
  assert.equal(
    NAVER_NEWS_MOMENTUM_NATIVE_VERIFIER_OUTPUT_DESCRIPTOR
      .emitsVerifierGeneratedExecutionId,
    true,
  );
  assert.equal(
    NAVER_NEWS_MOMENTUM_NATIVE_VERIFIER_OUTPUT_DESCRIPTOR.databaseWriteAllowed,
    false,
  );
  assert.equal(
    NAVER_NEWS_MOMENTUM_NATIVE_VERIFIER_OUTPUT_DESCRIPTOR.productionEligible,
    false,
  );
});

test('v161 accepts only an exact scheduler slot boundary', () => {
  assert.deepEqual(
    parseNaverNewsMomentumNativeVerifierCommand({
      canonicalArtistId: 'iu',
      throughSlotStart: SLOT,
    }),
    {
      canonicalArtistId: 'iu',
      throughSlotStart: SLOT,
    },
  );

  assert.throws(
    () => parseNaverNewsMomentumNativeVerifierCommand({
      canonicalArtistId: 'iu',
      throughSlotStart: '2026-09-21T12:15:00.000Z',
    }),
    /naver_news_momentum_native_verifier_slot_invalid/,
  );
});

test('v161 native output for the 12:00Z boundary is accepted directly by v160', async () => {
  const mock = fakePool();
  const result = await runNaverNewsMomentumNativeVerifier(
    {
      canonicalArtistId: 'iu',
      throughSlotStart: SLOT,
    },
    { FANDEX_RUNTIME_DATABASE_URL: 'postgresql://fandex_runtime:test@example.pooler.invalid/neondb' },
    {
      poolFactory: () => mock.pool as any,
      now: () => new Date(EXECUTED_AT),
    },
  );

  assert.equal(
    result.contractVersion,
    'v161_naver_news_momentum_native_verifier_output_v1',
  );
  assert.equal(result.canonicalArtistId, 'iu');
  assert.equal(result.snapshot.naverThroughSlotStart, SLOT);
  assert.equal(result.snapshot.naverEvidenceId, mock.data.identity.jobId);
  assert.equal(
    result.snapshot.naverEvidenceId,
    'd76d5ee3ed512280f3b0055818c38f0c857d8a9e7c9d8621e826ca48b919fb58',
  );
  assert.equal(result.snapshot.naverRawEvidenceCount, 2);
  assert.equal(result.snapshot.naverNormalizedRecordCount, 2);
  assert.equal(result.verifierOutput.executionId.length, 64);
  assert.equal(result.verifierOutput.executedAt, EXECUTED_AT);
  assert.equal(result.verifierOutput.databaseReadOnly, true);
  assert.equal(result.verifierOutput.databaseWritesObserved, 0);
  assert.equal(result.verifierOutput.evidenceRows, 2);
  assert.equal(result.verifierOutput.distinctEvidenceIds, 2);
  assert.equal(result.verifierOutput.distinctItemIndexes, 2);
  assert.equal(result.verifierOutput.minItemIndex, 0);
  assert.equal(result.verifierOutput.maxItemIndex, 1);
  assert.equal(result.verifierOutput.normalizedOutcomes, 2);
  assert.equal(result.verifierOutput.missingNormalizedIds, 0);
  assert.equal(result.verifierOutput.missingNormalizedRecords, 0);
  assert.equal(result.verifierOutput.distinctNormalizedRecords, 2);
  assert.equal(result.verifierOutput.joinedPayloadRows, 2);
  assert.ok(result.verifierOutput.rawPayloadTextBytes > 0);
  assert.ok(result.verifierOutput.normalizedPayloadTextBytes > 0);
  assert.match(result.verifierOutput.rawLinkageSetAuditMd5, /^[0-9a-f]{32}$/);
  assert.match(result.verifierOutput.normalizedSetAuditMd5, /^[0-9a-f]{32}$/);
  assert.match(
    result.verifierOutput.rawPayloadMaterializedAuditMd5,
    /^[0-9a-f]{32}$/,
  );
  assert.match(
    result.verifierOutput.normalizedPayloadMaterializedAuditMd5,
    /^[0-9a-f]{32}$/,
  );

  assert.deepEqual(result.effects, {
    databaseReads: 2,
    databaseWrites: 0,
    productMetricReads: 0,
    productMetricWrites: 0,
    previewFallbackReads: 0,
  });
  assert.equal(mock.queries[0], 'BEGIN READ ONLY');
  assert.equal(mock.queries.at(-1), 'ROLLBACK');
  assert.equal(mock.queries.some((query) => query === 'COMMIT'), false);
  assert.equal(mock.wasReleased(), true);
  assert.equal(mock.wasEnded(), true);

  const adapted =
    adaptFandexMomentumVerifierOutputToStoredEvidenceAttestationResearch({
      snapshot: result.snapshot,
      verifierOutput: result.verifierOutput,
    });
  assert.equal(adapted.state, 'attestation-adapted');
  assert.equal(adapted.verifierOutputAccepted, true);
  assert.deepEqual(adapted.blockers, []);
  assert.notEqual(adapted.attestation, null);
});

test('v161 fails closed when stored raw payload materialization is tampered', async () => {
  const mock = fakePool();
  mock.data.evidenceRows[0].raw_payload = {
    ...mock.data.evidenceRows[0].raw_payload,
    title: 'tampered',
  };

  await assert.rejects(
    () => runNaverNewsMomentumNativeVerifier(
      {
        canonicalArtistId: 'iu',
        throughSlotStart: SLOT,
      },
      { FANDEX_RUNTIME_DATABASE_URL: 'postgresql://fandex_runtime:test@example.pooler.invalid/neondb' },
      {
        poolFactory: () => mock.pool as any,
        now: () => new Date(EXECUTED_AT),
      },
    ),
    /naver_news_momentum_native_verifier_evidence_invalid/,
  );
  assert.equal(mock.queries[0], 'BEGIN READ ONLY');
  assert.ok(mock.queries.includes('ROLLBACK'));
  assert.equal(mock.queries.some((query) => query === 'COMMIT'), false);
});

test('v161 fails closed when the exact job row is unavailable', async () => {
  const mock = fakePool();
  const pool = {
    async connect() {
      return {
        async query<T = Record<string, unknown>>(sql: string) {
          mock.queries.push(sql);
          if (sql === 'BEGIN READ ONLY' || sql === 'ROLLBACK') {
            return { rowCount: null, rows: [] as T[] };
          }
          if (sql.includes('FROM fandex.source_ingestion_jobs')) {
            return { rowCount: 0, rows: [] as T[] };
          }
          throw new Error('unexpected_query');
        },
        release() {},
      };
    },
    async end() {},
  };

  await assert.rejects(
    () => runNaverNewsMomentumNativeVerifier(
      {
        canonicalArtistId: 'iu',
        throughSlotStart: SLOT,
      },
      { FANDEX_RUNTIME_DATABASE_URL: 'postgresql://fandex_runtime:test@example.pooler.invalid/neondb' },
      {
        poolFactory: () => pool as any,
        now: () => new Date(EXECUTED_AT),
      },
    ),
    /naver_news_momentum_native_verifier_job_missing/,
  );
  assert.equal(mock.queries.some((query) => query === 'COMMIT'), false);
});
