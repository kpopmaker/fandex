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
