import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL,
} from '../lib/product/activation/newsIssuePointPublicRouteCutoverApproval';
import {
  NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_EXECUTION,
} from '../lib/product/activation/newsIssuePointPublicRouteCutoverExecution';
import {
  NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL,
} from '../lib/product/activation/newsIssuePointRealProductActivationApproval';
import {
  NAVER_NEWS_IU_RECOVERY_PROTOCOL_START,
} from '../lib/server/ingestion/naverNewsShadowEpoch';

type Candidate = Readonly<{
  contractVersion: string;
  canonicalArtistId: string;
  variableId: string;
  trigger: string;
  currentOfficialProtocolStart: string;
  productionObservation: Readonly<{
    observedAt: string;
    deploymentSha: string;
    previousBlocker: string;
    currentBlocker: string;
    interpretation: string;
  }>;
  staleAuthorizationBindings: Readonly<{
    activationApprovalProtocolStart: string;
    publicRouteCutoverApprovalProtocolStart: string;
    publicRouteCutoverExecutionProtocolStart: string;
    safeToReuseForRecoveryEpoch: boolean;
  }>;
  decision: Readonly<{
    reauthorizationRequired: boolean;
    activationReauthorized: boolean;
    publicRouteCutoverReauthorized: boolean;
    publicRouteActivated: boolean;
    productScorePublished: boolean;
    directProductionContributionEligible: boolean;
    requiredNextGate: string;
  }>;
  safetyBoundary: Readonly<Record<string, boolean | number>>;
}>;

async function readCandidate(): Promise<Candidate> {
  return JSON.parse(
    await readFile(
      new URL(
        '../data/momentum-product/iu_naver_news_recovery_product_reauthorization_candidate_v1.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as Candidate;
}

test('recovery epoch cannot silently reuse the historical News Product authorizations', async () => {
  const candidate = await readCandidate();

  assert.equal(
    candidate.contractVersion,
    'naver-news-recovery-product-reauthorization-candidate-v1',
  );
  assert.equal(candidate.canonicalArtistId, 'iu');
  assert.equal(candidate.variableId, 'newsIssuePoint');
  assert.equal(
    candidate.currentOfficialProtocolStart,
    NAVER_NEWS_IU_RECOVERY_PROTOCOL_START,
  );

  const historicalProtocolStart = '2026-09-15T16:00:00.000Z';
  assert.equal(
    NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL.binding.protocolStart,
    historicalProtocolStart,
  );
  assert.equal(
    NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL.binding.protocolStart,
    historicalProtocolStart,
  );
  assert.equal(
    NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_EXECUTION.binding.protocolStart,
    historicalProtocolStart,
  );

  assert.equal(
    candidate.staleAuthorizationBindings.activationApprovalProtocolStart,
    historicalProtocolStart,
  );
  assert.equal(
    candidate.staleAuthorizationBindings.publicRouteCutoverApprovalProtocolStart,
    historicalProtocolStart,
  );
  assert.equal(
    candidate.staleAuthorizationBindings.publicRouteCutoverExecutionProtocolStart,
    historicalProtocolStart,
  );
  assert.notEqual(historicalProtocolStart, NAVER_NEWS_IU_RECOVERY_PROTOCOL_START);
  assert.equal(
    candidate.staleAuthorizationBindings.safeToReuseForRecoveryEpoch,
    false,
  );
});

test('candidate remains fail-closed until explicit recovery-epoch Product reauthorization', async () => {
  const candidate = await readCandidate();

  assert.deepEqual(candidate.decision, {
    reauthorizationRequired: true,
    activationReauthorized: false,
    publicRouteCutoverReauthorized: false,
    publicRouteActivated: false,
    productScorePublished: false,
    directProductionContributionEligible: false,
    requiredNextGate: 'explicit-recovery-epoch-product-reauthorization',
  });

  assert.deepEqual(candidate.safetyBoundary, {
    providerExecutionsAuthorized: 0,
    blobWritesAuthorized: 0,
    databaseWritesAuthorized: 0,
    backfillAuthorized: false,
    missingSlotSynthesisAuthorized: false,
    scorePublicationAuthorized: false,
    publicRouteCutoverAuthorized: false,
  });
});

test('production observation records the expected post-rollover semantic transition', async () => {
  const candidate = await readCandidate();

  assert.equal(
    candidate.productionObservation.deploymentSha,
    '70e66c0c7e968b222b49f391a40a419e694480b6',
  );
  assert.equal(
    candidate.productionObservation.previousBlocker,
    'upstream-read-not-ok',
  );
  assert.equal(
    candidate.productionObservation.currentBlocker,
    'upstream-not-real-production',
  );
  assert.equal(
    candidate.productionObservation.interpretation,
    'blob-read-recovered-product-publication-remains-shadow',
  );
});
