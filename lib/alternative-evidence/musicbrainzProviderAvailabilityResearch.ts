import {
  buildMusicBrainzReleaseGroupBrowseUrl,
  decodeMusicBrainzReleaseGroupPage,
  MUSICBRAINZ_PROVIDER_ID,
  MUSICBRAINZ_RESEARCH_USER_AGENT,
  parseMusicBrainzAlbumCatalogResearchCommand,
  type MusicBrainzAlbumCatalogResearchDependencies,
  type MusicBrainzAlbumCatalogResearchPage,
} from './musicbrainzAlbumCatalogResearch';

export const MUSICBRAINZ_PROVIDER_AVAILABILITY_RESEARCH_CONTRACT_VERSION =
  'musicbrainz-provider-availability-research-v1';

export const MUSICBRAINZ_PROVIDER_AVAILABILITY_RESEARCH_DESCRIPTOR = Object.freeze({
  contractVersion: MUSICBRAINZ_PROVIDER_AVAILABILITY_RESEARCH_CONTRACT_VERSION,
  providerId: MUSICBRAINZ_PROVIDER_ID,
  lifecycle: 'research' as const,
  directProductContributionEligible: false as const,
  productScorePublished: false as const,
  productMethodologyFrozen: false as const,
  productionEligible: false as const,
  pollingAllowed: false as const,
  automaticRetryAllowed: false as const,
  attemptSemantics: 'single-provider-request' as const,
  failureNeverMeansMissing: true as const,
  failureNeverMeansZero: true as const,
  productFallbackAllowed: false as const,
});

export type MusicBrainzProviderAvailabilityState =
  | 'available'
  | 'provider-unavailable-or-throttled'
  | 'rate-limited'
  | 'transport-timeout'
  | 'transport-failure'
  | 'request-rejected'
  | 'provider-data-issue';

export type MusicBrainzProviderEvidenceState =
  | 'observed'
  | 'not-observed-provider-unavailable'
  | 'not-observed-rate-limited'
  | 'not-observed-transport-failure'
  | 'not-observed-request-rejected'
  | 'provider-data-issue';

export type MusicBrainzProviderRetryDisposition =
  | 'not-needed'
  | 'manual-retry-eligible'
  | 'manual-investigation-required';

export type MusicBrainzProviderObservedAttempt = Readonly<{
  contractVersion: typeof MUSICBRAINZ_PROVIDER_AVAILABILITY_RESEARCH_CONTRACT_VERSION;
  lifecycle: 'research';
  directProductContributionEligible: false;
  productScorePublished: false;
  productMethodologyFrozen: false;
  productionEligible: false;
  outcome: 'observed';
  providerId: typeof MUSICBRAINZ_PROVIDER_ID;
  canonicalArtistId: string;
  providerArtistId: string;
  attemptedAt: string;
  availabilityState: 'available';
  evidenceState: 'observed';
  retryDisposition: 'not-needed';
  automaticRetryAllowed: false;
  productFallbackAllowed: false;
  missingEquivalent: false;
  zeroEquivalent: false;
  httpStatus: number;
  retryAfter: null;
  errorCode: null;
  page: MusicBrainzAlbumCatalogResearchPage;
}>;

export type MusicBrainzProviderNotObservedAttempt = Readonly<{
  contractVersion: typeof MUSICBRAINZ_PROVIDER_AVAILABILITY_RESEARCH_CONTRACT_VERSION;
  lifecycle: 'research';
  directProductContributionEligible: false;
  productScorePublished: false;
  productMethodologyFrozen: false;
  productionEligible: false;
  outcome: 'not-observed';
  providerId: typeof MUSICBRAINZ_PROVIDER_ID;
  canonicalArtistId: string;
  providerArtistId: string;
  attemptedAt: string;
  availabilityState: Exclude<MusicBrainzProviderAvailabilityState, 'available'>;
  evidenceState: Exclude<MusicBrainzProviderEvidenceState, 'observed'>;
  retryDisposition: Exclude<MusicBrainzProviderRetryDisposition, 'not-needed'>;
  automaticRetryAllowed: false;
  productFallbackAllowed: false;
  missingEquivalent: false;
  zeroEquivalent: false;
  httpStatus: number | null;
  retryAfter: string | null;
  errorCode: string;
  providerReleaseGroupCount: null;
  returnedCount: null;
}>;

export type MusicBrainzProviderResearchAttempt =
  | MusicBrainzProviderObservedAttempt
  | MusicBrainzProviderNotObservedAttempt;

type FailureClassification = Readonly<{
  availabilityState: Exclude<MusicBrainzProviderAvailabilityState, 'available'>;
  evidenceState: Exclude<MusicBrainzProviderEvidenceState, 'observed'>;
  retryDisposition: Exclude<MusicBrainzProviderRetryDisposition, 'not-needed'>;
  errorCode: string;
}>;

function baseAttempt(input: Readonly<{
  canonicalArtistId: string;
  providerArtistId: string;
  attemptedAt: string;
}>) {
  return Object.freeze({
    contractVersion: MUSICBRAINZ_PROVIDER_AVAILABILITY_RESEARCH_CONTRACT_VERSION,
    lifecycle: 'research' as const,
    directProductContributionEligible: false as const,
    productScorePublished: false as const,
    productMethodologyFrozen: false as const,
    productionEligible: false as const,
    providerId: MUSICBRAINZ_PROVIDER_ID,
    canonicalArtistId: input.canonicalArtistId,
    providerArtistId: input.providerArtistId,
    attemptedAt: input.attemptedAt,
    automaticRetryAllowed: false as const,
    productFallbackAllowed: false as const,
    missingEquivalent: false as const,
    zeroEquivalent: false as const,
  });
}

export function classifyMusicBrainzHttpFailure(status: number): FailureClassification {
  if (status === 503) {
    return Object.freeze({
      availabilityState: 'provider-unavailable-or-throttled',
      evidenceState: 'not-observed-provider-unavailable',
      retryDisposition: 'manual-retry-eligible',
      errorCode: 'musicbrainz_provider_unavailable_or_throttled_503',
    });
  }
  if (status === 429) {
    return Object.freeze({
      availabilityState: 'rate-limited',
      evidenceState: 'not-observed-rate-limited',
      retryDisposition: 'manual-retry-eligible',
      errorCode: 'musicbrainz_rate_limited_429',
    });
  }
  if (status === 408 || status === 500 || status === 502 || status === 504) {
    return Object.freeze({
      availabilityState: 'provider-unavailable-or-throttled',
      evidenceState: 'not-observed-provider-unavailable',
      retryDisposition: 'manual-retry-eligible',
      errorCode: `musicbrainz_transient_http_${status}`,
    });
  }
  return Object.freeze({
    availabilityState: 'request-rejected',
    evidenceState: 'not-observed-request-rejected',
    retryDisposition: 'manual-investigation-required',
    errorCode: `musicbrainz_request_rejected_http_${status}`,
  });
}

function classifyThrownTransportFailure(error: unknown): FailureClassification {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return Object.freeze({
      availabilityState: 'transport-timeout',
      evidenceState: 'not-observed-transport-failure',
      retryDisposition: 'manual-retry-eligible',
      errorCode: 'musicbrainz_transport_timeout',
    });
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return Object.freeze({
      availabilityState: 'transport-timeout',
      evidenceState: 'not-observed-transport-failure',
      retryDisposition: 'manual-retry-eligible',
      errorCode: 'musicbrainz_transport_timeout',
    });
  }
  return Object.freeze({
    availabilityState: 'transport-failure',
    evidenceState: 'not-observed-transport-failure',
    retryDisposition: 'manual-retry-eligible',
    errorCode: 'musicbrainz_transport_failure',
  });
}

function dataIssueFailure(error: unknown): FailureClassification {
  const detail = error instanceof Error && error.message.trim() ? error.message : 'unknown';
  return Object.freeze({
    availabilityState: 'provider-data-issue',
    evidenceState: 'provider-data-issue',
    retryDisposition: 'manual-investigation-required',
    errorCode: `musicbrainz_provider_data_issue:${detail}`,
  });
}

function buildNotObservedAttempt(input: Readonly<{
  canonicalArtistId: string;
  providerArtistId: string;
  attemptedAt: string;
  classification: FailureClassification;
  httpStatus: number | null;
  retryAfter: string | null;
}>): MusicBrainzProviderNotObservedAttempt {
  return Object.freeze({
    ...baseAttempt(input),
    outcome: 'not-observed',
    availabilityState: input.classification.availabilityState,
    evidenceState: input.classification.evidenceState,
    retryDisposition: input.classification.retryDisposition,
    httpStatus: input.httpStatus,
    retryAfter: input.retryAfter,
    errorCode: input.classification.errorCode,
    providerReleaseGroupCount: null,
    returnedCount: null,
  });
}

export async function runMusicBrainzAlbumCatalogResearchAttempt(
  argv: readonly string[],
  dependencies: Partial<MusicBrainzAlbumCatalogResearchDependencies> = {},
): Promise<MusicBrainzProviderResearchAttempt> {
  const command = parseMusicBrainzAlbumCatalogResearchCommand(argv);
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const now = dependencies.now ?? (() => new Date());
  const userAgent = dependencies.userAgent ?? MUSICBRAINZ_RESEARCH_USER_AGENT;
  if (!userAgent.trim()) throw new Error('musicbrainz_user_agent_required');

  const attemptedAt = now().toISOString();
  const url = buildMusicBrainzReleaseGroupBrowseUrl(command);
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': userAgent,
      },
      cache: 'no-store',
    });
  } catch (error: unknown) {
    return buildNotObservedAttempt({
      canonicalArtistId: command.canonicalArtistId,
      providerArtistId: command.providerArtistId,
      attemptedAt,
      classification: classifyThrownTransportFailure(error),
      httpStatus: null,
      retryAfter: null,
    });
  }

  if (!response.ok) {
    return buildNotObservedAttempt({
      canonicalArtistId: command.canonicalArtistId,
      providerArtistId: command.providerArtistId,
      attemptedAt,
      classification: classifyMusicBrainzHttpFailure(response.status),
      httpStatus: response.status,
      retryAfter: response.headers.get('retry-after'),
    });
  }

  let rawProviderResponse: unknown;
  try {
    rawProviderResponse = await response.json();
  } catch (error: unknown) {
    return buildNotObservedAttempt({
      canonicalArtistId: command.canonicalArtistId,
      providerArtistId: command.providerArtistId,
      attemptedAt,
      classification: dataIssueFailure(error),
      httpStatus: response.status,
      retryAfter: null,
    });
  }

  let page: MusicBrainzAlbumCatalogResearchPage;
  try {
    page = decodeMusicBrainzReleaseGroupPage(rawProviderResponse, {
      canonicalArtistId: command.canonicalArtistId,
      providerArtistId: command.providerArtistId,
      requestedLimit: command.limit,
      collectedAt: now().toISOString(),
    });
  } catch (error: unknown) {
    return buildNotObservedAttempt({
      canonicalArtistId: command.canonicalArtistId,
      providerArtistId: command.providerArtistId,
      attemptedAt,
      classification: dataIssueFailure(error),
      httpStatus: response.status,
      retryAfter: null,
    });
  }

  return Object.freeze({
    ...baseAttempt({
      canonicalArtistId: command.canonicalArtistId,
      providerArtistId: command.providerArtistId,
      attemptedAt,
    }),
    outcome: 'observed',
    availabilityState: 'available',
    evidenceState: 'observed',
    retryDisposition: 'not-needed',
    httpStatus: response.status,
    retryAfter: null,
    errorCode: null,
    page,
  });
}
