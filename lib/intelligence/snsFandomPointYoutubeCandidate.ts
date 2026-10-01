import {
  buildSnsFandomPersistenceEvidence,
  type SnsFandomObservation,
  type SnsFandomPersistenceEvidence,
} from './snsFandomPointContracts';

export const SNS_FANDOM_YOUTUBE_CANDIDATE_VERSION =
  'sns-fandom-youtube-candidate-v1' as const;

export type YoutubePublicStatsSnapshot = Readonly<{
  canonicalArtistId: string;
  youtubeChannelId: string;
  observedAt: string;
  collectedAt: string;
  videos: readonly Readonly<{
    videoId: string;
    viewCount: number | null;
    likeCount: number | null;
    commentCount: number | null;
  }>[];
  channelSubscriberCount: number | null;
  evidenceRef: string;
}>;

export type YoutubeSnsFandomCandidateResult =
  | Readonly<{
      contractVersion: typeof SNS_FANDOM_YOUTUBE_CANDIDATE_VERSION;
      state: 'rights-blocked';
      observations: readonly [];
      persistenceEvidence: readonly [];
      blockers: readonly string[];
    }>
  | Readonly<{
      contractVersion: typeof SNS_FANDOM_YOUTUBE_CANDIDATE_VERSION;
      state: 'normalized-candidate';
      observations: readonly SnsFandomObservation[];
      persistenceEvidence: readonly SnsFandomPersistenceEvidence[];
      blockers: readonly [];
    }>;

function valueState(value: number | null): Readonly<{
  rawValue: number | null;
  unit: 'count' | null;
  missingState: 'observed' | 'missing';
}> {
  if (value === null) {
    return Object.freeze({
      rawValue: null,
      unit: null,
      missingState: 'missing' as const,
    });
  }
  return Object.freeze({
    rawValue: value,
    unit: 'count' as const,
    missingState: 'observed' as const,
  });
}

function observation(
  input: YoutubePublicStatsSnapshot,
  metric: Readonly<{
    metricId: string;
    value: number | null;
    providerContentId: string | null;
    metricRole: 'construct-evidence' | 'context-only';
  }>,
): SnsFandomObservation {
  const observationId = [
    'youtube-data-api',
    input.canonicalArtistId,
    metric.providerContentId ?? input.youtubeChannelId,
    metric.metricId,
    input.observedAt,
  ].join(':');

  return Object.freeze({
    contractVersion: 'fandex-observation-v1' as const,
    observationId,
    providerId: 'youtube-data-api' as const,
    entity: Object.freeze({
      entityType: 'artist' as const,
      canonicalArtistId: input.canonicalArtistId,
      providerArtistId: input.youtubeChannelId,
      providerContentId: metric.providerContentId,
      identityState: 'bound' as const,
    }),
    variable: Object.freeze({
      variableId: 'snsFandomPoint' as const,
      metricFamily: 'sns-fandom' as const,
      dimension: 'public-reaction-diffusion' as const,
      metricId: metric.metricId,
      metricRole: metric.metricRole,
    }),
    value: valueState(metric.value),
    time: Object.freeze({
      providerPeriodStart: null,
      providerPeriodEnd: null,
      observedAt: input.observedAt,
      collectedAt: input.collectedAt,
    }),
    evidence: Object.freeze({
      evidenceRef: input.evidenceRef,
      revision: null,
    }),
    lifecycle: Object.freeze({
      state: 'research' as const,
      materialClass: 'real' as const,
      blockers: Object.freeze([
        'youtube-provider-approval-required-before-production-use',
      ]),
    }),
  });
}

export function buildYoutubeSnsFandomCandidate(
  input: Readonly<{
    snapshots: readonly YoutubePublicStatsSnapshot[];
    providerApproval: Readonly<{
      analyticsDerivedMetricsUseCaseApproved: boolean;
      retentionExtensionOrRefreshPolicyApproved: boolean;
    }>;
  }>,
): YoutubeSnsFandomCandidateResult {
  if (
    !input.providerApproval.analyticsDerivedMetricsUseCaseApproved
    || !input.providerApproval.retentionExtensionOrRefreshPolicyApproved
  ) {
    const blockers: string[] = [];
    if (!input.providerApproval.analyticsDerivedMetricsUseCaseApproved) {
      blockers.push('youtube-derived-metrics-approval-missing');
    }
    if (!input.providerApproval.retentionExtensionOrRefreshPolicyApproved) {
      blockers.push('youtube-retention-policy-approval-missing');
    }
    return Object.freeze({
      contractVersion: SNS_FANDOM_YOUTUBE_CANDIDATE_VERSION,
      state: 'rights-blocked' as const,
      observations: Object.freeze([]),
      persistenceEvidence: Object.freeze([]),
      blockers: Object.freeze(blockers),
    });
  }

  const observations: SnsFandomObservation[] = [];
  for (const snapshot of input.snapshots) {
    for (const video of snapshot.videos) {
      observations.push(
        observation(snapshot, {
          metricId: 'youtube.video.view-count',
          value: video.viewCount,
          providerContentId: video.videoId,
          metricRole: 'construct-evidence',
        }),
        observation(snapshot, {
          metricId: 'youtube.video.like-count',
          value: video.likeCount,
          providerContentId: video.videoId,
          metricRole: 'construct-evidence',
        }),
        observation(snapshot, {
          metricId: 'youtube.video.comment-count',
          value: video.commentCount,
          providerContentId: video.videoId,
          metricRole: 'construct-evidence',
        }),
      );
    }

    observations.push(
      observation(snapshot, {
        metricId: 'youtube.channel.subscriber-count',
        value: snapshot.channelSubscriberCount,
        providerContentId: null,
        metricRole: 'context-only',
      }),
    );
  }

  return Object.freeze({
    contractVersion: SNS_FANDOM_YOUTUBE_CANDIDATE_VERSION,
    state: 'normalized-candidate' as const,
    observations: Object.freeze(observations),
    persistenceEvidence:
      buildSnsFandomPersistenceEvidence(observations),
    blockers: Object.freeze([]),
  });
}
