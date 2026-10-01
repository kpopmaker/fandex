export const SNS_FANDOM_POINT_CONTRACT_VERSION =
  'sns-fandom-point-production-contract-v1' as const;

export type SnsFandomDimension =
  | 'public-reaction-diffusion'
  | 'fandom-activity-persistence';

export type SnsFandomProviderId =
  | 'youtube-data-api'
  | 'instagram-api'
  | 'tiktok-display-api'
  | 'tiktok-research-api'
  | 'x-api';

export type SnsFandomProviderQualificationState =
  | 'production-ready'
  | 'conditional-approval-required'
  | 'authorized-account-only'
  | 'not-production-eligible'
  | 'rights-unresolved';

export type SnsFandomProviderQualification = Readonly<{
  providerId: SnsFandomProviderId;
  state: SnsFandomProviderQualificationState;
  constructCoverage: readonly SnsFandomDimension[];
  authorizedAcquisition:
    | 'available-after-provider-approval'
    | 'requires-artist-account-authorization'
    | 'not-available-for-commercial-product'
    | 'unverified';
  commercialUse: 'conditional' | 'not-eligible' | 'unverified';
  recurringAutomatedCollection:
    | 'conditional'
    | 'authorized-account-only'
    | 'not-eligible'
    | 'unverified';
  storageRetention: 'conditional' | 'restricted' | 'unverified';
  derivedMetricPublication: 'conditional' | 'not-eligible' | 'unverified';
  identityCoverage:
    | 'public-channel-id'
    | 'authorized-account-only'
    | 'research-only'
    | 'unverified';
  historicalAccess:
    | 'prospective-snapshots-required'
    | 'authorized-account-history'
    | 'research-only'
    | 'unverified';
  blockers: readonly string[];
  evidenceUrls: readonly string[];
}>;

export const SNS_FANDOM_PROVIDER_QUALIFICATIONS: readonly SnsFandomProviderQualification[] =
  Object.freeze([
    Object.freeze({
      providerId: 'youtube-data-api' as const,
      state: 'conditional-approval-required' as const,
      constructCoverage: Object.freeze([
        'public-reaction-diffusion' as const,
      ]),
      authorizedAcquisition: 'available-after-provider-approval' as const,
      commercialUse: 'conditional' as const,
      recurringAutomatedCollection: 'conditional' as const,
      storageRetention: 'restricted' as const,
      derivedMetricPublication: 'conditional' as const,
      identityCoverage: 'public-channel-id' as const,
      historicalAccess: 'prospective-snapshots-required' as const,
      blockers: Object.freeze([
        'youtube-analytics-derived-metrics-approval-not-recorded',
        'youtube-non-authorized-data-retention-requires-refresh-or-approved-extension',
      ]),
      evidenceUrls: Object.freeze([
        'https://developers.google.com/youtube/terms/developer-policies',
        'https://developers.google.com/youtube/terms/derived-metrics-policy',
        'https://developers.google.com/youtube/v3/docs/channels',
        'https://developers.google.com/youtube/v3/docs/comments',
      ]),
    }),
    Object.freeze({
      providerId: 'instagram-api' as const,
      state: 'authorized-account-only' as const,
      constructCoverage: Object.freeze([
        'public-reaction-diffusion' as const,
      ]),
      authorizedAcquisition: 'requires-artist-account-authorization' as const,
      commercialUse: 'conditional' as const,
      recurringAutomatedCollection: 'authorized-account-only' as const,
      storageRetention: 'unverified' as const,
      derivedMetricPublication: 'unverified' as const,
      identityCoverage: 'authorized-account-only' as const,
      historicalAccess: 'authorized-account-history' as const,
      blockers: Object.freeze([
        'instagram-arbitrary-kpop-artist-universe-coverage-not-established',
        'instagram-storage-and-derived-publication-rights-not-yet-qualified',
      ]),
      evidenceUrls: Object.freeze([
        'https://developers.facebook.com/documentation/instagram-platform',
      ]),
    }),
    Object.freeze({
      providerId: 'tiktok-display-api' as const,
      state: 'authorized-account-only' as const,
      constructCoverage: Object.freeze([
        'public-reaction-diffusion' as const,
      ]),
      authorizedAcquisition: 'requires-artist-account-authorization' as const,
      commercialUse: 'conditional' as const,
      recurringAutomatedCollection: 'authorized-account-only' as const,
      storageRetention: 'unverified' as const,
      derivedMetricPublication: 'unverified' as const,
      identityCoverage: 'authorized-account-only' as const,
      historicalAccess: 'authorized-account-history' as const,
      blockers: Object.freeze([
        'tiktok-display-api-requires-end-user-authorization',
        'tiktok-arbitrary-kpop-artist-universe-coverage-not-established',
      ]),
      evidenceUrls: Object.freeze([
        'https://developers.tiktok.com/docs/en/display-api-overview',
        'https://developers.tiktok.com/docs/en/display-api-get-started',
        'https://developers.tiktok.com/docs/en/scopes-overview',
      ]),
    }),
    Object.freeze({
      providerId: 'tiktok-research-api' as const,
      state: 'not-production-eligible' as const,
      constructCoverage: Object.freeze([
        'public-reaction-diffusion' as const,
        'fandom-activity-persistence' as const,
      ]),
      authorizedAcquisition: 'not-available-for-commercial-product' as const,
      commercialUse: 'not-eligible' as const,
      recurringAutomatedCollection: 'not-eligible' as const,
      storageRetention: 'restricted' as const,
      derivedMetricPublication: 'not-eligible' as const,
      identityCoverage: 'research-only' as const,
      historicalAccess: 'research-only' as const,
      blockers: Object.freeze([
        'tiktok-research-tools-require-non-commercial-research-eligibility',
      ]),
      evidenceUrls: Object.freeze([
        'https://developers.tiktok.com/products/research-api/',
        'https://developers.tiktok.com/docs/en/research-api-faq',
      ]),
    }),
    Object.freeze({
      providerId: 'x-api' as const,
      state: 'rights-unresolved' as const,
      constructCoverage: Object.freeze([
        'public-reaction-diffusion' as const,
        'fandom-activity-persistence' as const,
      ]),
      authorizedAcquisition: 'unverified' as const,
      commercialUse: 'unverified' as const,
      recurringAutomatedCollection: 'unverified' as const,
      storageRetention: 'unverified' as const,
      derivedMetricPublication: 'unverified' as const,
      identityCoverage: 'unverified' as const,
      historicalAccess: 'unverified' as const,
      blockers: Object.freeze([
        'x-current-commercial-data-license-and-retention-rights-not-recorded',
        'x-current-derived-metric-publication-rights-not-recorded',
      ]),
      evidenceUrls: Object.freeze([
        'https://developer.x.com/',
      ]),
    }),
  ]);

export type SnsFandomMissingState =
  | 'observed'
  | 'missing'
  | 'unsupported';

export type SnsFandomMetricRole =
  | 'construct-evidence'
  | 'context-only';

export type SnsFandomObservation = Readonly<{
  contractVersion: 'fandex-observation-v1';
  observationId: string;
  providerId: SnsFandomProviderId;
  entity: Readonly<{
    entityType: 'artist';
    canonicalArtistId: string;
    providerArtistId: string | null;
    providerContentId: string | null;
    identityState: 'bound' | 'unresolved';
  }>;
  variable: Readonly<{
    variableId: 'snsFandomPoint';
    metricFamily: 'sns-fandom';
    dimension: SnsFandomDimension;
    metricId: string;
    metricRole: SnsFandomMetricRole;
  }>;
  value: Readonly<{
    rawValue: number | null;
    unit: 'count' | null;
    missingState: SnsFandomMissingState;
  }>;
  time: Readonly<{
    providerPeriodStart: string | null;
    providerPeriodEnd: string | null;
    observedAt: string;
    collectedAt: string;
  }>;
  evidence: Readonly<{
    evidenceRef: string;
    revision: string | null;
  }>;
  lifecycle: Readonly<{
    state: 'research';
    materialClass: 'real';
    blockers: readonly string[];
  }>;
}>;

export type SnsFandomObservationValidation = Readonly<{
  ok: boolean;
  blockers: readonly string[];
}>;

function validIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

export function validateSnsFandomObservation(
  observation: SnsFandomObservation,
): SnsFandomObservationValidation {
  const blockers: string[] = [];

  if (observation.contractVersion !== 'fandex-observation-v1') {
    blockers.push('observation-contract-version-invalid');
  }
  if (observation.observationId.trim().length === 0) {
    blockers.push('observation-id-empty');
  }
  if (observation.entity.canonicalArtistId.trim().length === 0) {
    blockers.push('canonical-artist-id-empty');
  }
  if (
    observation.entity.identityState === 'bound'
    && !observation.entity.providerArtistId
  ) {
    blockers.push('bound-provider-artist-id-missing');
  }
  if (
    observation.entity.identityState === 'unresolved'
    && observation.value.missingState === 'observed'
  ) {
    blockers.push('unresolved-identity-cannot-be-observed');
  }

  const observed = observation.value.missingState === 'observed';
  if (observed) {
    if (
      observation.value.rawValue === null
      || !Number.isFinite(observation.value.rawValue)
      || observation.value.rawValue < 0
    ) {
      blockers.push('observed-raw-value-invalid');
    }
    if (observation.value.unit === null) {
      blockers.push('observed-unit-missing');
    }
  } else {
    if (observation.value.rawValue !== null) {
      blockers.push('non-observed-raw-value-must-be-null');
    }
    if (observation.value.unit !== null) {
      blockers.push('non-observed-unit-must-be-null');
    }
  }

  if (!validIso(observation.time.observedAt)) {
    blockers.push('observed-at-invalid');
  }
  if (!validIso(observation.time.collectedAt)) {
    blockers.push('collected-at-invalid');
  }
  if (
    validIso(observation.time.observedAt)
    && validIso(observation.time.collectedAt)
    && Date.parse(observation.time.collectedAt)
      < Date.parse(observation.time.observedAt)
  ) {
    blockers.push('collection-precedes-observation');
  }

  for (const value of [
    observation.time.providerPeriodStart,
    observation.time.providerPeriodEnd,
  ]) {
    if (value !== null && !validIso(value)) {
      blockers.push('provider-period-invalid');
      break;
    }
  }

  return Object.freeze({
    ok: blockers.length === 0,
    blockers: Object.freeze(blockers),
  });
}

export type SnsFandomPersistenceEvidence = Readonly<{
  contractVersion: 'sns-fandom-persistence-history-evidence-v1';
  canonicalArtistId: string;
  providerId: SnsFandomProviderId;
  providerArtistId: string | null;
  providerContentId: string | null;
  dimension: SnsFandomDimension;
  metricId: string;
  metricRole: SnsFandomMetricRole;
  state:
    | 'temporal-history-present'
    | 'history-insufficient'
    | 'missing'
    | 'unsupported';
  observationCount: number;
  distinctObservationTimeCount: number;
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  derivedNumericValue: null;
  inferenceOfFanIdentity: false;
}>;

export function buildSnsFandomPersistenceEvidence(
  observations: readonly SnsFandomObservation[],
): readonly SnsFandomPersistenceEvidence[] {
  const groups = new Map<string, SnsFandomObservation[]>();

  for (const observation of observations) {
    const validation = validateSnsFandomObservation(observation);
    if (!validation.ok) continue;

    const key = [
      observation.entity.canonicalArtistId,
      observation.providerId,
      observation.entity.providerArtistId ?? '',
      observation.entity.providerContentId ?? '',
      observation.variable.dimension,
      observation.variable.metricId,
      observation.variable.metricRole,
    ].join('|');

    const group = groups.get(key) ?? [];
    group.push(observation);
    groups.set(key, group);
  }

  const output: SnsFandomPersistenceEvidence[] = [];
  for (const group of groups.values()) {
    const first = group[0];
    const observed = group.filter(
      (item) => item.value.missingState === 'observed',
    );
    const distinctObservedAt = Array.from(
      new Set(observed.map((item) => item.time.observedAt)),
    ).sort();

    let state: SnsFandomPersistenceEvidence['state'];
    if (group.every((item) => item.value.missingState === 'unsupported')) {
      state = 'unsupported';
    } else if (observed.length === 0) {
      state = 'missing';
    } else if (distinctObservedAt.length < 2) {
      state = 'history-insufficient';
    } else {
      state = 'temporal-history-present';
    }

    output.push(Object.freeze({
      contractVersion: 'sns-fandom-persistence-history-evidence-v1',
      canonicalArtistId: first.entity.canonicalArtistId,
      providerId: first.providerId,
      providerArtistId: first.entity.providerArtistId,
      providerContentId: first.entity.providerContentId,
      dimension: first.variable.dimension,
      metricId: first.variable.metricId,
      metricRole: first.variable.metricRole,
      state,
      observationCount: observed.length,
      distinctObservationTimeCount: distinctObservedAt.length,
      firstObservedAt: distinctObservedAt[0] ?? null,
      lastObservedAt:
        distinctObservedAt[distinctObservedAt.length - 1] ?? null,
      derivedNumericValue: null,
      inferenceOfFanIdentity: false as const,
    }));
  }

  return Object.freeze(output);
}

export type SnsFandomPointReadinessResult = Readonly<{
  contractVersion: typeof SNS_FANDOM_POINT_CONTRACT_VERSION;
  state:
    | 'provider-rights-blocked'
    | 'source-evidence-incomplete'
    | 'dual-dimension-evidence-ready';
  snsFandomPoint: null;
  numericProductEligible: false;
  productActivationReady: false;
  productPublicationReady: false;
  previewFallbackAllowed: false;
  crossPlatformRawAverageAllowed: false;
  followerCountAloneAllowedAsFandom: false;
  mentionCountAloneAllowedAsSnsFandom: false;
  observedReactionEvidenceCount: number;
  temporalPersistenceEvidenceCount: number;
  productionReadyProviders: readonly SnsFandomProviderId[];
  blockers: readonly string[];
}>;

export function evaluateSnsFandomPointReadiness(
  input: Readonly<{
    canonicalArtistId: string;
    observations: readonly SnsFandomObservation[];
    providerQualifications?: readonly SnsFandomProviderQualification[];
  }>,
): SnsFandomPointReadinessResult {
  const qualifications =
    input.providerQualifications ?? SNS_FANDOM_PROVIDER_QUALIFICATIONS;
  const blockers: string[] = [];

  const productionReadyProviders = qualifications
    .filter((item) => item.state === 'production-ready')
    .map((item) => item.providerId);

  if (productionReadyProviders.length === 0) {
    blockers.push('no-qualified-production-provider');
  }

  const validObserved = input.observations.filter((observation) => (
    observation.entity.canonicalArtistId === input.canonicalArtistId
    && validateSnsFandomObservation(observation).ok
    && observation.value.missingState === 'observed'
    && observation.variable.metricRole === 'construct-evidence'
    && productionReadyProviders.includes(observation.providerId)
  ));

  const reactionEvidence = validObserved.filter(
    (observation) =>
      observation.variable.dimension === 'public-reaction-diffusion',
  );

  if (reactionEvidence.length === 0) {
    blockers.push('public-reaction-diffusion-evidence-missing');
  }

  const persistenceEvidence = buildSnsFandomPersistenceEvidence(
    validObserved,
  ).filter(
    (item) =>
      item.canonicalArtistId === input.canonicalArtistId
      && item.dimension === 'fandom-activity-persistence'
      && item.metricRole === 'construct-evidence'
      && item.state === 'temporal-history-present'
      && productionReadyProviders.includes(item.providerId),
  );

  if (persistenceEvidence.length === 0) {
    blockers.push('fandom-activity-persistence-history-missing');
  }

  const state =
    productionReadyProviders.length === 0
      ? 'provider-rights-blocked' as const
      : reactionEvidence.length === 0 || persistenceEvidence.length === 0
        ? 'source-evidence-incomplete' as const
        : 'dual-dimension-evidence-ready' as const;

  if (state === 'dual-dimension-evidence-ready') {
    blockers.push('cross-dimension-combination-methodology-not-approved');
  }

  return Object.freeze({
    contractVersion: SNS_FANDOM_POINT_CONTRACT_VERSION,
    state,
    snsFandomPoint: null,
    numericProductEligible: false as const,
    productActivationReady: false as const,
    productPublicationReady: false as const,
    previewFallbackAllowed: false as const,
    crossPlatformRawAverageAllowed: false as const,
    followerCountAloneAllowedAsFandom: false as const,
    mentionCountAloneAllowedAsSnsFandom: false as const,
    observedReactionEvidenceCount: reactionEvidence.length,
    temporalPersistenceEvidenceCount: persistenceEvidence.length,
    productionReadyProviders: Object.freeze(productionReadyProviders),
    blockers: Object.freeze(blockers),
  });
}
