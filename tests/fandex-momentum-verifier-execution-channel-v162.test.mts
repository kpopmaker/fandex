import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  NAVER_NEWS_MOMENTUM_VERIFIER_EXECUTION_CHANNEL_DESCRIPTOR,
  parseNaverNewsMomentumVerifierExecutionChannelRequest,
  readNaverNewsMomentumVerifierExecutionChannelConfig,
  runNaverNewsMomentumVerifierExecutionChannel,
} from '../lib/server/ingestion/naverNewsMomentumVerifierExecutionChannel';
import {
  handleNaverNewsMomentumVerifierExecutionRequest,
} from '../app/api/internal/naver-news/momentum-verifier/route';

const SECRET = 'v162-research-read-only-secret';
const SLOT = '2026-09-21T12:00:00.000Z';
const JOB_ID =
  'd76d5ee3ed512280f3b0055818c38f0c857d8a9e7c9d8621e826ca48b919fb58';
const COLLECTION_KEY =
  'sched-v125-naver-news-20260921t120000z-f1ed381d367d';

const productionEnv = Object.freeze({
  VERCEL_ENV: 'production',
  FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED:
    'approved-v162-research-read-only',
  FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT: 'production',
  FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET: SECRET,
});

function requestBody() {
  return {
    contractVersion:
      'v162_naver_news_momentum_native_verifier_execution_request_v1',
    purpose: 'momentum-native-verifier-read-only',
    canonicalArtistId: 'iu',
    throughSlotStart: SLOT,
  } as const;
}

function nativeResult() {
  const snapshot = Object.freeze({
    canonicalArtistId: 'iu',
    naverEvidenceId: JOB_ID,
    naverCollectionKey: COLLECTION_KEY,
    naverThroughSlotStart: SLOT,
    naverStatus: 'succeeded' as const,
    naverRawEvidenceCount: 2,
    naverNormalizedRecordCount: 2,
    naverDuplicateRecordCount: 0,
    naverRejectedItemCount: 0,
  });
  const verifierOutput = Object.freeze({
    contractVersion:
      'v160_fandex_momentum_stored_evidence_verifier_output_v1' as const,
    verifier: 'neon-read-only-reproducer' as const,
    executionId: '1'.repeat(64),
    executedAt: '2026-09-21T13:45:00.000Z',
    accessMode: 'neon-read-only' as const,
    databaseReadOnly: true as const,
    databaseWritesObserved: 0 as const,
    canonicalArtistId: 'iu',
    naverEvidenceId: JOB_ID,
    naverCollectionKey: COLLECTION_KEY,
    naverThroughSlotStart: SLOT,
    naverStatus: 'succeeded' as const,
    jobRowReproduced: true as const,
    evidenceRows: 2,
    distinctEvidenceIds: 2,
    distinctItemIndexes: 2,
    minItemIndex: 0,
    maxItemIndex: 1,
    normalizedOutcomes: 2,
    missingNormalizedIds: 0,
    missingNormalizedRecords: 0,
    distinctNormalizedRecords: 2,
    joinedPayloadRows: 2,
    rawPayloadTextBytes: 256,
    normalizedPayloadTextBytes: 512,
    rawLinkageSetAuditMd5: '1'.repeat(32),
    normalizedSetAuditMd5: '2'.repeat(32),
    rawPayloadMaterializedAuditMd5: '3'.repeat(32),
    normalizedPayloadMaterializedAuditMd5: '4'.repeat(32),
    auditFingerprintPurpose:
      'read-integrity-only-not-methodology' as const,
  });
  return Object.freeze({
    contractVersion:
      'v161_naver_news_momentum_native_verifier_output_v1' as const,
    lifecycle: 'research' as const,
    canonicalArtistId: 'iu',
    snapshot,
    verifierOutput,
    effects: Object.freeze({
      databaseReads: 2 as const,
      databaseWrites: 0 as const,
      productMetricReads: 0 as const,
      productMetricWrites: 0 as const,
      previewFallbackReads: 0 as const,
    }),
    digest: 'a'.repeat(64),
  });
}

test('v162 is production-runtime-only and uses a dedicated authorization boundary', () => {
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
      .dedicatedAuthorizationRequired,
    true,
  );
  assert.equal(
    NAVER_NEWS_MOMENTUM_VERIFIER_EXECUTION_CHANNEL_DESCRIPTOR
      .schedulerAuthorizationReused,
    false,
  );
  assert.equal(
    NAVER_NEWS_MOMENTUM_VERIFIER_EXECUTION_CHANNEL_DESCRIPTOR
      .rawPayloadResponseAllowed,
    false,
  );
  assert.equal(
    NAVER_NEWS_MOMENTUM_VERIFIER_EXECUTION_CHANNEL_DESCRIPTOR
      .databaseWriteAllowed,
    false,
  );
  assert.equal(
    NAVER_NEWS_MOMENTUM_VERIFIER_EXECUTION_CHANNEL_DESCRIPTOR
      .productionActivationAllowed,
    false,
  );
});

test('v162 config rejects Preview before any verifier can run', async () => {
  assert.throws(
    () => readNaverNewsMomentumVerifierExecutionChannelConfig({
      ...productionEnv,
      VERCEL_ENV: 'preview',
    }),
    /naver_news_momentum_verifier_execution_channel_rejected/,
  );

  let calls = 0;
  await assert.rejects(
    () => runNaverNewsMomentumVerifierExecutionChannel(
      {
        environment: {
          ...productionEnv,
          VERCEL_ENV: 'preview',
        },
        authorizationHeader: `Bearer ${SECRET}`,
        requestBody: requestBody(),
      },
      {
        executeNativeVerifier: (async () => {
          calls += 1;
          return nativeResult();
        }) as any,
      },
    ),
    /naver_news_momentum_verifier_execution_channel_rejected/,
  );
  assert.equal(calls, 0);
});

test('v162 rejects missing enablement, deployment binding, secret, or wrong bearer token', async () => {
  for (const environment of [
    {
      ...productionEnv,
      FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED: undefined,
    },
    {
      ...productionEnv,
      FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT: undefined,
    },
    {
      ...productionEnv,
      FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET: undefined,
    },
  ]) {
    assert.throws(
      () => readNaverNewsMomentumVerifierExecutionChannelConfig(environment),
      /naver_news_momentum_verifier_execution_channel_rejected/,
    );
  }

  let calls = 0;
  await assert.rejects(
    () => runNaverNewsMomentumVerifierExecutionChannel(
      {
        environment: productionEnv,
        authorizationHeader: 'Bearer incorrect-secret-with-length',
        requestBody: requestBody(),
      },
      {
        executeNativeVerifier: (async () => {
          calls += 1;
          return nativeResult();
        }) as any,
      },
    ),
    /naver_news_momentum_verifier_execution_channel_rejected/,
  );
  assert.equal(calls, 0);
});

test('v162 accepts only exact request shape and exact ISO slot', () => {
  assert.deepEqual(
    parseNaverNewsMomentumVerifierExecutionChannelRequest(requestBody()),
    requestBody(),
  );

  assert.throws(
    () => parseNaverNewsMomentumVerifierExecutionChannelRequest({
      ...requestBody(),
      extra: true,
    }),
    /naver_news_momentum_verifier_execution_channel_rejected/,
  );
  assert.throws(
    () => parseNaverNewsMomentumVerifierExecutionChannelRequest({
      ...requestBody(),
      throughSlotStart: '2026-09-21T12:00:00Z',
    }),
    /naver_news_momentum_verifier_execution_channel_rejected/,
  );
});

test('v162 executes v161 once, adapts through v160, and returns bounded output only', async () => {
  let nativeCalls = 0;
  const result = await runNaverNewsMomentumVerifierExecutionChannel(
    {
      environment: productionEnv,
      authorizationHeader: `Bearer ${SECRET}`,
      requestBody: requestBody(),
    },
    {
      executeNativeVerifier: (async (command: any) => {
        nativeCalls += 1;
        assert.deepEqual(command, {
          canonicalArtistId: 'iu',
          throughSlotStart: SLOT,
        });
        return nativeResult();
      }) as any,
    },
  );

  assert.equal(nativeCalls, 1);
  assert.equal(result.state, 'executed');
  assert.equal(result.source.naverEvidenceId, JOB_ID);
  assert.equal(result.source.naverThroughSlotStart, SLOT);
  assert.equal(result.nativeVerifier.databaseReadOnly, true);
  assert.equal(result.nativeVerifier.databaseWritesObserved, 0);
  assert.equal(result.v160.state, 'attestation-adapted');
  assert.equal(result.v160.verifierOutputAccepted, true);
  assert.equal(result.v160.attestation.naverEvidenceId, JOB_ID);
  assert.deepEqual(result.effects, {
    databaseReads: 2,
    databaseWrites: 0,
    productMetricReads: 0,
    productMetricWrites: 0,
    previewFallbackReads: 0,
    registryMutations: 0,
    productionActivations: 0,
  });

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('rawPayload":'), false);
  assert.equal(serialized.includes('normalizedPayload":'), false);
  assert.equal(serialized.includes('FANDEX_RUNTIME_DATABASE_URL'), false);
  assert.equal(serialized.includes(SECRET), false);
});

test('v162 fails closed when native verifier returns a different source boundary', async () => {
  const mismatched = {
    ...nativeResult(),
    snapshot: {
      ...nativeResult().snapshot,
      naverThroughSlotStart: '2026-09-21T11:00:00.000Z',
    },
  };

  await assert.rejects(
    () => runNaverNewsMomentumVerifierExecutionChannel(
      {
        environment: productionEnv,
        authorizationHeader: `Bearer ${SECRET}`,
        requestBody: requestBody(),
      },
      {
        executeNativeVerifier: (async () => mismatched) as any,
      },
    ),
    /naver_news_momentum_verifier_execution_channel_rejected/,
  );
});

test('v162 route returns 403 for Preview without invoking native verifier', async () => {
  let calls = 0;
  const response = await handleNaverNewsMomentumVerifierExecutionRequest(
    new Request('https://example.invalid/api/internal/naver-news/momentum-verifier', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${SECRET}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(requestBody()),
    }),
    {
      ...productionEnv,
      VERCEL_ENV: 'preview',
    },
    {
      executeNativeVerifier: (async () => {
        calls += 1;
        return nativeResult();
      }) as any,
    },
  );

  assert.equal(response.status, 403);
  assert.equal(calls, 0);
  assert.deepEqual(await response.json(), {
    ok: false,
    code: 'naver_news_momentum_verifier_execution_channel_rejected',
  });
});

test('v162 route emits only the bounded response for an authorized production request', async () => {
  const response = await handleNaverNewsMomentumVerifierExecutionRequest(
    new Request('https://example.invalid/api/internal/naver-news/momentum-verifier', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${SECRET}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(requestBody()),
    }),
    productionEnv,
    {
      executeNativeVerifier: (async () => nativeResult()) as any,
    },
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.state, 'executed');
  assert.equal(body.source.naverEvidenceId, JOB_ID);
  assert.equal(body.v160.verifierOutputAccepted, true);
  assert.equal(JSON.stringify(body).includes('rawPayload":'), false);
  assert.equal(JSON.stringify(body).includes('normalizedPayload":'), false);
});

test('v162 route rejects non-POST methods', async () => {
  const response = await handleNaverNewsMomentumVerifierExecutionRequest(
    new Request('https://example.invalid/api/internal/naver-news/momentum-verifier', {
      method: 'GET',
      headers: {
        authorization: `Bearer ${SECRET}`,
      },
    }),
    productionEnv,
    {
      executeNativeVerifier: (async () => nativeResult()) as any,
    },
  );
  assert.equal(response.status, 403);
});


test('committed v162 audit preserves inactive execution channel and 12:00Z ledger block', async () => {
  const [auditRaw, watermarkRaw, manifestRaw] = await Promise.all([
    readFile(
      new URL(
        '../data/momentum-research/iu_verifier_execution_channel_v162_20260921T150500Z.json',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../data/momentum-research/iu_evaluation_watermark_v151.jsonl',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../data/momentum-research/iu_paired_artifact_manifest_v154.jsonl',
        import.meta.url,
      ),
      'utf8',
    ),
  ]);

  const audit = JSON.parse(auditRaw);
  const watermarks = watermarkRaw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const manifests = manifestRaw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  assert.equal(
    audit.contractVersion,
    'v162_fandex_momentum_native_verifier_execution_channel_audit_v1',
  );
  assert.equal(audit.implementation.productionRuntimeOnly, true);
  assert.equal(audit.implementation.previewExecutionAllowed, false);
  assert.equal(audit.implementation.schedulerAuthorizationReused, false);
  assert.equal(audit.implementation.rawPayloadResponseAllowed, false);
  assert.equal(audit.requiredEnvironment.environmentMutationPerformed, false);
  assert.equal(audit.validation.status, 'PASS');
  assert.equal(
    audit.currentExecutionAvailability.connectedNeonProjectCount,
    0,
  );
  assert.equal(
    audit.currentExecutionAvailability.productionMainVerifierRoutePresent,
    false,
  );
  assert.deepEqual(
    audit.currentExecutionAvailability.productionMainRoutes,
    ['scheduler', 'shadow-scheduler'],
  );
  assert.equal(
    audit.currentExecutionAvailability.fresh1200ZNativeReadCompleted,
    false,
  );
  assert.equal(
    audit.currentExecutionAvailability.blocker,
    'sanctioned-production-read-only-execution-channel-not-active',
  );

  assert.equal(
    watermarks.length,
    audit.authoritativeLedgerBoundary.v151WatermarkRecordCount,
  );
  assert.equal(
    watermarks.at(-1).sequence,
    audit.authoritativeLedgerBoundary.latestWatermarkSequence,
  );
  assert.equal(
    watermarks.at(-1).evaluationBoundary.sourceEvidence.naverThroughSlotStart,
    audit.authoritativeLedgerBoundary.latestAcceptedNaverThroughSlotStart,
  );
  assert.equal(
    manifests.length,
    audit.authoritativeLedgerBoundary.v154ManifestRecordCount,
  );
  assert.equal(
    manifests.at(-1).sequence,
    audit.authoritativeLedgerBoundary.latestManifestSequence,
  );
  assert.equal(
    manifests.at(-1).manifestDigest,
    audit.authoritativeLedgerBoundary.latestManifestDigest,
  );
  assert.equal(audit.authoritativeLedgerBoundary.fresh1200ZAdvanced, false);
  assert.equal(audit.effects.databaseWrites, 0);
  assert.equal(audit.effects.productionActivations, 0);
  assert.equal(audit.productBoundary.productMomentumScore, null);
  assert.equal(audit.productBoundary.productionEligible, false);
  assert.equal(audit.productBoundary.productProductionActual, '0/7');
});
