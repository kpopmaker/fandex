import {
  validateReportedAlbumSalesCurrentReleaseBinding,
  type ReportedAlbumSalesCurrentReleaseBinding,
} from '../../alternative-evidence/reportedAlbumSalesCurrentReleaseReview';

export const MUSIC_ALBUM_VERIFIED_RELEASE_IDENTITY_VERSION =
  'music-album-verified-release-identity-v1' as const;

// Release identity is independent of the still-unqualified first-week sales metric.
// This contract is for factual Product context, not a musicAlbumPoint score.
export type MusicAlbumVerifiedReleaseIdentity =
  | Readonly<{
      status: 'verified-identity-only';
      contractVersion: typeof MUSIC_ALBUM_VERIFIED_RELEASE_IDENTITY_VERSION;
      canonicalArtistId: string;
      canonicalReleaseId: string;
      releaseTitle: string;
      physicalReleaseDate: string;
      editionResolutionState: 'release-level' | 'edition-specific';
      reviewedAt: string;
      evidenceRefs: readonly string[];
      firstWeekExactCopies: null;
      firstWeekProviderPeriodStart: null;
      firstWeekProviderPeriodEnd: null;
      firstWeekQualification: 'not-established-by-release-identity';
      productValue: null;
      numericScoreDefined: false;
      salesProductionActivationAuthorized: false;
      salesPublicPublicationAuthorized: false;
    }>
  | Readonly<{
      status: 'blocked';
      contractVersion: typeof MUSIC_ALBUM_VERIFIED_RELEASE_IDENTITY_VERSION;
      reason: 'binding-invalid' | 'unexpected-artist';
    }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function buildMusicAlbumVerifiedReleaseIdentity(input: Readonly<{
  binding: unknown;
  expectedCanonicalArtistId: string;
}>): MusicAlbumVerifiedReleaseIdentity {
  if (!isRecord(input.binding)) {
    return Object.freeze({
      status: 'blocked' as const,
      contractVersion: MUSIC_ALBUM_VERIFIED_RELEASE_IDENTITY_VERSION,
      reason: 'binding-invalid' as const,
    });
  }
  const binding = input.binding as ReportedAlbumSalesCurrentReleaseBinding;
  try {
    if (!validateReportedAlbumSalesCurrentReleaseBinding(binding)) {
      return Object.freeze({
        status: 'blocked' as const,
        contractVersion: MUSIC_ALBUM_VERIFIED_RELEASE_IDENTITY_VERSION,
        reason: 'binding-invalid' as const,
      });
    }
  } catch {
    return Object.freeze({
      status: 'blocked' as const,
      contractVersion: MUSIC_ALBUM_VERIFIED_RELEASE_IDENTITY_VERSION,
      reason: 'binding-invalid' as const,
    });
  }
  if (
    binding.canonicalArtistId !== input.expectedCanonicalArtistId
    || binding.latestReleaseState !== 'verified-latest'
    || binding.identityState !== 'resolved'
    || binding.reviewState !== 'human-reviewed'
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      contractVersion: MUSIC_ALBUM_VERIFIED_RELEASE_IDENTITY_VERSION,
      reason: 'unexpected-artist' as const,
    });
  }

  return Object.freeze({
    status: 'verified-identity-only' as const,
    contractVersion: MUSIC_ALBUM_VERIFIED_RELEASE_IDENTITY_VERSION,
    canonicalArtistId: binding.canonicalArtistId,
    canonicalReleaseId: binding.canonicalReleaseId,
    releaseTitle: binding.releaseTitle,
    physicalReleaseDate: binding.releaseDate,
    editionResolutionState: binding.editionResolutionState,
    reviewedAt: binding.reviewedAt,
    evidenceRefs: Object.freeze([...binding.supportingEvidenceRefs]),
    firstWeekExactCopies: null,
    firstWeekProviderPeriodStart: null,
    firstWeekProviderPeriodEnd: null,
    firstWeekQualification: 'not-established-by-release-identity' as const,
    productValue: null,
    numericScoreDefined: false as const,
    salesProductionActivationAuthorized: false as const,
    salesPublicPublicationAuthorized: false as const,
  });
}
