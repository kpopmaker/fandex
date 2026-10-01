import {
  buildSnsFandomPersistenceEvidence,
  validateSnsFandomProviderApprovalEvidence,
  type SnsFandomObservation,
  type SnsFandomProviderApprovalEvidence,
  type SnsFandomPersistenceEvidence,
} from './snsFandomPointContracts';

export const SNS_FANDOM_YOUTUBE_CANDIDATE_VERSION =
  'sns-fandom-youtube-candidate-v1' as const;

export type YoutubePublicStatsSnapshot = Readonly<{
  canonicalArtistId: string;
  youtubeChannelId: string;
  providerClientRef: string;
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
      observations: readonly SnsFandomObservation[];
      persistenceEvidence: readonly SnsFandomPersistenceEvidence[];
      blockers: readonly string[];
    }>
  | Readonly<{
      contractVersion: typeof SNS_FANDOM_YOUTUBE_CANDIDATE_VERSION;
      state: 'normalized-candidate';
      observations: readonly SnsFandomObservation[];
      persistenceEvidence: readonly SnsFandomPersistenceEvidence[];
      blockers: readonly string[];
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
      providerClientRef: input.providerClientRef,
      providerEndpoints: Object.freeze([
        metric.providerContentId === null
          ? 'youtube.channels.list'
          : 'youtube.videos.list',
      ]),
      revision: null,
    }),
    lifecycle: Object.freeze({
      state: 'research' as const,
      materialClass: 'real' as const,
      blockers: Object.freeze([
        'sns-fandom-cross-dimension-methodology-not-approved',
      ]),
    }),
  });
}

export function buildYoutubeSnsFandomCandidate(
  input: Readonly<{
    snapshots: readonly YoutubePublicStatsSnapshot[];
    providerApproval: SnsFandomProviderApprovalEvidence | null;
    evaluatedAt: string;
  }>,
): YoutubeSnsFandomCandidateResult {
  const approval = input.providerApproval;
  const blockers: string[] = [];
  const requiredMetricIds = [
    'youtube.video.view-count',
    'youtube.video.like-count',
    'youtube.video.comment-count',
    'youtube.channel.subscriber-count',
  ] as const;
  const requiredEndpoints = [
    'youtube.videos.list',
    'youtube.channels.list',
  ] as const;

  if (approval === null) {
    blockers.push('youtube-provider-approval-evidence-missing');
  } else {
    if (
      !validateSnsFandomProviderApprovalEvidence(
        approval,
        input.evaluatedAt,
      ).ok
    ) {
      blockers.push('youtube-provider-approval-evidence-invalid');
    }
    if (approval.state !== 'approved') {
      blockers.push('youtube-provider-approval-not-approved');
    }
    if (approval.providerId !== 'youtube-data-api') {
      blockers.push('youtube-provider-approval-provider-mismatch');
    }
    if (
      input.snapshots.some(
        (snapshot) =>
          snapshot.providerClientRef !== approval.providerClientRef,
      )
    ) {
      blockers.push('youtube-provider-approval-client-mismatch');
    }
    if (
      !approval.approvedDimensions.includes(
        'public-reaction-diffusion',
      )
    ) {
      blockers.push('youtube-provider-approval-dimension-missing');
    }
    for (const metricId of requiredMetricIds) {
      if (!approval.approvedMetricIds.includes(metricId)) {
        blockers.push('youtube-provider-approval-metric-missing');
        break;
      }
    }
    for (const endpoint of requiredEndpoints) {
      if (!approval.allowedEndpoints.includes(endpoint)) {
        blockers.push('youtube-provider-approval-endpoint-missing');
        break;
      }
    }
  }

  if (blockers.length > 0) {
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
