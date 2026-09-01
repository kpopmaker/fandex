import {
  buildAlbumArtistCatalogFromUniverse,
  type AlbumArtistUniverseSource,
  type AlbumLiveIdentityRegistry,
  type AlbumReviewedArtistMapping,
  type AlbumReviewedReleaseMapping,
} from './albumLiveIdentityReconciliation';

export const ALBUM_REVIEWED_IDENTITY_MAPPING_PACKET_VERSION =
  'album-reviewed-identity-mapping-packet-v1' as const;

export const ALBUM_REVIEWED_IDENTITY_AUDIT_RUN_ID = 33456925202 as const;

export type AlbumReviewedIdentityPacketRelease = Readonly<{
  fandexArtistId: 'enhypen' | 'katseye' | 'straykids';
  fandexReleaseId:
    | 'enhypen-the-sin-bliss'
    | 'katseye-wild'
    | 'straykids-this-and-that';
  canonicalArtistName: string;
  canonicalReleaseTitle: string;
  circle: Readonly<{
    artistText: string;
    barcode: string;
    releaseText: string;
  }>;
  hanteo: Readonly<{
    artistId: string;
    artistText: string;
    releaseId: string;
    releaseText: string;
  }>;
  evidenceIds: readonly string[];
}>;

const COMMON_PACKET_EVIDENCE = Object.freeze([
  `album-live-identity-candidate-audit-v1:run-${ALBUM_REVIEWED_IDENTITY_AUDIT_RUN_ID}`,
  'album-live-identity-reconciliation-v1:reviewed-mapping-required',
  'circle-retail-direct-response-v1:barcode-sku-identity-non-hour',
  'hanteo-direct-response-v1:current-provider-artist-and-target-ids',
]);

export const ALBUM_REVIEWED_IDENTITY_PACKET_RELEASES: readonly AlbumReviewedIdentityPacketRelease[] =
  Object.freeze([
    Object.freeze({
      fandexArtistId: 'enhypen',
      fandexReleaseId: 'enhypen-the-sin-bliss',
      canonicalArtistName: 'ENHYPEN',
      canonicalReleaseTitle: 'THE SIN : BLISS',
      circle: Object.freeze({
        artistText: 'ENHYPEN',
        barcode: '8809704435567',
        releaseText: 'THE SIN : BLISS',
      }),
      hanteo: Object.freeze({
        artistId: '53306',
        artistText: 'ENHYPEN',
        releaseId: '900562419',
        releaseText: 'THE SIN : BLISS',
      }),
      evidenceIds: Object.freeze([
        ...COMMON_PACKET_EVIDENCE,
        'album-reviewed-identity-mapping-packet-v1:enhypen-the-sin-bliss:cross-provider-exact-artist-and-title',
      ]),
    }),
    Object.freeze({
      fandexArtistId: 'katseye',
      fandexReleaseId: 'katseye-wild',
      canonicalArtistName: 'KATSEYE',
      canonicalReleaseTitle: 'WILD',
      circle: Object.freeze({
        artistText: 'KATSEYE',
        barcode: '8800370675042',
        releaseText: 'WILD',
      }),
      hanteo: Object.freeze({
        artistId: '71779',
        artistText: 'KATSEYE',
        releaseId: '900559077',
        releaseText: 'WILD',
      }),
      evidenceIds: Object.freeze([
        ...COMMON_PACKET_EVIDENCE,
        'album-reviewed-identity-mapping-packet-v1:katseye-wild:cross-provider-exact-artist-and-title',
      ]),
    }),
    Object.freeze({
      fandexArtistId: 'straykids',
      fandexReleaseId: 'straykids-this-and-that',
      canonicalArtistName: 'Stray Kids',
      canonicalReleaseTitle: 'THIS & THAT',
      circle: Object.freeze({
        artistText: 'Stray Kids (스트레이 키즈)',
        barcode: '8809954226502',
        releaseText: 'THIS & THAT',
      }),
      hanteo: Object.freeze({
        artistId: '42116',
        artistText: 'Stray Kids',
        releaseId: '900562280',
        releaseText: 'THIS & THAT',
      }),
      evidenceIds: Object.freeze([
        ...COMMON_PACKET_EVIDENCE,
        'album-live-identity-label-variants-v1:single-full-string-parenthetical-split-only',
        'album-reviewed-identity-mapping-packet-v1:straykids-this-and-that:cross-provider-exact-release-title',
      ]),
    }),
  ]);

function artistEvidence(release: AlbumReviewedIdentityPacketRelease, provider: 'circle-retail' | 'hanteo') {
  return Object.freeze([
    ...release.evidenceIds,
    `album-reviewed-identity-mapping-packet-v1:${release.fandexArtistId}:${provider}:artist`,
  ]);
}

function releaseEvidence(release: AlbumReviewedIdentityPacketRelease, provider: 'circle-retail' | 'hanteo') {
  return Object.freeze([
    ...release.evidenceIds,
    `album-reviewed-identity-mapping-packet-v1:${release.fandexReleaseId}:${provider}:release`,
  ]);
}

export function buildAlbumReviewedIdentityRegistry(
  artists: readonly AlbumArtistUniverseSource[],
): AlbumLiveIdentityRegistry {
  const reviewedArtistMappings: AlbumReviewedArtistMapping[] = [];
  const reviewedReleaseMappings: AlbumReviewedReleaseMapping[] = [];

  for (const release of ALBUM_REVIEWED_IDENTITY_PACKET_RELEASES) {
    reviewedArtistMappings.push(
      Object.freeze({
        provider: 'circle-retail',
        providerArtistId: null,
        providerArtistText: release.circle.artistText,
        fandexArtistId: release.fandexArtistId,
        reviewState: 'provider-verified',
        evidenceIds: artistEvidence(release, 'circle-retail'),
      }),
      Object.freeze({
        provider: 'hanteo',
        providerArtistId: release.hanteo.artistId,
        providerArtistText: release.hanteo.artistText,
        fandexArtistId: release.fandexArtistId,
        reviewState: 'provider-verified',
        evidenceIds: artistEvidence(release, 'hanteo'),
      }),
    );

    reviewedReleaseMappings.push(
      Object.freeze({
        provider: 'circle-retail',
        providerReleaseId: null,
        providerSkuId: release.circle.barcode,
        providerReleaseText: release.circle.releaseText,
        fandexArtistId: release.fandexArtistId,
        fandexReleaseId: release.fandexReleaseId,
        fandexReleaseFamilyId: null,
        reviewState: 'provider-verified',
        evidenceIds: releaseEvidence(release, 'circle-retail'),
      }),
      Object.freeze({
        provider: 'hanteo',
        providerReleaseId: release.hanteo.releaseId,
        providerSkuId: null,
        providerReleaseText: release.hanteo.releaseText,
        fandexArtistId: release.fandexArtistId,
        fandexReleaseId: release.fandexReleaseId,
        fandexReleaseFamilyId: null,
        reviewState: 'provider-verified',
        evidenceIds: releaseEvidence(release, 'hanteo'),
      }),
    );
  }

  return Object.freeze({
    artists: buildAlbumArtistCatalogFromUniverse(artists),
    reviewedArtistMappings: Object.freeze(reviewedArtistMappings),
    reviewedReleaseMappings: Object.freeze(reviewedReleaseMappings),
  });
}

export const ALBUM_REVIEWED_IDENTITY_MAPPING_PACKET_POLICY = Object.freeze({
  contractVersion: ALBUM_REVIEWED_IDENTITY_MAPPING_PACKET_VERSION,
  cohortSize: ALBUM_REVIEWED_IDENTITY_PACKET_RELEASES.length,
  providerCount: 2,
  crossProviderExactTitleRequired: true,
  fuzzyMatchingAllowed: false,
  runtimeReleaseIdSynthesisAllowed: false,
  providerIdentifierReuseAsFandexIdAllowed: false,
  providerVerifiedMeaning:
    'The provider-side tuple was directly observed and cross-provider corroborated; this does not mean either provider endorses FANDEX canonical IDs.',
  persistenceAuthorized: false,
  publicationAuthorized: false,
  commercialRightsCleared: false,
});
