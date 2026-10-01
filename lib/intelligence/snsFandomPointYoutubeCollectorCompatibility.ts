export const SNS_FANDOM_YOUTUBE_COLLECTOR_COMPATIBILITY_VERSION =
  'sns-fandom-youtube-collector-compatibility-v1' as const;

export type YoutubeCollectorCompatibilityProfile = Readonly<{
  collectorId: string;
  sourceRef: string;
  missingStatisticSemantics:
    | 'preserve-null'
    | 'coerce-missing-to-zero'
    | 'unknown';
  emitsProviderChannelId: boolean;
  emitsObservedAt: boolean;
  emitsCollectedAt: boolean;
  persistsRawApiResponse: boolean;
  rawApiResponseRetentionQualified: boolean;
  emitsEvidenceRef: boolean;
}>;

export type YoutubeCollectorCompatibilityResult = Readonly<{
  contractVersion:
    typeof SNS_FANDOM_YOUTUBE_COLLECTOR_COMPATIBILITY_VERSION;
  state: 'production-compatible' | 'not-production-compatible';
  productionCompatible: boolean;
  blockers: readonly string[];
}>;

export const ARTIST_EXPANSION_YOUTUBE_COLLECTOR_V1_PROFILE:
  YoutubeCollectorCompatibilityProfile = Object.freeze({
    collectorId: 'youtube_collect_video_metrics_v1',
    sourceRef:
      'validation/artist-expansion-youtube-shadow-v1@ed8b7c293ebb9d5927cd004367546bed01b5f732',
    missingStatisticSemantics: 'coerce-missing-to-zero' as const,
    emitsProviderChannelId: false,
    emitsObservedAt: false,
    emitsCollectedAt: false,
    persistsRawApiResponse: true,
    rawApiResponseRetentionQualified: false,
    emitsEvidenceRef: false,
  });

export function evaluateYoutubeCollectorCompatibility(
  profile: YoutubeCollectorCompatibilityProfile,
): YoutubeCollectorCompatibilityResult {
  const blockers: string[] = [];

  if (profile.missingStatisticSemantics !== 'preserve-null') {
    blockers.push('youtube-collector-missing-semantics-not-preserved');
  }
  if (!profile.emitsProviderChannelId) {
    blockers.push('youtube-collector-provider-channel-id-missing');
  }
  if (!profile.emitsObservedAt) {
    blockers.push('youtube-collector-observed-at-missing');
  }
  if (!profile.emitsCollectedAt) {
    blockers.push('youtube-collector-collected-at-missing');
  }
  if (
    profile.persistsRawApiResponse
    && !profile.rawApiResponseRetentionQualified
  ) {
    blockers.push('youtube-collector-raw-response-retention-unqualified');
  }
  if (!profile.emitsEvidenceRef) {
    blockers.push('youtube-collector-evidence-ref-missing');
  }

  return Object.freeze({
    contractVersion:
      SNS_FANDOM_YOUTUBE_COLLECTOR_COMPATIBILITY_VERSION,
    state: blockers.length === 0
      ? 'production-compatible' as const
      : 'not-production-compatible' as const,
    productionCompatible: blockers.length === 0,
    blockers: Object.freeze(blockers),
  });
}

export const ARTIST_EXPANSION_YOUTUBE_COLLECTOR_V1_COMPATIBILITY =
  evaluateYoutubeCollectorCompatibility(
    ARTIST_EXPANSION_YOUTUBE_COLLECTOR_V1_PROFILE,
  );
