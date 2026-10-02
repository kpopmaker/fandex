import {
  SNS_FANDOM_OBSERVATION_CONTRACT_VERSION,
  type SnsFandomObservationRecord,
} from './snsFandomPointObservationContract';
import type {
  SnsFandomProviderAdapterContract,
} from './snsFandomPointProviderAdapterContract';

export const SNS_FANDOM_YOUTUBE_OBSERVATION_ADAPTER_VERSION =
  'sns-fandom-youtube-observation-adapter-v1' as const;

export type YoutubeVideoMetricInput = Readonly<{
  providerVideoId: string;
  channelId: string;
  observedAt: string;
  collectedAt: string;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  publishedAt: string;
  evidenceRefs: readonly string[];
}>;

export const youtubeObservationAdapter: SnsFandomProviderAdapterContract =
  Object.freeze({
    providerId: 'youtube-data-api',
    state: 'blocked-by-rights',
    dimensions: Object.freeze([
      'public-reaction-diffusion' as const,
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
  if (
    artistIdentityRef === null
    || artistIdentityRef.trim().length === 0
    || input.providerVideoId.trim().length === 0
    || input.channelId.trim().length === 0
    || input.evidenceRefs.length === 0
  ) {
    return null;
  }

  return Object.freeze({
    contractVersion: SNS_FANDOM_OBSERVATION_CONTRACT_VERSION,
    providerId: 'youtube-data-api',
    artistIdentityRef,
    dimension: 'public-reaction-diffusion',
    observationWindow: Object.freeze({
      startAt: input.publishedAt,
      endAt: input.observedAt,
    }),
    collectionTime: input.collectedAt,
    sourceState: 'rights-blocked',
    rawMetrics: Object.freeze([
      Object.freeze({
        metricName: 'youtube.video.view-count',
        value: input.viewCount,
        unit: 'count',
      }),
      Object.freeze({
        metricName: 'youtube.video.like-count',
        value: input.likeCount,
        unit: 'count',
      }),
      Object.freeze({
        metricName: 'youtube.video.comment-count',
        value: input.commentCount,
        unit: 'count',
      }),
    ]),
    evidenceRefs: Object.freeze([...input.evidenceRefs]),
  });
}
