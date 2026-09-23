import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL,
} from '../lib/product/activation/newsIssuePointRealProductActivationApproval';
import type {
  NewsIssuePointPublicRouteCutoverAuthorizationResult,
} from '../lib/product/activation/newsIssuePointPublicRouteCutoverAuthorization';
import type {
  ProductVariableReadModelResult,
} from '../lib/product/contracts/productVariable';
import {
  getArtistProductVariablePublicReadModel,
} from '../lib/product/queries/getArtistProductVariablePublicReadModel';

const THROUGH = '2026-09-21T00:00:00.000Z';
const WINDOW_START = '2026-09-20T17:00:00.000Z';
const JOB_ID =
  'dae0750b1ad81f468f479328ef726e6344eaa31a62246cce3e4aeebc5d9a3f7d';

function legacyResult(): ProductVariableReadModelResult {
  return Object.freeze({
    status: 'data-issue' as const,
    issues: Object.freeze([
      Object.freeze({
        code: 'source-state-conflict' as const,
        reason: 'artist-identity-mismatch' as const,
      }),
    ]),
    sourceMetadata: Object.freeze({
      sourceArtistId: 'legacy',
      rawVariableId: 'legacy',
      sourceTimeLabel: null,
    }),
  });
}

function realResult(
  availability: 'available' | 'unavailable' = 'available',
): ProductVariableReadModelResult {
  const available = availability === 'available';

  return Object.freeze({
    status: 'ok' as const,
    model: Object.freeze({
      identity: Object.freeze({
        sourceArtistId: 'iu',
        variableId: 'newsIssuePoint' as const,
        sourceVariableKey: 'newsIssuePoint' as const,
      }),
      definition: Object.freeze({
        variableId: 'newsIssuePoint' as const,
        sourceKey: 'newsIssuePoint' as const,
        displayName: 'News / Issue Point',
        description: 'Real media activity',
        relatedSourceMetricKeys: Object.freeze([]),
        evidenceRelation: Object.freeze({
          kind: 'stored-evidence-job-trace' as const,
          sourceMetric: 'naverNewsShadowFirstSeenActivity' as const,
        }),
      }),
      fact: available
        ? Object.freeze({
            availability: 'available' as const,
            value: 0,
          })
        : Object.freeze({
            availability: 'unavailable' as const,
            value: null,
          }),
      series: available
        ? Object.freeze([
            Object.freeze({
              sourceTimeLabel: THROUGH,
              fact: Object.freeze({
                availability: 'available' as const,
                value: 0,
              }),
            }),
          ])
        : Object.freeze([]),
      observationTime: available
        ? Object.freeze({
            kind: 'period' as const,
            start: WINDOW_START,
            end: THROUGH,
          })
        : Object.freeze({
            kind: 'unknown' as const,
          }),
      presentation: 'standard' as const,
      dataOrigin: 'observed' as const,
      publication: 'shadow' as const,
      sourceMetadata: Object.freeze({
        sourceKind:
          'naver-news-issue-point-frozen-methodology' as const,
        sourceArtistId: 'iu',
        sourceVariableKey: 'newsIssuePoint' as const,
        sourceTimeLabel: THROUGH,
        methodologyVersion:
          'v1_naver_news_issue_point_real_methodology',
        officialShadowEpoch: '2026-09-15T16:00:00.000Z',
        throughSlotStart: THROUGH,
        selectedWindowSlotCount: 8 as const,
        normalizationType:
          'HISTORICAL_STRICT_EXCEEDANCE_SHARE' as const,
        baselineReadinessStatus:
          'replicated_cycle_history',
        currentActivityRate: available ? 0 : null,
        priorDefinedWindowCount: 120,
        priorLessThanLatestCount: 0,
        priorEqualToLatestCount: 39,
        priorGreaterThanLatestCount: 81,
      }),
      evidenceTrace: Object.freeze({
        kind: 'naver-news-issue-point-stored-evidence' as const,
        methodologyVersion:
          'v1_naver_news_issue_point_real_methodology',
        officialShadowEpoch: '2026-09-15T16:00:00.000Z',
        throughSlotStart: THROUGH,
        currentWindow: available
          ? Object.freeze({
              startSlotStart: WINDOW_START,
              endSlotStart: THROUGH,
              firstSeenObservationCount: 0,
              observedObservationCount: 800,
              activityRate: 0,
              slotEvidence: Object.freeze([
                Object.freeze({
                  slotStart: THROUGH,
                  jobId: JOB_ID,
                }),
              ]),
            })
          : null,
        eligiblePriorWindows: Object.freeze([]),
        storedEvidenceJobIds: Object.freeze([JOB_ID]),
      }),
    }),
  });
}

function authorizedCutover():
  Extract<
    NewsIssuePointPublicRouteCutoverAuthorizationResult,
    { status: 'authorized-for-route-cutover' }
  > {
  const activation =
    NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL;

  return Object.freeze({
    contractVersion:
      'v1_news_issue_point_public_route_cutover_authorization',
    status: 'authorized-for-route-cutover' as const,
    activationAuthorized: true as const,
    cutoverAuthorized: true as const,
    publicRouteActivated: false as const,
    productScorePublished: false as const,
    directProductionContributionEligible: false as const,
    strictPublicationIntervalClaimAllowed: false as const,
    lifecycleState: 'shadow' as const,
    requiredNextGate:
      'explicit-public-route-cutover-execution' as const,
    approval: Object.freeze({
      contractVersion:
        'v1_news_issue_point_public_route_cutover_approval' as const,
      action: 'authorize-public-route-cutover' as const,
      authority: 'product-operations-owner' as const,
      cutoverAuthorizationId:
        'ops-cutover-newsissuepoint-test-v1',
      authorizedAt: '2026-09-23T02:00:00.000Z',
      target: Object.freeze({
        artistId: 'iu' as const,
        variableId: 'newsIssuePoint' as const,
      }),
      binding: Object.freeze({
        activationAuthorizationId:
          activation.activationAuthorizationId,
        activationApprovalContractVersion:
          activation.contractVersion,
        activationAuthorizationContractVersion:
          'v1_news_issue_point_real_product_activation_authorization' as const,
        methodologyVersion:
          activation.binding.methodologyVersion,
        protocolStart: activation.binding.protocolStart,
        selectedWindowSlotCount:
          activation.binding.selectedWindowSlotCount,
        normalizationType:
          activation.binding.normalizationType,
        claimScope: activation.binding.claimScope,
      }),
    }),
  });
}

function notAuthorizedCutover():
  NewsIssuePointPublicRouteCutoverAuthorizationResult {
  return Object.freeze({
    contractVersion:
      'v1_news_issue_point_public_route_cutover_authorization',
    status: 'not-authorized' as const,
    activationAuthorized: true,
    cutoverAuthorized: false,
    publicRouteActivated: false,
    productScorePublished: false,
    directProductionContributionEligible: false,
    strictPublicationIntervalClaimAllowed: false,
    lifecycleState: 'shadow' as const,
    reason: 'cutover-approval-absent' as const,
  });
}

test('IU newsIssuePoint fails closed before explicit cutover authorization and never returns legacy Synthetic', async () => {
  const legacy = legacyResult();
  let realReads = 0;

  const result = await getArtistProductVariablePublicReadModel(
    {
      artistId: 'iu',
      variableId: 'newsIssuePoint',
      throughSlotStart: THROUGH,
    },
    {
      cutoverAuthorization: notAuthorizedCutover(),
      readLegacyProductVariable: () => legacy,
      async readRealProductVariable() {
        realReads += 1;
        return realResult();
      },
    },
  );

  assert.equal(result.status, 'data-issue');
  assert.notEqual(result, legacy);
  assert.equal(realReads, 0);
  if (result.status === 'data-issue') {
    assert.deepEqual(result.issues, [{
      code: 'real-source-data-issue',
      reason: 'public-route-cutover-not-authorized',
    }]);
  }
});

test('exact cutover authorization projects observed Real score 0 to Production without losing Stored Evidence trace', async () => {
  const source = realResult('available');

  const result = await getArtistProductVariablePublicReadModel(
    {
      artistId: 'iu',
      variableId: 'newsIssuePoint',
      throughSlotStart: THROUGH,
    },
    {
      cutoverAuthorization: authorizedCutover(),
      readLegacyProductVariable: () => legacyResult(),
      async readRealProductVariable() {
        return source;
      },
    },
  );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.model.dataOrigin, 'observed');
  assert.equal(result.model.presentation, 'standard');
  assert.equal(result.model.publication, 'production');
  assert.deepEqual(result.model.fact, {
    availability: 'available',
    value: 0,
  });
  assert.deepEqual(result.model.definition.evidenceRelation, {
    kind: 'stored-evidence-job-trace',
    sourceMetric: 'naverNewsShadowFirstSeenActivity',
  });
  assert.equal(
    result.model.evidenceTrace.kind,
    'naver-news-issue-point-stored-evidence',
  );
  if (
    result.model.evidenceTrace.kind
    === 'naver-news-issue-point-stored-evidence'
  ) {
    assert.deepEqual(
      result.model.evidenceTrace.storedEvidenceJobIds,
      [JOB_ID],
    );
    assert.equal(
      result.model.evidenceTrace.currentWindow?.activityRate,
      0,
    );
  }

  assert.equal(source.status, 'ok');
  if (source.status === 'ok') {
    assert.equal(source.model.publication, 'shadow');
  }
});

test('authorized public read preserves truthful unavailable instead of falling back to Synthetic zero', async () => {
  const result = await getArtistProductVariablePublicReadModel(
    {
      artistId: 'iu',
      variableId: 'newsIssuePoint',
      throughSlotStart: THROUGH,
    },
    {
      cutoverAuthorization: authorizedCutover(),
      readLegacyProductVariable: () => legacyResult(),
      async readRealProductVariable() {
        return realResult('unavailable');
      },
    },
  );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.model.publication, 'production');
  assert.equal(result.model.dataOrigin, 'observed');
  assert.deepEqual(result.model.fact, {
    availability: 'unavailable',
    value: null,
  });
});

test('cutover authorization data issue fails closed before reading Real data', async () => {
  let realReads = 0;
  const authorization:
    NewsIssuePointPublicRouteCutoverAuthorizationResult = {
      contractVersion:
        'v1_news_issue_point_public_route_cutover_authorization',
      status: 'data-issue',
      activationAuthorized: false,
      cutoverAuthorized: false,
      publicRouteActivated: false,
      productScorePublished: false,
      directProductionContributionEligible: false,
      strictPublicationIntervalClaimAllowed: false,
      lifecycleState: 'blocked',
      reason: 'cutover-approval-binding-mismatch',
    };

  const result = await getArtistProductVariablePublicReadModel(
    {
      artistId: 'iu',
      variableId: 'newsIssuePoint',
      throughSlotStart: THROUGH,
    },
    {
      cutoverAuthorization: authorization,
      async readRealProductVariable() {
        realReads += 1;
        return realResult();
      },
    },
  );

  assert.equal(result.status, 'data-issue');
  assert.equal(realReads, 0);
  if (result.status === 'data-issue') {
    assert.equal(
      result.issues[0]?.code,
      'real-source-data-issue',
    );
    assert.equal(
      result.issues[0]?.reason,
      'public-route-cutover-data-issue',
    );
  }
});

test('authorized cutover rejects a Real result that still declares legacy evidence relation', async () => {
  const source = realResult();
  assert.equal(source.status, 'ok');
  if (source.status !== 'ok') return;

  const bad: ProductVariableReadModelResult = {
    status: 'ok',
    model: {
      ...source.model,
      definition: {
        ...source.model.definition,
        evidenceRelation: {
          kind: 'legacy-issue-signal-key',
          sourceKey: 'newsIssuePoint',
        },
      },
    },
  };

  const result = await getArtistProductVariablePublicReadModel(
    {
      artistId: 'iu',
      variableId: 'newsIssuePoint',
      throughSlotStart: THROUGH,
    },
    {
      cutoverAuthorization: authorizedCutover(),
      async readRealProductVariable() {
        return bad;
      },
    },
  );

  assert.equal(result.status, 'data-issue');
  if (result.status === 'data-issue') {
    assert.equal(
      result.issues[0]?.reason,
      'public-route-real-read-invalid',
    );
  }
});

test('non-target artist or variable preserves exact legacy behavior', async () => {
  const legacy = legacyResult();
  let realReads = 0;

  const result = await getArtistProductVariablePublicReadModel(
    {
      artistId: 'aespa',
      variableId: 'brandFitPoint',
      throughSlotStart: null,
    },
    {
      cutoverAuthorization: notAuthorizedCutover(),
      readLegacyProductVariable: () => legacy,
      async readRealProductVariable() {
        realReads += 1;
        return realResult();
      },
    },
  );

  assert.equal(result, legacy);
  assert.equal(realReads, 0);
});

test('public cutover boundary is not wired into the page before explicit owner cutover approval', async () => {
  const [page, publicRead, realRead] = await Promise.all([
    readFile(
      new URL('../app/artists/[artistId]/page.tsx', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL(
        '../lib/product/queries/getArtistProductVariablePublicReadModel.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../lib/product/queries/getArtistProductVariableRealReadModel.ts',
        import.meta.url,
      ),
      'utf8',
    ),
  ]);

  assert.doesNotMatch(
    page,
    /getArtistProductVariablePublicReadModel/,
  );
  assert.doesNotMatch(publicRead, /getRuntimeDatabasePool/);
  assert.doesNotMatch(publicRead, /naverNewsIssuePointRealProductRead/);
  assert.match(
    realRead,
    /kind:\s*'stored-evidence-job-trace'/,
  );
  assert.match(
    realRead,
    /sourceMetric:\s*'naverNewsShadowFirstSeenActivity'/,
  );
});
