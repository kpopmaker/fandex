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
