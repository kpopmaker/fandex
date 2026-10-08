import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const research = JSON.parse(
  readFileSync(
    'data/fandex-cloud-v10/product/iu_music_album_hanteo_historical_selector_research_v1.json',
    'utf8',
  ),
);

test('IU Hanteo historical selector research rejects unstable resource IDs as canonical release identity', () => {
  assert.equal(research.canonicalArtistId, 'iu');
  assert.deepEqual(
    research.officialHistoricalPageObservations.map(
      (entry: { resourceAlbumIdObserved: string }) =>
        entry.resourceAlbumIdObserved,
    ),
    ['900544062', '900544267'],
  );
  assert.equal(
    research.identityFinding.sameReleaseResourceIdStableAcrossWeeks,
    false,
  );
  assert.equal(
    research.identityFinding.releaseIdentityAutoResolutionAllowed,
    false,
  );
});

test('historical exact-copy selector remains fail-closed without a provider-documented selector', () => {
  assert.equal(
    research.currentApiKnowledge.currentResponseSalesField,
    'detail.salesVolume',
  );
  assert.equal(
    research.currentApiKnowledge.historicalSelectorVerified,
    false,
  );
  assert.equal(
    research.currentApiKnowledge.guessedHistoricalParametersAllowed,
    false,
  );
  assert.equal(
    research.result.historicalExactCopiesSelectorLocated,
    false,
  );
  assert.equal(research.result.exact79940Qualified, false);
  assert.equal(
    research.result.productionObservationEligible,
    false,
  );
  assert.equal(
    research.productionBoundary.liveHistoricalNetworkProbeExecuted,
    false,
  );
  assert.equal(
    research.productionBoundary.durableWriteAuthorized,
    false,
  );
});


test('2026-10-08 public implementation crosscheck cannot promote current Hanteo charts to historical IU sales', () => {
  const check = research.boundedPublicImplementationCrosscheck;
  assert.equal(check.assessedOn, '2026-10-08');
  assert.equal(check.officialHistoricalWeb.periodSpecificRanksExposed, true);
  assert.equal(check.officialHistoricalWeb.exactPhysicalCopiesExposed, false);
  assert.equal(check.officialHistoricalWeb.frontendBundleOriginalSourceInspected, false);
  assert.equal(check.officialHistoricalWeb.historicalXhrRequestShapeValidated, false);
  assert.equal(check.sourceInspectedImplementations.length, 2);
  for (const source of check.sourceInspectedImplementations) {
    assert.equal(source.sourceCodeInspected, true);
    assert.equal(source.requestPath, '/v4/ranking/list/ALBUM/REAL/BASIC');
    assert.equal(source.historicalAlbumSelectorImplemented, false);
    assert.ok(source.url.startsWith('https://github.com/'));
  }
  assert.equal(check.wrapperDocumentation.archivedReadmeInspected, true);
  assert.equal(check.wrapperDocumentation.originalImplementationSourceInspected, false);
  assert.equal(check.wrapperDocumentation.hanteoHistoricalOverrideDocumented, false);
  assert.equal(check.wrapperDocumentation.circleHistoricalOverridesDocumented, true);
  assert.equal(check.verifiedHistoricalAlbumRequestShape, null);
  assert.equal(check.noSelectorInferenceFromWeeklyPageUrl, true);
  assert.equal(check.currentSalesVolumeCannotBeReinterpretedAsHistoricalInitialChodong, true);
  assert.equal(check.directProviderApiCommercialUseAuthorization, false);
  assert.equal(check.productionBoundary.guessedHistoricalQueryForbidden, true);
  assert.equal(check.productionBoundary.historicalNetworkProbeExecuted, false);
  assert.equal(check.productionBoundary.exact79940ProductionQualified, false);
  assert.equal(check.productionBoundary.productionObservationEligible, false);
  assert.equal(check.productionBoundary.durableWriteAuthorized, false);
  assert.equal(check.productionBoundary.productActivationAuthorized, false);
});
