import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type {
  NaverNewsIssuePointProductCandidate,
  NaverNewsIssuePointProductCandidateResult,
} from '../lib/product/adapters/naverNewsIssuePointProductCandidateAdapter';
import type { ProductVariableReadModelResult } from '../lib/product/contracts/productVariable';
import {
  selectNewsIssuePointRealProductSource,
} from '../lib/product/selectors/newsIssuePointRealProductSelector';

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
      sourceArtistId: 'aespa',
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
        ? Object.freeze({ availability: 'available' as const, value: 41.975308641975 })
        : Object.freeze({ availability: 'unavailable' as const, value: null }),
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

function okCandidate(
  value: NaverNewsIssuePointProductCandidate = candidate(),
): NaverNewsIssuePointProductCandidateResult {
  return Object.freeze({ status: 'ok' as const, candidate: value });
}

test('IU newsIssuePoint with eligible observed candidate selects Real shadow candidate without publishing it', () => {
  const result = selectNewsIssuePointRealProductSource({
    artistId: ' iu ',
    variableId: ' newsIssuePoint ',
    legacyResult: legacyResult(),
    realCandidateResult: okCandidate(),
  });

  assert.equal(result.selection, 'real-shadow-candidate');
  assert.equal(result.targetScope, true);
  if (result.selection !== 'real-shadow-candidate') return;
  assert.equal(result.publishable, false);
  assert.equal(result.candidate.dataOrigin, 'observed');
  assert.equal(result.candidate.publication, 'shadow');
  assert.equal(result.candidate.fact.availability, 'available');
});

test('IU newsIssuePoint unavailable Real candidate stays unavailable and never silently falls back to Synthetic', () => {
  const legacy = legacyResult();
  const result = selectNewsIssuePointRealProductSource({
    artistId: 'iu',
    variableId: 'newsIssuePoint',
    legacyResult: legacy,
    realCandidateResult: okCandidate(candidate('unavailable')),
  });

  assert.equal(result.selection, 'real-unavailable');
  assert.equal(result.targetScope, true);
  if (result.selection !== 'real-unavailable') return;
  assert.equal(result.publishable, false);
  assert.equal(result.candidate.fact.availability, 'unavailable');
  assert.notEqual(result.selection, 'legacy-preview');
});

test('IU newsIssuePoint Real candidate data issue fails closed instead of falling back to Synthetic', () => {
  const result = selectNewsIssuePointRealProductSource({
    artistId: 'iu',
    variableId: 'newsIssuePoint',
    legacyResult: legacyResult(),
    realCandidateResult: Object.freeze({
      status: 'data-issue' as const,
      reason: 'invalid-available-result' as const,
    }),
  });

  assert.deepEqual(result, {
    contractVersion: 'v1_news_issue_point_real_selector',
    selection: 'data-issue',
    targetScope: true,
    publishable: false,
    reason: 'real-candidate-data-issue',
  });
});

test('non-IU artist or non-newsIssuePoint variable stays on the legacy Product path', () => {
  const legacy = legacyResult();

  const otherArtist = selectNewsIssuePointRealProductSource({
    artistId: 'aespa',
    variableId: 'newsIssuePoint',
    legacyResult: legacy,
    realCandidateResult: okCandidate(),
  });
  assert.equal(otherArtist.selection, 'legacy-preview');
  if (otherArtist.selection === 'legacy-preview') {
    assert.equal(otherArtist.legacyResult, legacy);
  }

  const otherVariable = selectNewsIssuePointRealProductSource({
    artistId: 'iu',
    variableId: 'musicAlbumPoint',
    legacyResult: legacy,
    realCandidateResult: okCandidate(),
  });
  assert.equal(otherVariable.selection, 'legacy-preview');
});

test('target scope rejects candidate artist/policy/fact mismatch', () => {
  const base = candidate();

  const artistMismatch = selectNewsIssuePointRealProductSource({
    artistId: 'iu',
    variableId: 'newsIssuePoint',
    legacyResult: legacyResult(),
    realCandidateResult: okCandidate(Object.freeze({
      ...base,
      canonicalArtistId: 'aespa',
    })),
  });
  assert.equal(artistMismatch.selection, 'data-issue');
  if (artistMismatch.selection === 'data-issue') {
    assert.equal(artistMismatch.reason, 'real-candidate-scope-mismatch');
  }

  const policyMismatch = selectNewsIssuePointRealProductSource({
    artistId: 'iu',
    variableId: 'newsIssuePoint',
    legacyResult: legacyResult(),
    realCandidateResult: okCandidate(Object.freeze({
      ...base,
      publication: 'production',
    })),
  });
  assert.equal(policyMismatch.selection, 'data-issue');
  if (policyMismatch.selection === 'data-issue') {
    assert.equal(policyMismatch.reason, 'real-candidate-policy-mismatch');
  }

  const invalidFact = selectNewsIssuePointRealProductSource({
    artistId: 'iu',
    variableId: 'newsIssuePoint',
    legacyResult: legacyResult(),
    realCandidateResult: okCandidate(Object.freeze({
      ...base,
      fact: Object.freeze({ availability: 'available' as const, value: 101 }),
    })),
  });
  assert.equal(invalidFact.selection, 'data-issue');
  if (invalidFact.selection === 'data-issue') {
    assert.equal(invalidFact.reason, 'real-candidate-fact-invalid');
  }
});

test('selector is isolated from Product route/UI and cannot publish or activate', async () => {
  const source = await readFile(
    new URL(
      '../lib/product/selectors/newsIssuePointRealProductSelector.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.doesNotMatch(source, /getArtistProductVariable\s*\(/);
  assert.doesNotMatch(source, /productScorePublished:\s*true/);
  assert.doesNotMatch(source, /realVariablePromotionEligible:\s*true/);
  assert.doesNotMatch(source, /directProductContributionEligible:\s*true/);
  assert.match(source, /publishable:\s*false/);
});
