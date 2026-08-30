import assert from 'node:assert/strict';
import test from 'node:test';

import {
  dedupeAlbumResearchClaims,
  findAlbumResearchClaimConflicts,
  groupAlbumResearchClaimFamilies,
} from '../lib/alternative-evidence/albumResearch';
import {
  ALTERNATIVE_SIGNAL_METRIC_OWNER,
  validateAlternativeMetricOwnership,
  validateExclusiveMetricOwnership,
} from '../lib/alternative-evidence/metricOwnership';
import {
  buildNaverNewsAlternativeEvidence,
  classifyAlbumClaimSemantic,
  extractAlbumResearchClaimsFromNaverNews,
  parseAlbumNumericValue,
} from '../lib/alternative-evidence/naverNewsAlbumClaimExtractor';
import { planAlbumResearchClaimAppend } from '../lib/alternative-evidence/store';
import { canonicalJson, sha256Canonical } from '../lib/shared/canonicalDigest';
import {
  alternativeEvidenceFixtures,
  reviewedIdentityContext,
  syntheticNaverNewsRecord,
  unresolvedReleaseContext,
} from './fixtures/alternativeEvidenceFixtures';

function onlyClaim(
  fixture: Parameters<typeof extractAlbumResearchClaimsFromNaverNews>[0],
  context = reviewedIdentityContext,
) {
  const result = extractAlbumResearchClaimsFromNaverNews(fixture, context);
  assert.equal(result.claims.length, 1);
  return result.claims[0];
}

test('canonical JSON and SHA-256 are stable across key order', () => {
  assert.equal(canonicalJson({ b: 2, a: 1 }), '{"a":1,"b":2}');
  assert.equal(
    sha256Canonical({ b: 2, a: 1 }),
    '43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777',
  );
  assert.equal(sha256Canonical({ b: 2, a: 1 }), sha256Canonical({ a: 1, b: 2 }));
});

test('NAVER evidence adapter is deterministic and preserves acquisition provenance', () => {
  const left = buildNaverNewsAlternativeEvidence(alternativeEvidenceFixtures.hanteoFirstWeekExact);
  const right = buildNaverNewsAlternativeEvidence(alternativeEvidenceFixtures.hanteoFirstWeekExact);
  assert.deepEqual(left, right);
  assert.equal(left.origin, 'authorized-public-api');
  assert.equal(left.acquisitionProvider, 'naver-news');
  assert.equal(left.reportedProvider, null);
  assert.equal(left.researchOnly, true);
  assert.equal(left.observedAt, left.collectedAt);
});

test('numeric parser supports exact Korean and English physical-unit forms', () => {
  assert.equal(parseAlbumNumericValue('판매량 1,200,000장')?.value, 1_200_000);
  assert.equal(parseAlbumNumericValue('초동 120만 장')?.value, 1_200_000);
  assert.equal(parseAlbumNumericValue('누적 100만장')?.value, 1_000_000);
  assert.equal(parseAlbumNumericValue('sold 1.2 million copies')?.value, 1_200_000);
  assert.equal(parseAlbumNumericValue('sold 1.1M units')?.value, 1_100_000);
  assert.equal(parseAlbumNumericValue('밀리언셀러 달성'), null);
});

test('numeric thresholds are distinct from exact values and labels', () => {
  assert.equal(parseAlbumNumericValue('120만 장 판매 돌파')?.valueKind, 'threshold');
  const claim = onlyClaim(alternativeEvidenceFixtures.millionSellerThreshold);
  assert.equal(claim.value, null);
  assert.equal(claim.valueKind, 'threshold-label');
  assert.equal(claim.unit, 'physical-unit');
  assert.ok(claim.blockers.includes('threshold-only'));
});

test('first-day and first-week remain distinct semantics', () => {
  const firstWeek = onlyClaim(alternativeEvidenceFixtures.hanteoFirstWeekExact);
  const firstDay = onlyClaim(alternativeEvidenceFixtures.firstDay);
  assert.equal(firstWeek.semantic, 'first-week-sale');
  assert.equal(firstWeek.semanticState, 'definition-unverified');
  assert.equal(firstWeek.reportedPeriod, 'reported-first-week');
  assert.equal(firstDay.semantic, 'first-day-sale');
  assert.equal(firstDay.reportedPeriod, 'reported-first-day');
});

test('provider attribution never impersonates a direct Hanteo or Circle feed', () => {
  const hanteo = onlyClaim(alternativeEvidenceFixtures.hanteoFirstWeekExact);
  const circle = onlyClaim(alternativeEvidenceFixtures.circleCumulativeExact);
  assert.equal(hanteo.origin, 'news-reported-provider-value');
  assert.equal(hanteo.acquisitionProvider, 'naver-news');
  assert.equal(hanteo.reportedProvider, 'Hanteo Chart');
  assert.equal(circle.origin, 'news-reported-provider-value');
  assert.equal(circle.acquisitionProvider, 'naver-news');
  assert.equal(circle.reportedProvider, 'Circle Chart');
  assert.equal(circle.semantic, 'cumulative-sale');
  assert.equal(circle.reportedPeriod, '2026년 8월');
  assert.equal(circle.providerPeriod, null);
  assert.equal(circle.sourcePublishedAt, '2026-08-30T01:00:00.000Z');
  assert.equal(circle.observedAt, '2026-08-30T02:00:00.000Z');
  assert.equal(circle.collectedAt, '2026-08-30T02:00:00.000Z');
  assert.equal(circle.knowledgeMode, 'as-known-at-collection');
});

test('agency attribution does not fabricate a reported provider', () => {
  const claim = onlyClaim(alternativeEvidenceFixtures.agencyNumericSales);
  assert.equal(claim.origin, 'news-reported-agency-value');
  assert.equal(claim.reportedProvider, null);
  assert.equal(claim.semantic, 'unknown');
  assert.equal(claim.semanticState, 'ambiguous');
  assert.equal(claim.value, 500_000);
});

test('identity hints remain candidates unless a reviewed resolver resolves them', () => {
  const unresolved = onlyClaim(
    alternativeEvidenceFixtures.unresolvedRelease,
    unresolvedReleaseContext,
  );
  assert.equal(unresolved.artistIdentityState, 'candidate');
  assert.equal(unresolved.releaseIdentityState, 'unresolved');
  assert.equal(unresolved.releaseId, null);
  assert.ok(unresolved.blockers.includes('release-identity-unresolved'));

  const resolved = onlyClaim(alternativeEvidenceFixtures.firstDay);
  assert.equal(resolved.artistIdentityState, 'resolved');
  assert.equal(resolved.releaseIdentityState, 'resolved');
  assert.equal(resolved.artistId, 'artist-a');
  assert.equal(resolved.releaseId, 'release-x');
});

test('claim IDs and claim-family IDs are deterministic but serve different identity levels', () => {
  const first = onlyClaim(alternativeEvidenceFixtures.syndicatedA);
  const replay = onlyClaim(alternativeEvidenceFixtures.syndicatedA);
  const syndicated = onlyClaim(alternativeEvidenceFixtures.syndicatedB);
  assert.equal(first.claimId, replay.claimId);
  assert.equal(first.claimFamilyId, replay.claimFamilyId);
  assert.notEqual(first.claimId, syndicated.claimId);
  assert.equal(first.claimFamilyId, syndicated.claimFamilyId);
  assert.equal(first.claimScopeId, syndicated.claimScopeId);
});

test('identical claim records dedupe while syndicated article claims remain preserved in one family', () => {
  const first = onlyClaim(alternativeEvidenceFixtures.syndicatedA);
  const syndicated = onlyClaim(alternativeEvidenceFixtures.syndicatedB);
  const deduped = dedupeAlbumResearchClaims([first, first, syndicated]);
  assert.equal(deduped.claims.length, 2);
  assert.deepEqual(deduped.duplicates, [{ claimId: first.claimId, occurrences: 2 }]);
  const families = groupAlbumResearchClaimFamilies(deduped.claims);
  assert.equal(families.length, 1);
  assert.equal(families[0].claims.length, 2);
  assert.equal(families[0].groupingState, 'complete-candidate');
});

test('conflicting values are preserved without averaging, max, min, or latest-win', () => {
  const onePointOne = onlyClaim(alternativeEvidenceFixtures.conflictingOnePointOne);
  const onePointTwo = onlyClaim(alternativeEvidenceFixtures.conflictingOnePointTwo);
  const conflicts = findAlbumResearchClaimConflicts([onePointOne, onePointTwo]);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].state, 'conflicting');
  assert.equal(conflicts[0].reason, 'unknown');
  assert.equal(conflicts[0].claimIds.length, 2);
  assert.notEqual(onePointOne.claimFamilyId, onePointTwo.claimFamilyId);
  assert.equal(onePointOne.claimScopeId, onePointTwo.claimScopeId);
  assert.deepEqual(
    [onePointOne.value, onePointTwo.value].sort((left, right) => Number(left) - Number(right)),
    [1_100_000, 1_200_000],
  );
});

test('explicit corrections retain the original and encode immutable supersession lineage', () => {
  const original = onlyClaim(alternativeEvidenceFixtures.conflictingOnePointOne);
  const correction = onlyClaim(alternativeEvidenceFixtures.correctedClaim, {
    ...reviewedIdentityContext,
    revisionObservedAt: '2026-08-30T03:00:00.000Z',
    revision: {
      revisionState: 'explicit-correction',
      supersedesClaimId: original.claimId,
      conflictReason: 'correction',
    },
  });
  assert.notEqual(correction.claimId, original.claimId);
  assert.equal(correction.revision.revisionState, 'explicit-correction');
  assert.equal(correction.revision.supersedesClaimId, original.claimId);
  assert.equal(correction.revisionObservedAt, '2026-08-30T03:00:00.000Z');
  assert.deepEqual(dedupeAlbumResearchClaims([original, correction]).claims, [original, correction]);
});

test('possible correction language does not create an unproved supersession', () => {
  const correction = onlyClaim(alternativeEvidenceFixtures.correctedClaim);
  assert.equal(correction.revision.revisionState, 'possible-correction');
  assert.equal(correction.revision.supersedesClaimId, null);
  assert.deepEqual(correction.revision.possibleCorrectionOf, []);
});

test('rank, shipment, and preorder remain non-unit-sales semantics', () => {
  const rank = onlyClaim(alternativeEvidenceFixtures.rankOnly);
  const shipment = onlyClaim(alternativeEvidenceFixtures.shipment);
  const preorder = onlyClaim(alternativeEvidenceFixtures.preorder);
  assert.deepEqual(
    { semantic: rank.semantic, value: rank.value, unit: rank.unit, valueKind: rank.valueKind },
    { semantic: 'rank', value: 2, unit: 'rank', valueKind: 'rank' },
  );
  assert.equal(shipment.semantic, 'shipment');
  assert.equal(shipment.unit, 'physical-unit');
  assert.equal(preorder.semantic, 'preorder');
  assert.notEqual(shipment.semantic, 'consumer-retail-sale');
  assert.notEqual(preorder.semantic, 'consumer-retail-sale');
});

test('missing values stay null and never become zero', () => {
  const threshold = onlyClaim(alternativeEvidenceFixtures.millionSellerThreshold);
  const zero = onlyClaim(syntheticNaverNewsRecord({
    key: 'zero-not-observation',
    title: '판매량 0장으로 보도됐으나 의미가 불명확하다',
  }));
  assert.equal(threshold.value, null);
  assert.equal(zero.value, null);
  assert.notEqual(threshold.value, 0);
  assert.notEqual(zero.value, 0);
});

test('one title/summary evidence record can produce zero, one, or multiple claims', () => {
  const none = extractAlbumResearchClaimsFromNaverNews(alternativeEvidenceFixtures.noAlbumClaim);
  const one = extractAlbumResearchClaimsFromNaverNews(
    alternativeEvidenceFixtures.hanteoFirstWeekExact,
    reviewedIdentityContext,
  );
  const many = extractAlbumResearchClaimsFromNaverNews(
    alternativeEvidenceFixtures.multipleClaims,
    reviewedIdentityContext,
  );
  assert.equal(none.state, 'no-album-claim');
  assert.equal(none.claims.length, 0);
  assert.equal(one.claims.length, 1);
  assert.equal(many.claims.length, 2);
  assert.deepEqual(many.claims.map((claim) => claim.semantic), [
    'first-week-sale',
    'cumulative-sale',
  ]);
  assert.ok(many.claims.every((claim) => claim.sourceEvidenceId === many.evidence.evidenceId));
});

test('extractor uses normalized title and summary only', () => {
  const article = syntheticNaverNewsRecord({
    key: 'summary-only-claim',
    title: 'Artist A Release X 새 소식',
    summary: '한터차트 기준 초동 120만 장',
  });
  const result = extractAlbumResearchClaimsFromNaverNews(article, reviewedIdentityContext);
  assert.equal(result.claims.length, 1);
  assert.equal(result.claims[0].value, 1_200_000);
});

test('semantic classifier does not promote ambiguous 판매량 into completed retail sales', () => {
  const classification = classifyAlbumClaimSemantic('판매량 40만 장 기록');
  assert.equal(classification?.semantic, 'unknown');
  assert.equal(classification?.semanticState, 'ambiguous');
  const claim = onlyClaim(alternativeEvidenceFixtures.ambiguousSales);
  assert.equal(claim.semantic, 'unknown');
  assert.ok(claim.blockers.includes('semantic-unknown'));
});

test('quality metadata remains descriptive and shadow eligibility is conservative', () => {
  const firstWeek = onlyClaim(alternativeEvidenceFixtures.hanteoFirstWeekExact);
  const firstDay = onlyClaim(alternativeEvidenceFixtures.firstDay);
  const unresolved = onlyClaim(
    alternativeEvidenceFixtures.unresolvedRelease,
    unresolvedReleaseContext,
  );
  assert.equal(firstWeek.quality.semanticClarity, 'partial');
  assert.equal(firstWeek.shadowEligibility, 'normalized-research-ready');
  assert.equal(firstDay.shadowEligibility, 'shadow-feature-eligible');
  assert.equal(unresolved.shadowEligibility, 'normalized-research-ready');
  assert.equal('score' in firstWeek.quality, false);
});

test('metric ownership guard keeps article existence and sales claims separate', () => {
  assert.deepEqual(ALTERNATIVE_SIGNAL_METRIC_OWNER, {
    'album-sales-claim': 'album',
    'retail-rank-observation': 'album',
    'lastfm-listening-observation': 'music',
    'apple-music-consumption-observation': 'music',
    'youtube-video-consumption-observation': 'youtube',
    'naver-datalab-search-interest-observation': 'search',
    'google-trends-search-interest-observation': 'search',
    'news-article-existence': 'news',
  });
  assert.equal(validateAlternativeMetricOwnership({
    signalKind: 'album-sales-claim', metricOwner: 'album',
  }).valid, true);
  assert.equal(validateAlternativeMetricOwnership({
    signalKind: 'news-article-existence', metricOwner: 'news',
  }).valid, true);
  assert.equal(validateAlternativeMetricOwnership({
    signalKind: 'youtube-video-consumption-observation', metricOwner: 'music',
  }).valid, false);
  const assignments = validateExclusiveMetricOwnership([
    { contributionId: 'article-a', signalKind: 'news-article-existence', metricOwner: 'news' },
    { contributionId: 'sales-claim-a', signalKind: 'album-sales-claim', metricOwner: 'album' },
    { contributionId: 'lastfm-a', signalKind: 'lastfm-listening-observation', metricOwner: 'music' },
  ]);
  assert.deepEqual(assignments, { valid: true, issues: [] });
  assert.equal(validateExclusiveMetricOwnership([
    { contributionId: 'same-signal', signalKind: 'album-sales-claim', metricOwner: 'album' },
    { contributionId: 'same-signal', signalKind: 'album-sales-claim', metricOwner: 'news' },
  ]).valid, false);
});

test('research store plan is deterministic, append-only, and zero-effect', () => {
  const claim = onlyClaim(alternativeEvidenceFixtures.firstDay);
  const left = planAlbumResearchClaimAppend([claim]);
  const right = planAlbumResearchClaimAppend([claim]);
  assert.deepEqual(left, right);
  assert.equal(left.operation, 'append-only');
  assert.deepEqual(left.effects, { databaseReads: 0, databaseWrites: 0, externalCalls: 0 });
  assert.throws(
    () => planAlbumResearchClaimAppend([claim, claim]),
    /album_research_store_plan_duplicate_claim_id/,
  );
});
