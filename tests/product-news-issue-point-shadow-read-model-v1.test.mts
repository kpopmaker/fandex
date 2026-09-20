import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type {
  NaverNewsIssuePointProductCandidate,
  NaverNewsIssuePointProductCandidateResult,
} from '../lib/product/adapters/naverNewsIssuePointProductCandidateAdapter';
import type {
  ProductVariableReadModelResult,
} from '../lib/product/contracts/productVariable';
import {
  getArtistProductVariableShadowReadModel,
  type ArtistProductVariableShadowReadModelRuntime,
} from '../lib/product/queries/getArtistProductVariableShadowReadModel';
import {
  getFandexVariableDefinition,
} from '../lib/intelligence/variableRegistry';

function legacyResult(): ProductVariableReadModelResult {
  return Object.freeze({
    status: 'data-issue' as const,
    issues: Object.freeze([
      Object.freeze({
        code: 'invalid-variable-identity' as const,
        rawVariableId: 'legacy-placeholder',
      }),
    ]),
    sourceMetadata: Object.freeze({
      sourceArtistId: 'iu',
      rawVariableId: 'legacy-placeholder',
      sourceTimeLabel: null,
    }),
  });
}

function candidate(
  availability: 'available' | 'unavailable' = 'available',
): NaverNewsIssuePointProductCandidate {
  return Object.freeze({
    contractVersion: 'v1_naver_news_issue_point_product_candidate',
    variableId: 'newsIssuePoint',
    canonicalArtistId: 'iu',
    fact:
      availability === 'available'
        ? Object.freeze({
            availability: 'available' as const,
            value: 41.975308641975,
          })
        : Object.freeze({
            availability: 'unavailable' as const,
            value: null,
          }),
    dataOrigin: 'observed',
    publication: 'shadow',
    presentation: 'standard',
    observationTime:
      availability === 'available'
        ? Object.freeze({
            kind: 'period' as const,
            start: '2026-09-19T02:00:00.000Z',
            end: '2026-09-19T09:00:00.000Z',
          })
        : Object.freeze({ kind: 'unknown' as const }),
    sourceMetadata: Object.freeze({
      sourceKind: 'naver-news-issue-point-frozen-methodology' as const,
      methodologyVersion: 'v1_naver_news_issue_point_real_methodology',
      protocolStart: '2026-09-15T16:00:00.000Z',
      throughSlotStart: '2026-09-19T09:00:00.000Z',
      selectedWindowSlotCount: 8 as const,
      normalizationType: 'HISTORICAL_STRICT_EXCEEDANCE_SHARE' as const,
      baselineReadinessStatus: 'replicated_cycle_history' as const,
      priorDefinedWindowCount: 81,
      priorLessThanLatestCount: 34,
      priorEqualToLatestCount: 10,
      priorGreaterThanLatestCount: 37,
    }),
    evidenceTrace: Object.freeze({
      currentWindow: null,
      storedEvidenceJobIds: Object.freeze(['job-1']),
    }),
    productPolicy: Object.freeze({
      directProductContributionEligible: false as const,
      productScorePublished: false as const,
      realVariablePromotionEligible: false as const,
    }),
  });
}

function runtime(
  real:
    | NaverNewsIssuePointProductCandidateResult
    | Readonly<{ status: 'runtime-unavailable' }>,
  calls: { legacy: number; real: number },
): ArtistProductVariableShadowReadModelRuntime {
  return Object.freeze({
    getLegacyResult() {
      calls.legacy += 1;
      return legacyResult();
    },
    getNewsIssuePointRealCandidateResult() {
      calls.real += 1;
      return real;
    },
  });
}

test('IU newsIssuePoint internal read-model selects observed Real shadow candidate and stays non-publishable', async () => {
  const calls = { legacy: 0, real: 0 };
  const result = await getArtistProductVariableShadowReadModel(
    { artistId: ' iu ', variableId: ' newsIssuePoint ' },
    runtime(
      Object.freeze({
        status: 'ok' as const,
        candidate: candidate(),
      }),
      calls,
    ),
  );

  assert.equal(result.selection, 'real-shadow-candidate');
  assert.equal(result.targetScope, true);
  assert.equal(calls.legacy, 1);
  assert.equal(calls.real, 1);
  if (result.selection !== 'real-shadow-candidate') return;
  assert.equal(result.publishable, false);
  assert.equal(result.candidate.dataOrigin, 'observed');
  assert.equal(result.candidate.publication, 'shadow');
  assert.equal(
    result.candidate.productPolicy.directProductContributionEligible,
    false,
  );
  assert.equal(result.candidate.productPolicy.productScorePublished, false);
  assert.equal(result.candidate.productPolicy.realVariablePromotionEligible, false);
});

test('IU newsIssuePoint unavailable Real value remains unavailable with no Synthetic fallback', async () => {
  const calls = { legacy: 0, real: 0 };
  const result = await getArtistProductVariableShadowReadModel(
    { artistId: 'iu', variableId: 'newsIssuePoint' },
    runtime(
      Object.freeze({
        status: 'ok' as const,
        candidate: candidate('unavailable'),
      }),
      calls,
    ),
  );

  assert.equal(result.selection, 'real-unavailable');
  assert.equal(calls.real, 1);
  assert.notEqual(result.selection, 'legacy-preview');
  if (result.selection !== 'real-unavailable') return;
  assert.equal(result.publishable, false);
  assert.deepEqual(result.candidate.fact, {
    availability: 'unavailable',
    value: null,
  });
});

test('IU newsIssuePoint runtime failure fails closed instead of falling back to the legacy preview', async () => {
  const calls = { legacy: 0, real: 0 };
  const result = await getArtistProductVariableShadowReadModel(
    { artistId: 'iu', variableId: 'newsIssuePoint' },
    runtime(Object.freeze({ status: 'runtime-unavailable' as const }), calls),
  );

  assert.deepEqual(result, {
    contractVersion: 'v1_artist_product_variable_shadow_read_model',
    selection: 'data-issue',
    targetScope: true,
    publishable: false,
    reason: 'real-runtime-unavailable',
  });
  assert.equal(calls.legacy, 1);
  assert.equal(calls.real, 1);
});

test('non-target Product reads remain on the legacy path and never invoke Real runtime', async () => {
  const calls = { legacy: 0, real: 0 };
  const result = await getArtistProductVariableShadowReadModel(
    { artistId: 'aespa', variableId: 'newsIssuePoint' },
    runtime(Object.freeze({ status: 'runtime-unavailable' as const }), calls),
  );

  assert.equal(result.selection, 'legacy-preview');
  assert.equal(result.targetScope, false);
  assert.equal(calls.legacy, 1);
  assert.equal(calls.real, 0);
});

test('canonical registry records read-model binding complete but keeps promotion blocked', () => {
  const definition = getFandexVariableDefinition('newsIssuePoint');

  assert.ok(definition);
  assert.equal(definition.lifecycle, 'shadow');
  assert.equal(definition.directProductionContributionEligible, false);
  assert.equal(
    definition.blockers.includes('product-read-model-binding-pending'),
    false,
  );
  assert.deepEqual(definition.blockers, [
    'production-promotion-not-authorized',
  ]);
});

test('server read-model path is read-only and public Product query/UI remain isolated', async () => {
  const [serverSource, publicQuerySource] = await Promise.all([
    readFile(
      new URL(
        '../lib/server/product/newsIssuePointRealProductShadowReadModel.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../lib/product/queries/getArtistProductVariable.ts',
        import.meta.url,
      ),
      'utf8',
    ),
  ]);

  assert.match(
    serverSource,
    /createPostgresNaverNewsCanonicalJobEvidenceReadRepository/,
  );
  assert.match(serverSource, /assembleOfficialNaverNewsShadowFirstSeenSeries/);
  assert.match(serverSource, /evaluateNaverNewsIssuePointFrozenMethodology/);
  assert.match(serverSource, /adaptNaverNewsIssuePointProductCandidate/);
  assert.doesNotMatch(
    serverSource,
    /ensureJob\s*\(|claimJob\s*\(|completeJob\s*\(|applyPersistenceBundle\s*\(/,
  );

  assert.doesNotMatch(
    publicQuerySource,
    /getArtistProductVariableShadowReadModel|selectNewsIssuePointRealProductSource/,
  );
  assert.match(publicQuerySource, /presentation:\s*'preview'/);
  assert.match(publicQuerySource, /dataOrigin:\s*'synthetic'/);
});
