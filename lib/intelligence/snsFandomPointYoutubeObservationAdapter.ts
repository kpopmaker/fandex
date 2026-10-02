import type {
  SnsFandomObservationRecord,
} from './snsFandomPointObservationContract';
import type {
  SnsFandomProviderAdapterContract,
} from './snsFandomPointProviderAdapterContract';

export const SNS_FANDOM_YOUTUBE_OBSERVATION_ADAPTER_VERSION =
  'sns-fandom-youtube-observation-adapter-v1' as const;

type YoutubeVideoMetricInput = Readonly<{
  providerVideoId: string;
  channelId: string;
  observedAt: string;
  collectedAt: string;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  publishedAt: string;
}>;

export const youtubeObservationAdapter: SnsFandomProviderAdapterContract =
  Object.freeze({
    providerId: 'youtube-data-api',
    state: 'blocked-by-rights',
    dimensions: Object.freeze([
      'public-reaction-diffusion',
    ]),
    rightsRequired: Object.freeze([
      'youtube-compliance-audit-grant',
      'youtube-derived-metrics-amendment-grant',
    ]),
    transform: 'youtube-content-metrics-to-observation-record',
  });

export function mapYoutubeVideoMetricsToObservation(
  input: YoutubeVideoMetricInput,
  artistIdentityRef: string | null,
): SnsFandomObservationRecord | null {
  if (artistIdentityRef === null) return null;

  if (
    input.providerVideoId.length === 0
    || input.channelId.length === 0
  ) {
    return null;
  }

  return Object.freeze({
    contractVersion: SNS_FANDOM_YOUTUBE_OBSERVATION_ADAPTER_VERSION,
    providerId: 'youtube-data-api',
    artistIdentityRef,
    dimension: 'public-reaction-diffusion',
    sourceObservation: Object.freeze({
      sourceId: input.providerVideoId,
      observedAt: input.observedAt,
      collectedAt: input.collectedAt,
      metrics: Object.freeze({
        viewCount: input.viewCount,
        likeCount: input.likeCount,
        commentCount: input.commentCount,
      }),
    }),
    identityBinding: Object.freeze({
      providerChannelId: input.channelId,
      verified: false,
    }),
    eligibility: Object.freeze({
      rightsState: 'blocked-by-rights',
      collectionState: 'not-collectable',
    }),
  });
}
