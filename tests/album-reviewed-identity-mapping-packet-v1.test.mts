import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALBUM_REVIEWED_IDENTITY_MAPPING_PACKET_POLICY,
  ALBUM_REVIEWED_IDENTITY_PACKET_RELEASES,
  buildAlbumReviewedIdentityRegistry,
} from '../lib/server/ingestion/albumReviewedIdentityMappingPacket';
import {
  reconcileAlbumLiveIdentity,
  validateAlbumLiveIdentityRegistry,
  type AlbumArtistUniverseSource,
} from '../lib/server/ingestion/albumLiveIdentityReconciliation';

const universe: readonly AlbumArtistUniverseSource[] = Object.freeze([
  Object.freeze({
    id: 'enhypen',
    nameKo: 'ENHYPEN',
    nameEn: 'ENHYPEN',
    profile: Object.freeze({
      aliases: Object.freeze(['ENHYPEN']),
      koreanAliases: Object.freeze([]),
      englishAliases: Object.freeze(['ENHYPEN']),
    }),
  }),
  Object.freeze({
    id: 'katseye',
    nameKo: 'KATSEYE',
    nameEn: 'KATSEYE',
    profile: Object.freeze({
      aliases: Object.freeze(['KATSEYE']),
      koreanAliases: Object.freeze([]),
      englishAliases: Object.freeze(['KATSEYE']),
    }),
  }),
  Object.freeze({
    id: 'straykids',
    nameKo: 'Stray Kids',
    nameEn: 'Stray Kids',
    profile: Object.freeze({
      aliases: Object.freeze(['Stray Kids', '스트레이 키즈']),
      koreanAliases: Object.freeze(['스트레이 키즈']),
      englishAliases: Object.freeze(['Stray Kids']),
    }),
  }),
]);

const registry = buildAlbumReviewedIdentityRegistry(universe);

test('packet contains only the three exact cross-provider release cohort entries', () => {
  assert.deepEqual(
    ALBUM_REVIEWED_IDENTITY_PACKET_RELEASES.map(row => row.fandexReleaseId),
    ['enhypen-the-sin-bliss', 'katseye-wild', 'straykids-this-and-that'],
  );
  assert.equal(ALBUM_REVIEWED_IDENTITY_MAPPING_PACKET_POLICY.cohortSize, 3);
  assert.equal(ALBUM_REVIEWED_IDENTITY_MAPPING_PACKET_POLICY.crossProviderExactTitleRequired, true);
  assert.equal(ALBUM_REVIEWED_IDENTITY_MAPPING_PACKET_POLICY.fuzzyMatchingAllowed, false);
  assert.equal(ALBUM_REVIEWED_IDENTITY_MAPPING_PACKET_POLICY.runtimeReleaseIdSynthesisAllowed, false);
  assert.equal(ALBUM_REVIEWED_IDENTITY_MAPPING_PACKET_POLICY.persistenceAuthorized, false);
  assert.equal(ALBUM_REVIEWED_IDENTITY_MAPPING_PACKET_POLICY.publicationAuthorized, false);
});

test('registry validates and contains two provider mappings per artist and release', () => {
  validateAlbumLiveIdentityRegistry(registry);
  assert.equal(registry.reviewedArtistMappings.length, 6);
  assert.equal(registry.reviewedReleaseMappings.length, 6);
  assert.ok(registry.reviewedArtistMappings.every(mapping => mapping.reviewState === 'provider-verified'));
  assert.ok(registry.reviewedReleaseMappings.every(mapping => mapping.reviewState === 'provider-verified'));
  assert.ok(registry.reviewedArtistMappings.every(mapping => mapping.evidenceIds.length > 0));
  assert.ok(registry.reviewedReleaseMappings.every(mapping => mapping.evidenceIds.length > 0));
});

test('every Circle tuple resolves to the explicit FANDEX artist and release ID', () => {
  for (const release of ALBUM_REVIEWED_IDENTITY_PACKET_RELEASES) {
    const result = reconcileAlbumLiveIdentity({
      provider: 'circle-retail',
      providerArtistId: null,
      providerReleaseId: null,
      providerSkuId: release.circle.barcode,
      rawArtistText: release.circle.artistText,
      rawReleaseText: release.circle.releaseText,
    }, registry);

    assert.equal(result.audit.status, 'resolved');
    assert.equal(result.resolution.fandexArtistId, release.fandexArtistId);
    assert.equal(result.resolution.fandexReleaseId, release.fandexReleaseId);
    assert.equal(result.resolution.artistReviewState, 'provider-verified');
    assert.equal(result.resolution.releaseReviewState, 'provider-verified');
  }
});

test('every Hanteo tuple resolves to the same explicit FANDEX artist and release ID', () => {
  for (const release of ALBUM_REVIEWED_IDENTITY_PACKET_RELEASES) {
    const result = reconcileAlbumLiveIdentity({
      provider: 'hanteo',
      providerArtistId: release.hanteo.artistId,
      providerReleaseId: release.hanteo.releaseId,
      providerSkuId: null,
      rawArtistText: release.hanteo.artistText,
      rawReleaseText: release.hanteo.releaseText,
    }, registry);

    assert.equal(result.audit.status, 'resolved');
    assert.equal(result.resolution.fandexArtistId, release.fandexArtistId);
    assert.equal(result.resolution.fandexReleaseId, release.fandexReleaseId);
  }
});

test('provider identifiers are mapping keys and never reused as FANDEX release IDs', () => {
  for (const release of ALBUM_REVIEWED_IDENTITY_PACKET_RELEASES) {
    assert.notEqual(release.fandexReleaseId, release.circle.barcode);
    assert.notEqual(release.fandexReleaseId, release.hanteo.releaseId);
  }
});

test('same artist and title with an unreviewed Circle barcode cannot piggyback on the reviewed release mapping', () => {
  const release = ALBUM_REVIEWED_IDENTITY_PACKET_RELEASES[0];
  const result = reconcileAlbumLiveIdentity({
    provider: 'circle-retail',
    providerArtistId: null,
    providerReleaseId: null,
    providerSkuId: '0000000000000',
    rawArtistText: release.circle.artistText,
    rawReleaseText: release.circle.releaseText,
  }, registry);

  assert.equal(result.audit.status, 'release-review-required');
  assert.equal(result.resolution.fandexArtistId, release.fandexArtistId);
  assert.equal(result.resolution.fandexReleaseId, null);
});

test('same artist and title with an unreviewed Hanteo target ID cannot piggyback on the reviewed release mapping', () => {
  const release = ALBUM_REVIEWED_IDENTITY_PACKET_RELEASES[1];
  const result = reconcileAlbumLiveIdentity({
    provider: 'hanteo',
    providerArtistId: release.hanteo.artistId,
    providerReleaseId: '999999999',
    providerSkuId: null,
    rawArtistText: release.hanteo.artistText,
    rawReleaseText: release.hanteo.releaseText,
  }, registry);

  assert.equal(result.audit.status, 'release-review-required');
  assert.equal(result.resolution.fandexArtistId, release.fandexArtistId);
  assert.equal(result.resolution.fandexReleaseId, null);
});
