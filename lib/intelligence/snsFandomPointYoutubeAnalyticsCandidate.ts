import {
  buildSnsFandomPersistenceEvidence,
  isSnsFandomArtistEntitlementActiveFor,
  validateSnsFandomArtistProviderEntitlement,
  type SnsFandomArtistProviderEntitlement,
  type SnsFandomObservation,
  type SnsFandomPersistenceEvidence,
} from './snsFandomPointContracts';

export const SNS_FANDOM_YOUTUBE_ANALYTICS_CANDIDATE_VERSION =
  'sns-fandom-youtube-analytics-candidate-v1' as const;

export type YoutubeSubscribedAudienceActivitySnapshot = Readonly<{
  canonicalArtistId: string;
  youtubeChannelId: string;
  providerClientRef: string;
  providerPeriodStart: string;
  providerPeriodEnd: string;
  observedAt: string;
  collectedAt: string;
  subscribedViews: number | null;
  evidenceRef: string;
}>;

export type YoutubeAnalyticsFandomPersistenceCandidateResult =
  | Readonly<{
      contractVersion:
        typeof SNS_FANDOM_YOUTUBE_ANALYTICS_CANDIDATE_VERSION;
      state: 'entitlement-blocked';
      observations: readonly SnsFandomObservation[];
      persistenceEvidence: readonly SnsFandomPersistenceEvidence[];
      blockers: readonly string[];
    }>
  | Readonly<{
      contractVersion:
        typeof SNS_FANDOM_YOUTUBE_ANALYTICS_CANDIDATE_VERSION;
      state: 'normalized-authorized-account-candidate';
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
  snapshot: YoutubeSubscribedAudienceActivitySnapshot,
): SnsFandomObservation {
  return Object.freeze({
    contractVersion: 'fandex-observation-v1' as const,
    observationId: [
      'youtube-analytics-api',
      snapshot.canonicalArtistId,
      snapshot.youtubeChannelId,
      'subscribed-view-count',
      snapshot.providerPeriodStart,
      snapshot.providerPeriodEnd,
    ].join(':'),
    providerId: 'youtube-analytics-api' as const,
    entity: Object.freeze({
      entityType: 'artist' as const,
      canonicalArtistId: snapshot.canonicalArtistId,
      providerArtistId: snapshot.youtubeChannelId,
      providerContentId: null,
      identityState: 'bound' as const,
    }),
    variable: Object.freeze({
      variableId: 'snsFandomPoint' as const,
      metricFamily: 'sns-fandom' as const,
      dimension: 'fandom-activity-persistence' as const,
      metricId: 'youtube.analytics.subscribed-view-count',
      metricRole: 'construct-evidence' as const,
    }),
    value: valueState(snapshot.subscribedViews),
    time: Object.freeze({
      providerPeriodStart: snapshot.providerPeriodStart,
      providerPeriodEnd: snapshot.providerPeriodEnd,
      observedAt: snapshot.observedAt,
      collectedAt: snapshot.collectedAt,
    }),
    evidence: Object.freeze({
      evidenceRef: snapshot.evidenceRef,
      providerClientRef: snapshot.providerClientRef,
      revision: null,
    }),
    lifecycle: Object.freeze({
      state: 'research' as const,
      materialClass: 'real' as const,
      blockers: Object.freeze([
        'youtube-analytics-authorized-account-coverage-only',
      ]),
    }),
  });
}

export function buildYoutubeAnalyticsFandomPersistenceCandidate(
  input: Readonly<{
    snapshots: readonly YoutubeSubscribedAudienceActivitySnapshot[];
    entitlement: SnsFandomArtistProviderEntitlement | null;
    evaluatedAt: string;
  }>,
): YoutubeAnalyticsFandomPersistenceCandidateResult {
  const firstSnapshot = input.snapshots[0] ?? null;
  const entitlement = input.entitlement;
  const blockers: string[] = [];

  if (entitlement === null) {
    blockers.push('youtube-analytics-channel-owner-entitlement-missing');
  } else {
    const entitlementValidation =
      validateSnsFandomArtistProviderEntitlement(
        entitlement,
        input.evaluatedAt,
      );

    if (!entitlementValidation.ok) {
      blockers.push('youtube-analytics-entitlement-invalid');
    }
    if (entitlement.state !== 'active') {
      blockers.push('youtube-analytics-entitlement-not-active');
    }
    if (entitlement.providerId !== 'youtube-analytics-api') {
      blockers.push('youtube-analytics-entitlement-provider-mismatch');
    }
    if (entitlement.authorizationClass !== 'channel-owner-oauth') {
      blockers.push('youtube-analytics-entitlement-class-invalid');
    }
    if (
      !entitlement.allowedDimensions.includes(
        'fandom-activity-persistence',
      )
    ) {
      blockers.push('youtube-analytics-persistence-dimension-not-authorized');
    }
    if (
      !entitlement.authorizedScopes.includes(
        'https://www.googleapis.com/auth/yt-analytics.readonly',
      )
    ) {
      blockers.push('youtube-analytics-readonly-scope-missing');
    }
    if (
      firstSnapshot !== null
      && !isSnsFandomArtistEntitlementActiveFor(entitlement, {
        canonicalArtistId: firstSnapshot.canonicalArtistId,
        providerId: 'youtube-analytics-api',
        providerClientRef: firstSnapshot.providerClientRef,
        providerArtistId: firstSnapshot.youtubeChannelId,
        dimension: 'fandom-activity-persistence',
        evaluatedAt: input.evaluatedAt,
      })
    ) {
      blockers.push('youtube-analytics-entitlement-not-active-for-snapshot');
    }
  }

  if (
    firstSnapshot !== null
    && input.snapshots.some((snapshot) => (
      snapshot.canonicalArtistId !== firstSnapshot.canonicalArtistId
      || snapshot.youtubeChannelId !== firstSnapshot.youtubeChannelId
      || snapshot.providerClientRef !== firstSnapshot.providerClientRef
    ))
  ) {
    blockers.push('youtube-analytics-snapshot-identity-mixed');
  }

  if (blockers.length > 0) {
    return Object.freeze({
      contractVersion: SNS_FANDOM_YOUTUBE_ANALYTICS_CANDIDATE_VERSION,
      state: 'entitlement-blocked' as const,
      observations: Object.freeze([]),
      persistenceEvidence: Object.freeze([]),
      blockers: Object.freeze(blockers),
    });
  }

  const observations = input.snapshots.map(observation);

  return Object.freeze({
    contractVersion: SNS_FANDOM_YOUTUBE_ANALYTICS_CANDIDATE_VERSION,
    state: 'normalized-authorized-account-candidate' as const,
    observations: Object.freeze(observations),
    persistenceEvidence:
      buildSnsFandomPersistenceEvidence(observations),
    blockers: Object.freeze([
      'youtube-analytics-generic-kpop-coverage-not-established',
    ]),
  });
}
