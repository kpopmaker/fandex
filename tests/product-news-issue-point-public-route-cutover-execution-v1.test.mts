import assert from 'node:assert/strict';
import test from 'node:test';

import {
  NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_EXECUTION,
} from '../lib/product/activation/newsIssuePointPublicRouteCutoverExecution';
import type {
  ProductVariableReadModelResult,
} from '../lib/product/contracts/productVariable';
import {
  getArtistProductVariable,
} from '../lib/product/queries/getArtistProductVariable';
import {
  getArtistProductVariablePublicRoute,
} from '../lib/product/queries/getArtistProductVariablePublicRoute';
import {
  getFandexVariableDefinition,
} from '../lib/intelligence/variableRegistry';

function realShadowResult(
  fact: Readonly<
    | { availability: 'available'; value: number }
    | { availability: 'unavailable'; value: null }
  > = { availability: 'available', value: 0 },
): ProductVariableReadModelResult {
  const legacy = getArtistProductVariable({
    artistId: 'iu',
    variableId: 'newsIssuePoint',
  });
  assert.equal(legacy.status, 'ok');
  if (legacy.status !== 'ok') return legacy;

  return {
    status: 'ok',
    model: {
      ...legacy.model,
      identity: {
        sourceArtistId: 'iu',
        variableId: 'newsIssuePoint',
        sourceVariableKey: 'newsIssuePoint',
      },
      fact,
      series: fact.availability === 'available'
        ? [{
            sourceTimeLabel: '2026-09-23T09:00:00.000Z',
            fact,
          }]
        : [],
      observationTime: fact.availability === 'available'
        ? {
            kind: 'period',
            start: '2026-09-23T02:00:00.000Z',
            end: '2026-09-23T09:00:00.000Z',
          }
        : { kind: 'unknown' },
      dataOrigin: 'observed',
      presentation: 'standard',
      publication: 'shadow',
      sourceMetadata: {
        sourceKind: 'naver-news-issue-point-frozen-methodology',
        sourceArtistId: 'iu',
        sourceVariableKey: 'newsIssuePoint',
        sourceTimeLabel: '2026-09-23T09:00:00.000Z',
        methodologyVersion: 'v1_naver_news_issue_point_real_methodology',
        officialShadowEpoch: '2026-09-15T16:00:00.000Z',
        throughSlotStart: '2026-09-23T09:00:00.000Z',
        selectedWindowSlotCount: 8,
        normalizationType: 'HISTORICAL_STRICT_EXCEEDANCE_SHARE',
        baselineReadinessStatus: 'replicated_cycle_history',
        currentActivityRate: fact.availability === 'available' ? 0 : null,
        priorDefinedWindowCount: 1,
        priorLessThanLatestCount: 0,
        priorEqualToLatestCount: 1,
        priorGreaterThanLatestCount: 0,
      },
      evidenceTrace: {
        kind: 'naver-news-issue-point-stored-evidence',
        methodologyVersion: 'v1_naver_news_issue_point_real_methodology',
        officialShadowEpoch: '2026-09-15T16:00:00.000Z',
        throughSlotStart: '2026-09-23T09:00:00.000Z',
        currentWindow: null,
        eligiblePriorWindows: [],
        storedEvidenceJobIds: [],
      },
    },
  };
}

test('explicit execution authorization is exact-bound and keeps strict interval claims disabled', () => {
  const execution = NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_EXECUTION;

  assert.equal(
    execution.contractVersion,
    'v1_news_issue_point_public_route_cutover_execution',
  );
  assert.equal(execution.action, 'execute-public-route-cutover');
  assert.equal(execution.authority, 'product-operations-owner');
  assert.equal(
    execution.cutoverExecutionAuthorizationId,
    'ops-cutover-execution-newsissuepoint-20260923t095908z-v1',
  );
  assert.equal(execution.authorizedAt, '2026-09-23T09:59:08.000Z');
  assert.equal(execution.authorizationEvidenceCommentId, 5792785034);
  assert.equal(
    execution.authorizedMain,
    '930f5d692129e75f79ca3d74e99f6751cc12bb46',
  );
  assert.deepEqual(execution.target, {
    artistId: 'iu',
    variableId: 'newsIssuePoint',
  });
  assert.equal(execution.decision.publicRouteActivated, true);
  assert.equal(execution.decision.productScorePublished, true);
  assert.equal(
    execution.decision.directProductionContributionEligible,
    true,
  );
  assert.equal(
    execution.decision.strictPublicationIntervalClaimAllowed,
    false,
  );
  assert.equal(execution.decision.lifecycleState, 'production');
});

test('IU newsIssuePoint public route promotes only publication while preserving observed Stored Evidence truth', async () => {
  const source = realShadowResult();
  const result = await getArtistProductVariablePublicRoute(
    { artistId: 'iu', variableId: 'newsIssuePoint' },
    { readNewsIssuePointReal: async () => source },
  );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.deepEqual(result.model.fact, {
    availability: 'available',
    value: 0,
  });
  assert.equal(result.model.dataOrigin, 'observed');
  assert.equal(result.model.presentation, 'standard');
  assert.equal(result.model.publication, 'production');
  assert.equal(
    result.model.evidenceTrace.kind,
    'naver-news-issue-point-stored-evidence',
  );
  assert.equal(result.model.sourceMetadata.sourceKind,
    'naver-news-issue-point-frozen-methodology');
});

test('IU newsIssuePoint unavailable remains unavailable and never falls back to Synthetic preview', async () => {
  let legacyCalls = 0;
  const result = await getArtistProductVariablePublicRoute(
    { artistId: 'iu', variableId: 'newsIssuePoint' },
    {
      readNewsIssuePointReal: async () =>
        realShadowResult({ availability: 'unavailable', value: null }),
      readLegacyProductVariable: () => {
        legacyCalls += 1;
        return getArtistProductVariable({
          artistId: 'iu',
          variableId: 'newsIssuePoint',
        });
      },
    },
  );

  assert.equal(legacyCalls, 0);
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.deepEqual(result.model.fact, {
    availability: 'unavailable',
    value: null,
  });
  assert.equal(result.model.dataOrigin, 'observed');
  assert.equal(result.model.presentation, 'standard');
  assert.equal(result.model.publication, 'production');
});

test('non-target artists and the other six variables remain on legacy Synthetic Preview and never call Real runtime', async () => {
  let realCalls = 0;
  const result = await getArtistProductVariablePublicRoute(
    { artistId: 'aespa', variableId: 'newsIssuePoint' },
    {
      readNewsIssuePointReal: async () => {
        realCalls += 1;
        return realShadowResult();
      },
    },
  );

  assert.equal(realCalls, 0);
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(result.model.dataOrigin, 'synthetic');
  assert.equal(result.model.presentation, 'preview');
  assert.equal(result.model.publication, 'production');
  assert.equal(result.model.evidenceTrace.kind, 'legacy-issue-signal-key');

  const otherVariable = await getArtistProductVariablePublicRoute(
    { artistId: 'iu', variableId: 'snsFandomPoint' },
    {
      readNewsIssuePointReal: async () => {
        realCalls += 1;
        return realShadowResult();
      },
    },
  );
  assert.equal(realCalls, 0);
  assert.equal(otherVariable.status, 'ok');
  if (otherVariable.status === 'ok') {
    assert.equal(otherVariable.model.dataOrigin, 'synthetic');
    assert.equal(otherVariable.model.presentation, 'preview');
  }
});

test('canonical registry transitions newsIssuePoint to real Production direct contribution', () => {
  const definition = getFandexVariableDefinition('newsIssuePoint');
  assert.ok(definition);
  assert.equal(definition.lifecycle, 'production');
  assert.equal(definition.directProductionContributionEligible, true);
  assert.deepEqual(definition.blockers, []);
});
