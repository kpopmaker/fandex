import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptFandexMomentumVerifierOutputToStoredEvidenceAttestationRuntime,
} from '../lib/server/ingestion/naverNewsMomentumVerifierRuntimeAttestation';
import {
  NAVER_NEWS_MOMENTUM_NATIVE_VERIFIER_OUTPUT_DESCRIPTOR,
  parseNaverNewsMomentumNativeVerifierCommand,
  runNaverNewsMomentumNativeVerifier,
} from '../lib/server/ingestion/naverNewsMomentumNativeVerifier';
import {
  NAVER_NEWS_MOMENTUM_VERIFIER_EXECUTION_CHANNEL_DESCRIPTOR,
  readNaverNewsMomentumVerifierExecutionChannelConfig,
  runNaverNewsMomentumVerifierExecutionChannel,
} from '../lib/server/ingestion/naverNewsMomentumVerifierExecutionChannel';
import { bindCanonicalArtistToNaverNews } from '../lib/server/ingestion/naverNewsArtistBinding';
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

const SLOT = '2026-09-21T12:00:00.000Z';
const EXECUTED_AT = '2026-09-21T12:50:00.000Z';
const SECRET = 'current-main-runtime-verifier-secret';

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
    identity,
    plan,
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
  return {
    data,
    queries,
    pool: {
      async connect() {
        return client;
      },
      async end() {
        ended = true;
      },
    },
    wasReleased: () => released,
    wasEnded: () => ended,
  };
}

test('current-main verifier preserves read-only research boundary', () => {
  assert.equal(
    NAVER_NEWS_MOMENTUM_NATIVE_VERIFIER_OUTPUT_DESCRIPTOR.transactionMode,
    'read-only',
  );
  assert.equal(
    NAVER_NEWS_MOMENTUM_NATIVE_VERIFIER_OUTPUT_DESCRIPTOR.databaseWriteAllowed,
    false,
  );
  assert.equal(
    NAVER_NEWS_MOMENTUM_NATIVE_VERIFIER_OUTPUT_DESCRIPTOR.productionEligible,
    false,
  );
  assert.equal(
    NAVER_NEWS_MOMENTUM_VERIFIER_EXECUTION_CHANNEL_DESCRIPTOR
      .productionRuntimeOnly,
    true,
  );
  assert.equal(
    NAVER_NEWS_MOMENTUM_VERIFIER_EXECUTION_CHANNEL_DESCRIPTOR
      .previewExecutionAllowed,
    false,
  );
  assert.equal(
    NAVER_NEWS_MOMENTUM_VERIFIER_EXECUTION_CHANNEL_DESCRIPTOR
      .productionActivationAllowed,
    false,
  );
});

test('current-main verifier accepts only exact scheduler boundaries', () => {
  assert.equal(
    parseNaverNewsMomentumNativeVerifierCommand({
      canonicalArtistId: 'iu',
      throughSlotStart: SLOT,
    }).throughSlotStart,
    SLOT,
  );
  assert.throws(
    () => parseNaverNewsMomentumNativeVerifierCommand({
      canonicalArtistId: 'iu',
      throughSlotStart: '2026-09-21T12:15:00.000Z',
    }),
    /naver_news_momentum_native_verifier_slot_invalid/,
  );
});

test('native verifier reproduces Stored Evidence read-only and v160 runtime attestation accepts it', async () => {
  const mock = fakePool();
  const result = await runNaverNewsMomentumNativeVerifier(
    { canonicalArtistId: 'iu', throughSlotStart: SLOT },
    {
      FANDEX_RUNTIME_DATABASE_URL:
        'postgresql://fandex_runtime:test@example.pooler.invalid/neondb',
    },
    {
      poolFactory: () => mock.pool as any,
      now: () => new Date(EXECUTED_AT),
    },
  );

  assert.equal(result.snapshot.naverEvidenceId, mock.data.identity.jobId);
  assert.equal(result.verifierOutput.databaseReadOnly, true);
  assert.equal(result.verifierOutput.databaseWritesObserved, 0);
  assert.equal(result.verifierOutput.evidenceRows, 2);
  assert.equal(mock.queries[0], 'BEGIN READ ONLY');
  assert.equal(mock.queries.at(-1), 'ROLLBACK');
  assert.equal(mock.queries.includes('COMMIT'), false);
  assert.equal(mock.wasReleased(), true);
  assert.equal(mock.wasEnded(), true);

  const adapted =
    adaptFandexMomentumVerifierOutputToStoredEvidenceAttestationRuntime({
      snapshot: result.snapshot,
      verifierOutput: result.verifierOutput,
    });
  assert.equal(adapted.state, 'attestation-adapted');
  assert.equal(adapted.verifierOutputAccepted, true);
  assert.deepEqual(adapted.blockers, []);
  assert.notEqual(adapted.attestation, null);
});

test('execution channel rejects Preview before verifier invocation', async () => {
  const environment = {
    VERCEL_ENV: 'preview',
    FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED:
      'approved-v162-research-read-only',
    FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT: 'production',
    FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET: SECRET,
  };
  assert.throws(
    () => readNaverNewsMomentumVerifierExecutionChannelConfig(environment),
    /naver_news_momentum_verifier_execution_channel_rejected/,
  );

  let calls = 0;
  await assert.rejects(
    () => runNaverNewsMomentumVerifierExecutionChannel(
      {
        environment,
        authorizationHeader: 'Bearer ' + SECRET,
        requestBody: {
          contractVersion:
            'v162_naver_news_momentum_native_verifier_execution_request_v1',
          purpose: 'momentum-native-verifier-read-only',
          canonicalArtistId: 'iu',
          throughSlotStart: SLOT,
        },
      },
      {
        executeNativeVerifier: (async () => {
          calls += 1;
          throw new Error('must-not-run');
        }) as any,
      },
    ),
    /naver_news_momentum_verifier_execution_channel_rejected/,
  );
  assert.equal(calls, 0);
});

test('authorized production channel returns bounded output and no secret/raw payload', async () => {
  const mock = fakePool();
  const native = await runNaverNewsMomentumNativeVerifier(
    { canonicalArtistId: 'iu', throughSlotStart: SLOT },
    {
      FANDEX_RUNTIME_DATABASE_URL:
        'postgresql://fandex_runtime:test@example.pooler.invalid/neondb',
    },
    {
      poolFactory: () => mock.pool as any,
      now: () => new Date(EXECUTED_AT),
    },
  );

  const environment = {
    VERCEL_ENV: 'production',
    FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED:
      'approved-v162-research-read-only',
    FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT: 'production',
    FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET: SECRET,
  };

  const result = await runNaverNewsMomentumVerifierExecutionChannel(
    {
      environment,
      authorizationHeader: 'Bearer ' + SECRET,
      requestBody: {
        contractVersion:
          'v162_naver_news_momentum_native_verifier_execution_request_v1',
        purpose: 'momentum-native-verifier-read-only',
        canonicalArtistId: 'iu',
        throughSlotStart: SLOT,
      },
    },
    { executeNativeVerifier: (async () => native) as any },
  );

  assert.equal(result.state, 'executed');
  assert.equal(result.v160.state, 'attestation-adapted');
  assert.equal(result.effects.databaseWrites, 0);
  assert.equal(result.effects.productMetricReads, 0);
  assert.equal(result.effects.productMetricWrites, 0);
  assert.equal(result.effects.productionActivations, 0);
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('\"rawPayload\":'), false);
  assert.equal(serialized.includes('\"normalizedPayload\":'), false);
  assert.equal(serialized.includes(SECRET), false);
});
