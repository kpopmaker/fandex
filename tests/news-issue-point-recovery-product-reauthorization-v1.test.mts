import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_EXECUTION,
} from '../lib/product/activation/newsIssuePointPublicRouteCutoverExecution';
import {
  NEWS_ISSUE_POINT_RECOVERY_PRODUCT_REAUTHORIZATION,
} from '../lib/product/activation/newsIssuePointRecoveryProductReauthorization';
import {
  NAVER_NEWS_IU_RECOVERY_PROTOCOL_START,
} from '../lib/server/ingestion/naverNewsShadowEpoch';

type Evidence = Readonly<{
  contractVersion: string;
  canonicalArtistId: string;
  variableId: string;
  action: string;
  authority: string;
  authorizationId: string;
  authorizedDate: string;
  authorizedBaseMain: string;
  binding: Readonly<{
    candidatePath: string;
    candidateBlobSha: string;
    recoveryEpochActivationMergeSha: string;
    historicalCutoverExecutionAuthorizationId: string;
    historicalProtocolStart: string;
    recoveryProtocolStart: string;
    methodologyVersion: string;
    selectedWindowSlotCount: number;
    normalizationType: string;
    claimScope: string;
  }>;
  decision: Readonly<Record<string, boolean | string>>;
  safetyBoundary: Readonly<Record<string, boolean | number>>;
}>;

async function readEvidence(): Promise<Evidence> {
  return JSON.parse(
    await readFile(
      new URL(
        '../data/momentum-product/iu_news_issue_point_recovery_product_reauthorization_v1.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as Evidence;
}

test('explicit owner reauthorization binds News Product cutover to the active recovery epoch', async () => {
  const runtime = NEWS_ISSUE_POINT_RECOVERY_PRODUCT_REAUTHORIZATION;
  const evidence = await readEvidence();

  assert.equal(
    runtime.contractVersion,
    'v1_news_issue_point_recovery_product_reauthorization',
  );
  assert.equal(
    runtime.authorizationId,
    'ops-reauthorize-newsissuepoint-recovery-epoch-20261005-v1',
  );
  assert.equal(runtime.authorizedDate, '2026-10-05');
  assert.equal(
    runtime.authorizedBaseMain,
    'd1c11d058c903dd738a0e42e19129826aeb2e5e3',
  );
  assert.deepEqual(runtime.target, {
    artistId: 'iu',
    variableId: 'newsIssuePoint',
  });

  assert.equal(
    runtime.binding.candidatePath,
    'data/momentum-product/iu_naver_news_recovery_product_reauthorization_candidate_v1.json',
  );
  assert.equal(
    runtime.binding.candidateBlobSha,
    'abb7334d4dfeed9f34e116dffbfee2f46a59ac13',
  );
  assert.equal(
    runtime.binding.recoveryEpochActivationMergeSha,
    '70e66c0c7e968b222b49f391a40a419e694480b6',
  );
  assert.equal(
    runtime.binding.historicalCutoverExecutionAuthorizationId,
    NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_EXECUTION
      .cutoverExecutionAuthorizationId,
  );
  assert.equal(
    runtime.binding.historicalProtocolStart,
    '2026-09-15T16:00:00.000Z',
  );
  assert.equal(
    runtime.binding.recoveryProtocolStart,
    NAVER_NEWS_IU_RECOVERY_PROTOCOL_START,
  );
  assert.notEqual(
    runtime.binding.recoveryProtocolStart,
    runtime.binding.historicalProtocolStart,
  );
  assert.equal(
    runtime.binding.methodologyVersion,
    NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_EXECUTION
      .binding.methodologyVersion,
  );
  assert.equal(runtime.binding.selectedWindowSlotCount, 8);
  assert.equal(
    runtime.binding.normalizationType,
    'HISTORICAL_STRICT_EXCEEDANCE_SHARE',
  );
  assert.equal(
    runtime.binding.claimScope,
    'protocol-conditioned-first-seen-only',
  );

  assert.equal(evidence.authorizationId, runtime.authorizationId);
  assert.deepEqual(evidence.binding, runtime.binding);
});

test('reauthorization enables only recovery-epoch News Product publication, not aggregate FANDEX score publication', () => {
  const decision =
    NEWS_ISSUE_POINT_RECOVERY_PRODUCT_REAUTHORIZATION.decision;

  assert.deepEqual(decision, {
    activationReauthorized: true,
    publicRouteCutoverReauthorized: true,
    newsIssuePointPublicationAuthorized: true,
    newsIssuePointScorePublicationAuthorized: true,
    directProductionContributionEligible: true,
    lifecycleState: 'production',
    strictPublicationIntervalClaimAllowed: false,
    fandexAggregateScorePublicationAuthorized: false,
  });
});

test('reauthorization does not authorize provider execution, durable writes, backfill, synthesis, or methodology change', () => {
  assert.deepEqual(
    NEWS_ISSUE_POINT_RECOVERY_PRODUCT_REAUTHORIZATION.safetyBoundary,
    {
      providerExecutionsAuthorized: 0,
      blobWritesAuthorized: 0,
      databaseWritesAuthorized: 0,
      backfillAuthorized: false,
      missingSlotSynthesisAuthorized: false,
      methodologyChangeAuthorized: false,
      fandexAggregateScorePublicationAuthorized: false,
    },
  );
});

test('historical cutover execution remains immutable and is not silently rebound', () => {
  assert.equal(
    NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_EXECUTION.binding.protocolStart,
    '2026-09-15T16:00:00.000Z',
  );
  assert.equal(
    NEWS_ISSUE_POINT_RECOVERY_PRODUCT_REAUTHORIZATION
      .binding.recoveryProtocolStart,
    '2026-10-03T01:00:00.000Z',
  );
});
