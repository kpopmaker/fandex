import {
  buildSnsFandomPersistenceEvidence,
  validateSnsFandomProviderApprovalEvidence,
  type SnsFandomObservation,
  type SnsFandomProviderApprovalEvidence,
  type SnsFandomPersistenceEvidence,
} from './snsFandomPointContracts';

export const SNS_FANDOM_YOUTUBE_COMMENT_PERSISTENCE_CANDIDATE_VERSION =
  'sns-fandom-youtube-comment-persistence-candidate-v1' as const;

export type YoutubePublicCommentRecord = Readonly<{
  videoId: string;
  commentId: string;
  authorChannelId: string | null;
  publishedAt: string;
}>;

export type YoutubePublicCommentPersistenceBatch = Readonly<{
  canonicalArtistId: string;
  youtubeChannelId: string;
  providerPeriodStart: string;
  providerPeriodEnd: string;
  observedAt: string;
  collectedAt: string;
  comments: readonly YoutubePublicCommentRecord[];
  evidenceRef: string;
}>;

type Safety = Readonly<{
  rawCommentTextPersisted: false;
  rawCommentIdsPersisted: false;
  rawCommenterChannelIdsPersisted: false;
  individualFanIdentityInferred: false;
  botOrFakeEngagementClassificationPerformed: false;
}>;

const SAFETY: Safety = Object.freeze({
  rawCommentTextPersisted: false as const,
  rawCommentIdsPersisted: false as const,
  rawCommenterChannelIdsPersisted: false as const,
  individualFanIdentityInferred: false as const,
  botOrFakeEngagementClassificationPerformed: false as const,
});

export type YoutubePublicCommentPersistenceCandidateResult =
  | Readonly<{
      contractVersion:
        typeof SNS_FANDOM_YOUTUBE_COMMENT_PERSISTENCE_CANDIDATE_VERSION;
      state: 'rights-blocked' | 'input-blocked';
      observations: readonly SnsFandomObservation[];
      persistenceEvidence: readonly SnsFandomPersistenceEvidence[];
      summary: Readonly<{
        receivedCommentCount: number;
        eligibleCommentCount: number;
        duplicateCommentCount: number;
        missingAuthorChannelCount: number;
        distinctPublicCommenterCount: number;
        returningPublicCommenterCount: number;
      }>;
      safety: Safety;
      blockers: readonly string[];
    }>
  | Readonly<{
      contractVersion:
        typeof SNS_FANDOM_YOUTUBE_COMMENT_PERSISTENCE_CANDIDATE_VERSION;
      state: 'normalized-candidate';
      observations: readonly SnsFandomObservation[];
      persistenceEvidence: readonly SnsFandomPersistenceEvidence[];
      summary: Readonly<{
        receivedCommentCount: number;
        eligibleCommentCount: number;
        duplicateCommentCount: number;
        missingAuthorChannelCount: number;
        distinctPublicCommenterCount: number;
        returningPublicCommenterCount: number;
      }>;
      safety: Safety;
      blockers: readonly string[];
    }>;

function validIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function emptySummary(receivedCommentCount: number) {
  return Object.freeze({
    receivedCommentCount,
    eligibleCommentCount: 0,
    duplicateCommentCount: 0,
    missingAuthorChannelCount: 0,
    distinctPublicCommenterCount: 0,
    returningPublicCommenterCount: 0,
  });
}

function observation(
  batch: YoutubePublicCommentPersistenceBatch,
  metric: Readonly<{
    metricId: string;
    rawValue: number;
    metricRole: 'construct-evidence' | 'context-only';
  }>,
): SnsFandomObservation {
  return Object.freeze({
    contractVersion: 'fandex-observation-v1' as const,
    observationId: [
      'youtube-comments-derived',
      batch.canonicalArtistId,
      batch.youtubeChannelId,
      metric.metricId,
      batch.providerPeriodStart,
      batch.providerPeriodEnd,
    ].join(':'),
    providerId: 'youtube-comments-derived' as const,
    entity: Object.freeze({
      entityType: 'artist' as const,
      canonicalArtistId: batch.canonicalArtistId,
      providerArtistId: batch.youtubeChannelId,
      providerContentId: null,
      identityState: 'bound' as const,
    }),
    variable: Object.freeze({
      variableId: 'snsFandomPoint' as const,
      metricFamily: 'sns-fandom' as const,
      dimension: 'fandom-activity-persistence' as const,
      metricId: metric.metricId,
      metricRole: metric.metricRole,
    }),
    value: Object.freeze({
      rawValue: metric.rawValue,
      unit: 'count' as const,
      missingState: 'observed' as const,
    }),
    time: Object.freeze({
      providerPeriodStart: batch.providerPeriodStart,
      providerPeriodEnd: batch.providerPeriodEnd,
      observedAt: batch.observedAt,
      collectedAt: batch.collectedAt,
    }),
    evidence: Object.freeze({
      evidenceRef: batch.evidenceRef,
      revision: null,
    }),
    lifecycle: Object.freeze({
      state: 'research' as const,
      materialClass: 'real' as const,
      blockers: Object.freeze([
        'youtube-commenter-recurrence-derived-metric-use-case-not-approved-for-production',
      ]),
    }),
  });
}

export function buildYoutubePublicCommentPersistenceCandidate(
  input: Readonly<{
    batch: YoutubePublicCommentPersistenceBatch;
    providerApproval: SnsFandomProviderApprovalEvidence | null;
    evaluatedAt: string;
  }>,
): YoutubePublicCommentPersistenceCandidateResult {
  const approval = input.providerApproval;
  const approvalBlockers: string[] = [];
  const requiredMetricIds = [
    'youtube.public-commenter.cross-content-repeat-count',
    'youtube.public-commenter.distinct-count',
  ] as const;
  const requiredEndpoints = [
    'youtube.commentThreads.list',
    'youtube.comments.list',
  ] as const;

  if (approval === null) {
    approvalBlockers.push(
      'youtube-commenter-recurrence-provider-approval-evidence-missing',
    );
  } else {
    if (
      !validateSnsFandomProviderApprovalEvidence(
        approval,
        input.evaluatedAt,
      ).ok
    ) {
      approvalBlockers.push(
        'youtube-commenter-recurrence-provider-approval-invalid',
      );
    }
    if (approval.state !== 'approved') {
      approvalBlockers.push(
        'youtube-commenter-recurrence-provider-approval-not-approved',
      );
    }
    if (approval.providerId !== 'youtube-comments-derived') {
      approvalBlockers.push(
        'youtube-commenter-recurrence-provider-approval-provider-mismatch',
      );
    }
    if (
      !approval.approvedDimensions.includes(
        'fandom-activity-persistence',
      )
    ) {
      approvalBlockers.push(
        'youtube-commenter-recurrence-provider-approval-dimension-missing',
      );
    }
    for (const metricId of requiredMetricIds) {
      if (!approval.approvedMetricIds.includes(metricId)) {
        approvalBlockers.push(
          'youtube-commenter-recurrence-provider-approval-metric-missing',
        );
        break;
      }
    }
    for (const endpoint of requiredEndpoints) {
      if (!approval.allowedEndpoints.includes(endpoint)) {
        approvalBlockers.push(
          'youtube-commenter-recurrence-provider-approval-endpoint-missing',
        );
        break;
      }
    }
  }

  if (approvalBlockers.length > 0) {
    return Object.freeze({
      contractVersion:
        SNS_FANDOM_YOUTUBE_COMMENT_PERSISTENCE_CANDIDATE_VERSION,
      state: 'rights-blocked' as const,
      observations: Object.freeze([]),
      persistenceEvidence: Object.freeze([]),
      summary: emptySummary(input.batch.comments.length),
      safety: SAFETY,
      blockers: Object.freeze(approvalBlockers),
    });
  }

  const batch = input.batch;
  const blockers: string[] = [];

  if (
    batch.canonicalArtistId.trim().length === 0
    || batch.youtubeChannelId.trim().length === 0
    || batch.evidenceRef.trim().length === 0
  ) {
    blockers.push('youtube-comment-persistence-batch-identity-invalid');
  }

  for (const value of [
    batch.providerPeriodStart,
    batch.providerPeriodEnd,
    batch.observedAt,
    batch.collectedAt,
  ]) {
    if (!validIso(value)) {
      blockers.push('youtube-comment-persistence-time-invalid');
      break;
    }
  }

  if (
    validIso(batch.providerPeriodStart)
    && validIso(batch.providerPeriodEnd)
    && Date.parse(batch.providerPeriodStart) > Date.parse(batch.providerPeriodEnd)
  ) {
    blockers.push('youtube-comment-persistence-period-order-invalid');
  }
  if (
    validIso(batch.providerPeriodEnd)
    && validIso(batch.observedAt)
    && Date.parse(batch.observedAt) < Date.parse(batch.providerPeriodEnd)
  ) {
    blockers.push('youtube-comment-persistence-observation-before-period-end');
  }
  if (
    validIso(batch.observedAt)
    && validIso(batch.collectedAt)
    && Date.parse(batch.collectedAt) < Date.parse(batch.observedAt)
  ) {
    blockers.push('youtube-comment-persistence-collection-before-observation');
  }

  const seenCommentIds = new Set<string>();
  let duplicateCommentCount = 0;
  let missingAuthorChannelCount = 0;
  const videosByAuthor = new Map<string, Set<string>>();

  for (const comment of batch.comments) {
    if (
      comment.commentId.trim().length === 0
      || comment.videoId.trim().length === 0
      || !validIso(comment.publishedAt)
    ) {
      blockers.push('youtube-comment-persistence-comment-invalid');
      continue;
    }

    if (
      validIso(batch.providerPeriodStart)
      && validIso(batch.providerPeriodEnd)
      && (
        Date.parse(comment.publishedAt) < Date.parse(batch.providerPeriodStart)
        || Date.parse(comment.publishedAt) > Date.parse(batch.providerPeriodEnd)
      )
    ) {
      blockers.push('youtube-comment-persistence-comment-outside-period');
      continue;
    }

    if (seenCommentIds.has(comment.commentId)) {
      duplicateCommentCount += 1;
      continue;
    }
    seenCommentIds.add(comment.commentId);

    const authorChannelId = comment.authorChannelId?.trim();
    if (!authorChannelId) {
      missingAuthorChannelCount += 1;
      continue;
    }

    const videos = videosByAuthor.get(authorChannelId) ?? new Set<string>();
    videos.add(comment.videoId);
    videosByAuthor.set(authorChannelId, videos);
  }

  if (blockers.length > 0) {
    return Object.freeze({
      contractVersion:
        SNS_FANDOM_YOUTUBE_COMMENT_PERSISTENCE_CANDIDATE_VERSION,
      state: 'input-blocked' as const,
      observations: Object.freeze([]),
      persistenceEvidence: Object.freeze([]),
      summary: Object.freeze({
        receivedCommentCount: batch.comments.length,
        eligibleCommentCount: Array.from(videosByAuthor.values())
          .reduce((sum, videos) => sum + videos.size, 0),
        duplicateCommentCount,
        missingAuthorChannelCount,
        distinctPublicCommenterCount: videosByAuthor.size,
        returningPublicCommenterCount: 0,
      }),
      safety: SAFETY,
      blockers: Object.freeze(Array.from(new Set(blockers))),
    });
  }

  const returningPublicCommenterCount = Array.from(
    videosByAuthor.values(),
  ).filter((videos) => videos.size > 1).length;

  const observations = Object.freeze([
    observation(batch, {
      metricId: 'youtube.public-commenter.cross-content-repeat-count',
      rawValue: returningPublicCommenterCount,
      metricRole: 'construct-evidence',
    }),
    observation(batch, {
      metricId: 'youtube.public-commenter.distinct-count',
      rawValue: videosByAuthor.size,
      metricRole: 'context-only',
    }),
  ]);

  const eligibleCommentCount =
    batch.comments.length - duplicateCommentCount - missingAuthorChannelCount;

  return Object.freeze({
    contractVersion:
      SNS_FANDOM_YOUTUBE_COMMENT_PERSISTENCE_CANDIDATE_VERSION,
    state: 'normalized-candidate' as const,
    observations,
    persistenceEvidence:
      buildSnsFandomPersistenceEvidence(observations),
    summary: Object.freeze({
      receivedCommentCount: batch.comments.length,
      eligibleCommentCount,
      duplicateCommentCount,
      missingAuthorChannelCount,
      distinctPublicCommenterCount: videosByAuthor.size,
      returningPublicCommenterCount,
    }),
    safety: SAFETY,
    blockers: Object.freeze([
      'youtube-comment-history-completeness-not-guaranteed',
      'youtube-commenter-recurrence-remains-research-until-provider-approval-recorded',
    ]),
  });
}
