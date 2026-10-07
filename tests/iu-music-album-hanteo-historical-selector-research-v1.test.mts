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
