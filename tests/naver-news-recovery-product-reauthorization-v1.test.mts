import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  applyNewsIssuePointRecoveryEpochProductReauthorization,
  NEWS_ISSUE_POINT_RECOVERY_EPOCH_PRODUCT_REAUTHORIZATION,
} from '../lib/product/activation/newsIssuePointRecoveryEpochProductReauthorization';
import type {
  ProductVariableReadModelResult,
} from '../lib/product/contracts/productVariable';
import {
  NAVER_NEWS_IU_RECOVERY_PROTOCOL_START,
} from '../lib/server/ingestion/naverNewsShadowEpoch';

function shadowResult(
  protocolStart: string = NAVER_NEWS_IU_RECOVERY_PROTOCOL_START,
): ProductVariableReadModelResult {
  return {
    status: 'ok',
    model: {
      identity: {
        sourceArtistId: 'iu',
        variableId: 'newsIssuePoint',
        sourceVariableKey: 'newsIssuePoint',
      },
      definition: {
        variableId: 'newsIssuePoint',
        sourceKey: 'newsIssuePoint',
        displayName: '뉴스/이슈',
        description: 'recovery reauthorization test',
        relatedSourceMetricKeys: [],
        evidenceRelation: {
          kind: 'legacy-issue-signal-key',
          sourceKey: 'newsIssuePoint',
        },
      },
      fact: {
        availability: 'available',
        value: 42,
      },
      series: [],
      observationTime: {
        kind: 'period',
        start: '2026-10-05T05:00:00.000Z',
        end: '2026-10-05T12:00:00.000Z',
      },
      presentation: 'standard',
      dataOrigin: 'observed',
      publication: 'shadow',
      sourceMetadata: {
        sourceKind: 'naver-news-issue-point-frozen-methodology',
        sourceArtistId: 'iu',
        sourceVariableKey: 'newsIssuePoint',
        sourceTimeLabel: '2026-10-05T12:00:00.000Z',
        methodologyVersion:
          'v1_naver_news_issue_point_real_methodology',
        officialShadowEpoch: protocolStart,
        throughSlotStart: '2026-10-05T12:00:00.000Z',
        selectedWindowSlotCount: 8,
        normalizationType:
          'HISTORICAL_STRICT_EXCEEDANCE_SHARE',
        baselineReadinessStatus: 'replicated_cycle_history',
        currentActivityRate: 0.25,
        priorDefinedWindowCount: 52,
        priorLessThanLatestCount: 20,
        priorEqualToLatestCount: 12,
        priorGreaterThanLatestCount: 20,
      },
      evidenceTrace: {
        kind: 'naver-news-issue-point-stored-evidence',
        methodologyVersion:
          'v1_naver_news_issue_point_real_methodology',
        officialShadowEpoch: protocolStart,
        throughSlotStart: '2026-10-05T12:00:00.000Z',
        currentWindow: null,
        eligiblePriorWindows: [],
        storedEvidenceJobIds: ['job-recovery-1'],
      },
    },
  } as ProductVariableReadModelResult;
}

test('explicit owner reauthorization is bound to the merged candidate and recovery epoch', async () => {
  const authorization =
    NEWS_ISSUE_POINT_RECOVERY_EPOCH_PRODUCT_REAUTHORIZATION;
  const candidate = JSON.parse(
    await readFile(
      new URL(
        '../data/momentum-product/iu_naver_news_recovery_product_reauthorization_candidate_v1.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as {
    contractVersion: string;
    currentOfficialProtocolStart: string;
    decision: {
      reauthorizationRequired: boolean;
      requiredNextGate: string;
    };
  };

  assert.equal(
    authorization.contractVersion,
    'v1_news_issue_point_recovery_epoch_product_reauthorization',
  );
  assert.equal(authorization.authority, 'product-operations-owner');
  assert.equal(
    authorization.authorizationSource,
    'explicit-owner-conversation-approval-2026-10-05',
  );
  assert.equal(
    authorization.candidate.contractVersion,
    candidate.contractVersion,
  );
  assert.equal(candidate.decision.reauthorizationRequired, true);
  assert.equal(
    candidate.decision.requiredNextGate,
    'explicit-recovery-epoch-product-reauthorization',
  );
  assert.equal(
    authorization.binding.protocolStart,
    candidate.currentOfficialProtocolStart,
  );
  assert.equal(
    authorization.binding.protocolStart,
    NAVER_NEWS_IU_RECOVERY_PROTOCOL_START,
  );
  assert.equal(
    authorization.candidate.blobSha,
    'abb7334d4dfeed9f34e116dffbfee2f46a59ac13',
  );
});

test('reauthorization promotes only the exactly bound observed recovery-epoch read', () => {
  const source = shadowResult();
  const result =
    applyNewsIssuePointRecoveryEpochProductReauthorization(source);

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.model.publication, 'production');
  assert.equal(result.model.dataOrigin, 'observed');
  assert.equal(result.model.presentation, 'standard');
  assert.deepEqual(result.model.fact, {
    availability: 'available',
    value: 42,
  });
  assert.deepEqual(
    result.model.evidenceTrace,
    source.status === 'ok' ? source.model.evidenceTrace : null,
  );
  assert.deepEqual(
    result.model.sourceMetadata,
    source.status === 'ok' ? source.model.sourceMetadata : null,
  );
});

test('historical epoch cannot inherit recovery Product reauthorization', () => {
  const result =
    applyNewsIssuePointRecoveryEpochProductReauthorization(
      shadowResult('2026-09-15T16:00:00.000Z'),
    );

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.deepEqual(result.issues, [{
    code: 'real-source-data-issue',
    reason: 'selector-data-issue',
  }]);
});

test('reauthorization changes no methodology, score, ranking, provider or durable-write boundary', () => {
  const authorization =
    NEWS_ISSUE_POINT_RECOVERY_EPOCH_PRODUCT_REAUTHORIZATION;

  assert.deepEqual(authorization.decision, {
    activationAuthorized: true,
    publicRouteCutoverAuthorized: true,
    variablePublication: 'production',
    directProductionContributionEligible: true,
    productScorePublished: false,
    methodologyChanged: false,
    rankingActivated: false,
  });
  assert.deepEqual(authorization.safetyBoundary, {
    providerExecutionsAuthorized: 0,
    blobWritesAuthorized: 0,
    databaseWritesAuthorized: 0,
    backfillAuthorized: false,
    missingSlotSynthesisAuthorized: false,
    scorePublicationAuthorized: false,
    rankingActivationAuthorized: false,
  });
});
