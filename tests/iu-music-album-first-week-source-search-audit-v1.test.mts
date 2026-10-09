import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const audit = JSON.parse(
  readFileSync(
    'data/fandex-cloud-v10/product/iu_music_album_first_week_source_search_audit_v1.json',
    'utf8',
  ),
);

test('IU targeted source search records discovery evidence without promoting it into Production', () => {
  assert.equal(audit.canonicalArtistId, 'iu');
  assert.equal(
    audit.objective.metricSemantic,
    'reported-hanteo-first-week-sales',
  );
  assert.equal(
    audit.result.tierAOrBExactValueSourceLocated,
    false,
  );
  assert.equal(
    audit.result.tierAOrBExactValueAndPeriodBindingLocated,
    false,
  );
  assert.equal(audit.result.discoveryExactValue, 79_940);
  assert.equal(
    audit.result.discoveryProviderPeriodStart,
    '2025-05-28',
  );
  assert.equal(
    audit.result.discoveryProviderPeriodEnd,
    '2025-06-03',
  );
  assert.equal(audit.result.productionObservationEligible, false);
  assert.equal(
    audit.productionBoundary.discoveryOnlyAutoPromotionAllowed,
    false,
  );
  assert.equal(
    audit.productionBoundary.providerPresenceSubstitutesForExactValue,
    false,
  );
  assert.equal(
    audit.productionBoundary.weeklyChartWindowSubstitutesForFirstWeekPeriod,
    false,
  );
});

test('every Tier A/B candidate lacking the exact value remains explicitly non-qualifying', () => {
  const tierAB = audit.candidates.filter(
    (candidate: { sourceTier: string }) =>
      candidate.sourceTier === 'tier-a-primary-official'
      || candidate.sourceTier
        === 'tier-b-provider-attributed-reputable',
  );

  assert.ok(tierAB.length >= 3);
  assert.ok(
    tierAB.every(
      (candidate: {
        exactValue: number | null;
        exactValueQualifiedForProduction: boolean;
      }) =>
        candidate.exactValue === null
        && candidate.exactValueQualifiedForProduction === false,
    ),
  );
});

test('2026-10-08 official Initial Chodong showcase is not an IU exact claim or provider-period source', () => {
  const review = audit.officialInitialChodongExpansion;
  assert.equal(review.officialSurface, 'https://www.hanteochart.com/en/honors/initial');
  assert.equal(review.publicPageShowsExactValuesForOtherRecords, true);
  assert.equal(review.publicPageShowsIuAlbum, false);
  assert.equal(review.qualifyingIuExactCopies, false);
  assert.equal(review.qualifyingIuProviderPeriod, false);
  assert.equal(review.inferredIuValueFromOtherChartsAllowed, false);
  assert.equal(review.outreachSent, false);
  const candidate = audit.candidates.find(
    (x: { evidenceId: string }) => x.evidenceId === 'hanteo:initial-hall-of-fame:2026-10-08:iu-screen',
  );
  assert.ok(candidate);
  assert.equal(candidate.sourceTier, 'tier-a-primary-official');
  assert.equal(candidate.exactValue, null);
  assert.equal(candidate.providerPeriodStart, null);
  assert.equal(candidate.providerPeriodEnd, null);
  assert.equal(candidate.exactValueQualifiedForProduction, false);
  assert.equal(candidate.periodQualifiedForProduction, false);
  assert.equal(audit.result.tierAOrBExactValueAndPeriodBindingLocated, false);
  assert.equal(audit.result.productionObservationEligible, false);
});


test('2025-W22 community transcript must not qualify seven-day IU first-week copies', () => {
  const review = audit.weeklyCommunityTranscriptFollowUp;
  assert.equal(review.sourceTier, 'tier-c-discovery-only');
  assert.equal(review.sourceType, 'user-generated-community-transcription-of-a-chart');
  assert.equal(review.originalThreadVerifiedDirectly, false);
  assert.equal(review.postDate, '2025-06-02');
  assert.equal(review.communityTranscribedWeeklyFigure.artist, 'IU');
  assert.equal(review.communityTranscribedWeeklyFigure.releaseLabel, '花書籤3');
  assert.equal(review.communityTranscribedWeeklyFigure.reportedWeeklyCopies, 72_140);
  assert.equal(review.communityTranscribedWeeklyFigure.rank, 6);
  assert.equal(review.communityTranscribedWeeklyFigure.officialWeeklyCopiesVerified, false);
  assert.equal(review.weeklyChartWindow.start, '2025-05-26');
  assert.equal(review.weeklyChartWindow.end, '2025-06-01');

  const official = review.officialChartCrosscheck;
  assert.equal(official.artistAndAlbumPresent, true);
  assert.equal(official.rank, 6);
  assert.equal(official.dateWindowConfirmed, true);
  assert.equal(official.exactCopiesVisible, false);

  const firstWeek = review.initialChodongDiscoveryComparison;
  assert.equal(firstWeek.discoveryOnlyValue, 79_940);
  assert.equal(firstWeek.discoveryOnlyPeriodStart, '2025-05-28');
  assert.equal(firstWeek.discoveryOnlyPeriodEnd, '2025-06-03');
  assert.notEqual(review.weeklyChartWindow.start, firstWeek.discoveryOnlyPeriodStart);
  assert.notEqual(review.weeklyChartWindow.end, firstWeek.discoveryOnlyPeriodEnd);
  for (const property of [
    'samePeriodAsWeeklyChart',
    'weeklyWindowCoversEntireSevenDayFirstWeek',
    'weeklyReportedCopiesCanReplaceFirstWeekValue',
    'subtractionOrExtrapolationAllowed',
    'earlierSellsideRoundedFigureIsIndependentExactCorroboration',
  ]) {
    assert.equal(firstWeek[property], false, property);
  }

  for (const property of [
    'verifiedPrimaryWeeklyCopies',
    'verifiedFirstWeekCopies',
    'firstWeekProviderPeriodStart',
    'firstWeekProviderPeriodEnd',
  ]) {
    assert.equal(review.qualification[property], null, property);
  }
  for (const property of [
    'qualifyingTierABFirstWeekValue',
    'qualifyingTierABSameSourceValuePeriodBinding',
    'usageRightsAuthorized',
    'normalizedStorageAuthorized',
    'numericProductEligible',
    'productActivationAuthorized',
  ]) {
    assert.equal(review.qualification[property], false, property);
  }
  assert.equal(review.outreachSent, false);
  assert.equal(audit.result.tierAOrBExactValueSourceLocated, false);
  assert.equal(audit.result.tierAOrBExactValueAndPeriodBindingLocated, false);
  assert.equal(audit.result.productionObservationEligible, false);
});
