export const SNS_FANDOM_POINT_CONTRACT_VERSION =
  'sns-fandom-point-production-contract-v1' as const;

export type SnsFandomDimension =
  | 'public-reaction-diffusion'
  | 'fandom-activity-persistence';

export type SnsFandomProviderId =
  | 'youtube-data-api'
  | 'youtube-comments-derived'
  | 'youtube-analytics-api'
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
    | 'bounded-public-comment-history'
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
      providerId: 'youtube-comments-derived' as const,
      state: 'conditional-approval-required' as const,
      constructCoverage: Object.freeze([
        'fandom-activity-persistence' as const,
      ]),
      authorizedAcquisition: 'available-after-provider-approval' as const,
      commercialUse: 'conditional' as const,
      recurringAutomatedCollection: 'conditional' as const,
      storageRetention: 'conditional' as const,
      derivedMetricPublication: 'conditional' as const,
      identityCoverage: 'public-channel-id' as const,
      historicalAccess: 'bounded-public-comment-history' as const,
      blockers: Object.freeze([
        'youtube-commenter-recurrence-derived-metric-use-case-not-approved',
        'youtube-comment-raw-identifiers-must-not-be-retained-by-this-adapter',
        'youtube-comment-history-completeness-not-guaranteed',
      ]),
      evidenceUrls: Object.freeze([
        'https://developers.google.com/youtube/v3/docs/comments',
        'https://developers.google.com/youtube/v3/docs/commentThreads',
        'https://developers.google.com/youtube/terms/developer-policies',
        'https://developers.google.com/youtube/terms/derived-metrics-policy',
      ]),
    }),
    Object.freeze({
      providerId: 'youtube-analytics-api' as const,
      state: 'authorized-account-only' as const,
      constructCoverage: Object.freeze([
        'fandom-activity-persistence' as const,
      ]),
      authorizedAcquisition: 'requires-artist-account-authorization' as const,
      commercialUse: 'conditional' as const,
      recurringAutomatedCollection: 'authorized-account-only' as const,
      storageRetention: 'conditional' as const,
      derivedMetricPublication: 'conditional' as const,
      identityCoverage: 'authorized-account-only' as const,
      historicalAccess: 'authorized-account-history' as const,
      blockers: Object.freeze([
        'youtube-analytics-channel-owner-authorization-required',
        'youtube-analytics-generic-kpop-coverage-not-established',
      ]),
      evidenceUrls: Object.freeze([
        'https://developers.google.com/youtube/analytics/channel_reports',
        'https://developers.google.com/youtube/reporting',
        'https://developers.google.com/youtube/reporting/v1/reports/channel_reports',
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

export const SNS_FANDOM_ARTIST_PROVIDER_ENTITLEMENT_VERSION =
  'sns-fandom-artist-provider-entitlement-v1' as const;

export type SnsFandomArtistProviderEntitlement = Readonly<{
  contractVersion: typeof SNS_FANDOM_ARTIST_PROVIDER_ENTITLEMENT_VERSION;
  canonicalArtistId: string;
  providerId: SnsFandomProviderId;
  providerClientRef: string;
  providerArtistId: string;
  authorizationClass:
    | 'channel-owner-oauth'
    | 'content-owner-oauth'
    | 'provider-account-oauth';
  state: 'active' | 'pending' | 'expired' | 'revoked';
  allowedDimensions: readonly SnsFandomDimension[];
  authorizedScopes: readonly string[];
  verifiedAt: string;
  validFrom: string;
  validUntil: string | null;
  evidenceRef: string;
  rights: Readonly<{
    commercialProductUse: boolean;
    recurringAutomatedCollection: boolean;
    storageRetention: boolean;
    derivedMetricPublication: boolean;
  }>;
}>;

export type SnsFandomArtistProviderEntitlementValidation = Readonly<{
  ok: boolean;
  blockers: readonly string[];
}>;

export const SNS_FANDOM_PROVIDER_APPROVAL_EVIDENCE_VERSION =
  'sns-fandom-provider-approval-evidence-v1' as const;

export type SnsFandomProviderApprovalEvidence = Readonly<{
  contractVersion: typeof SNS_FANDOM_PROVIDER_APPROVAL_EVIDENCE_VERSION;
  providerId: SnsFandomProviderId;
  providerClientRef: string;
  state: 'approved' | 'pending' | 'expired' | 'revoked';
  approvalClass:
    | 'youtube-analytics-derived-metrics-data-storage'
    | 'provider-commercial-data-license';
  useCase: 'analytics-reporting';
  approvedDimensions: readonly SnsFandomDimension[];
  approvedMetricIds: readonly string[];
  allowedEndpoints: readonly string[];
  approvedAt: string;
  validUntil: string | null;
  evidenceRef: string;
  rights: Readonly<{
    commercialProductUse: boolean;
    recurringAutomatedCollection: boolean;
    aggregateRetention: boolean;
    derivedMetricPublication: boolean;
  }>;
  retention: Readonly<{
    statisticalDataMonths: number | null;
    derivedMetricMonths: number | null;
    nonStatisticalDataRefreshDays: number | null;
  }>;
  youtubePolicyGrant: Readonly<{
    complianceAuditPassed: boolean;
    analyticsReportingUseCaseAccepted: boolean;
    developerPoliciesAmendmentAccepted: boolean;
    additionalDerivedMetricsApproved: boolean;
    extendedStatisticalStorageApproved: boolean;
  }> | null;
}>;

export type SnsFandomProviderApprovalEvidenceValidation = Readonly<{
  ok: boolean;
  blockers: readonly string[];
}>;

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
    providerClientRef: string;
    providerEndpoints: readonly string[];
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

export function validateSnsFandomProviderApprovalEvidence(
  approval: SnsFandomProviderApprovalEvidence,
  evaluatedAt: string,
): SnsFandomProviderApprovalEvidenceValidation {
  const blockers: string[] = [];

  if (
    approval.contractVersion
      !== SNS_FANDOM_PROVIDER_APPROVAL_EVIDENCE_VERSION
  ) {
    blockers.push('provider-approval-version-invalid');
  }
  if (approval.providerClientRef.trim().length === 0) {
    blockers.push('provider-approval-client-ref-empty');
  }
  if (approval.approvedDimensions.length === 0) {
    blockers.push('provider-approval-dimensions-empty');
  }
  if (approval.approvedMetricIds.length === 0) {
    blockers.push('provider-approval-metrics-empty');
  }
  if (approval.allowedEndpoints.length === 0) {
    blockers.push('provider-approval-endpoints-empty');
  }
  if (approval.evidenceRef.trim().length === 0) {
    blockers.push('provider-approval-evidence-empty');
  }

  for (const value of [
    approval.approvedAt,
    evaluatedAt,
    ...(approval.validUntil === null ? [] : [approval.validUntil]),
  ]) {
    if (!validIso(value)) {
      blockers.push('provider-approval-time-invalid');
      break;
    }
  }

  if (
    approval.validUntil !== null
    && validIso(approval.approvedAt)
    && validIso(approval.validUntil)
    && Date.parse(approval.approvedAt) > Date.parse(approval.validUntil)
  ) {
    blockers.push('provider-approval-validity-order-invalid');
  }

  if (
    approval.state === 'approved'
    && validIso(evaluatedAt)
    && validIso(approval.approvedAt)
    && Date.parse(evaluatedAt) < Date.parse(approval.approvedAt)
  ) {
    blockers.push('provider-approval-not-yet-valid');
  }

  if (
    approval.state === 'approved'
    && approval.validUntil !== null
    && validIso(evaluatedAt)
    && validIso(approval.validUntil)
    && Date.parse(evaluatedAt) > Date.parse(approval.validUntil)
  ) {
    blockers.push('provider-approval-expired-by-time');
  }

  if (
    approval.state === 'approved'
    && (
      !approval.rights.commercialProductUse
      || !approval.rights.recurringAutomatedCollection
      || !approval.rights.aggregateRetention
      || !approval.rights.derivedMetricPublication
    )
  ) {
    blockers.push('provider-approval-rights-incomplete');
  }

  if (
    approval.approvalClass
      === 'youtube-analytics-derived-metrics-data-storage'
  ) {
    const grant = approval.youtubePolicyGrant;
    if (grant === null) {
      blockers.push('youtube-provider-policy-grant-missing');
    } else {
      if (!grant.complianceAuditPassed) {
        blockers.push('youtube-provider-compliance-audit-not-passed');
      }
      if (!grant.analyticsReportingUseCaseAccepted) {
        blockers.push(
          'youtube-provider-analytics-reporting-use-case-not-accepted',
        );
      }
      if (!grant.developerPoliciesAmendmentAccepted) {
        blockers.push(
          'youtube-provider-derived-metrics-amendment-not-accepted',
        );
      }
      if (!grant.additionalDerivedMetricsApproved) {
        blockers.push(
          'youtube-provider-additional-derived-metrics-not-approved',
        );
      }
      if (!grant.extendedStatisticalStorageApproved) {
        blockers.push(
          'youtube-provider-extended-statistical-storage-not-approved',
        );
      }
    }
    if (!(
      approval.providerId === 'youtube-data-api'
      || approval.providerId === 'youtube-comments-derived'
    )) {
      blockers.push('youtube-provider-approval-provider-invalid');
    }
    if (
      approval.retention.statisticalDataMonths !== null
      && (
        !Number.isInteger(approval.retention.statisticalDataMonths)
        || approval.retention.statisticalDataMonths < 0
        || approval.retention.statisticalDataMonths > 36
      )
    ) {
      blockers.push('youtube-provider-approval-statistical-retention-invalid');
    }
    if (
      approval.retention.derivedMetricMonths !== null
      && (
        !Number.isInteger(approval.retention.derivedMetricMonths)
        || approval.retention.derivedMetricMonths < 0
        || approval.retention.derivedMetricMonths > 36
      )
    ) {
      blockers.push('youtube-provider-approval-derived-retention-invalid');
    }
    if (
      approval.retention.nonStatisticalDataRefreshDays !== null
      && (
        !Number.isInteger(
          approval.retention.nonStatisticalDataRefreshDays,
        )
        || approval.retention.nonStatisticalDataRefreshDays < 0
        || approval.retention.nonStatisticalDataRefreshDays > 30
      )
    ) {
      blockers.push(
        'youtube-provider-approval-non-statistical-refresh-invalid',
      );
    }
  }

  if (
    approval.approvalClass !== 'youtube-analytics-derived-metrics-data-storage'
    && approval.youtubePolicyGrant !== null
  ) {
    blockers.push('provider-approval-youtube-policy-grant-unexpected');
  }

  return Object.freeze({
    ok: blockers.length === 0,
    blockers: Object.freeze(blockers),
  });
}

export function isSnsFandomProviderApprovalActiveFor(
  approval: SnsFandomProviderApprovalEvidence,
  input: Readonly<{
    providerId: SnsFandomProviderId;
    providerClientRef: string;
    providerEndpoints: readonly string[];
    dimension: SnsFandomDimension;
    metricId: string;
    evaluatedAt: string;
  }>,
): boolean {
  return (
    validateSnsFandomProviderApprovalEvidence(
      approval,
      input.evaluatedAt,
    ).ok
    && approval.state === 'approved'
    && approval.providerId === input.providerId
    && approval.providerClientRef === input.providerClientRef
    && input.providerEndpoints.length > 0
    && input.providerEndpoints.every((endpoint) =>
      approval.allowedEndpoints.includes(endpoint)
    )
    && approval.approvedDimensions.includes(input.dimension)
    && approval.approvedMetricIds.includes(input.metricId)
  );
}

export function validateSnsFandomArtistProviderEntitlement(
  entitlement: SnsFandomArtistProviderEntitlement,
  evaluatedAt: string,
): SnsFandomArtistProviderEntitlementValidation {
  const blockers: string[] = [];

  if (
    entitlement.contractVersion
      !== SNS_FANDOM_ARTIST_PROVIDER_ENTITLEMENT_VERSION
  ) {
    blockers.push('artist-provider-entitlement-version-invalid');
  }
  if (entitlement.providerClientRef.trim().length === 0) {
    blockers.push('artist-provider-entitlement-client-ref-empty');
  }
  if (entitlement.canonicalArtistId.trim().length === 0) {
    blockers.push('artist-provider-entitlement-canonical-id-empty');
  }
  if (entitlement.providerArtistId.trim().length === 0) {
    blockers.push('artist-provider-entitlement-provider-id-empty');
  }
  if (entitlement.allowedDimensions.length === 0) {
    blockers.push('artist-provider-entitlement-dimensions-empty');
  }
  if (entitlement.authorizedScopes.length === 0) {
    blockers.push('artist-provider-entitlement-scopes-empty');
  }
  if (entitlement.evidenceRef.trim().length === 0) {
    blockers.push('artist-provider-entitlement-evidence-empty');
  }

  for (const value of [
    entitlement.verifiedAt,
    entitlement.validFrom,
    evaluatedAt,
    ...(entitlement.validUntil === null ? [] : [entitlement.validUntil]),
  ]) {
    if (!validIso(value)) {
      blockers.push('artist-provider-entitlement-time-invalid');
      break;
    }
  }

  if (
    validIso(entitlement.verifiedAt)
    && validIso(entitlement.validFrom)
    && Date.parse(entitlement.verifiedAt) < Date.parse(entitlement.validFrom)
  ) {
    blockers.push('artist-provider-entitlement-verified-before-valid-from');
  }

  if (
    entitlement.validUntil !== null
    && validIso(entitlement.validFrom)
    && validIso(entitlement.validUntil)
    && Date.parse(entitlement.validFrom) > Date.parse(entitlement.validUntil)
  ) {
    blockers.push('artist-provider-entitlement-validity-order-invalid');
  }

  if (
    entitlement.state === 'active'
    && validIso(evaluatedAt)
    && validIso(entitlement.validFrom)
    && Date.parse(evaluatedAt) < Date.parse(entitlement.validFrom)
  ) {
    blockers.push('artist-provider-entitlement-not-yet-valid');
  }

  if (
    entitlement.state === 'active'
    && entitlement.validUntil !== null
    && validIso(evaluatedAt)
    && validIso(entitlement.validUntil)
    && Date.parse(evaluatedAt) > Date.parse(entitlement.validUntil)
  ) {
    blockers.push('artist-provider-entitlement-expired-by-time');
  }

  if (
    entitlement.state === 'active'
    && (
      !entitlement.rights.commercialProductUse
      || !entitlement.rights.recurringAutomatedCollection
      || !entitlement.rights.storageRetention
      || !entitlement.rights.derivedMetricPublication
    )
  ) {
    blockers.push('artist-provider-entitlement-rights-incomplete');
  }

  return Object.freeze({
    ok: blockers.length === 0,
    blockers: Object.freeze(blockers),
  });
}

export function isSnsFandomArtistEntitlementActiveFor(
  entitlement: SnsFandomArtistProviderEntitlement,
  input: Readonly<{
    canonicalArtistId: string;
    providerId: SnsFandomProviderId;
    providerClientRef: string;
    providerArtistId: string;
    dimension: SnsFandomDimension;
    evaluatedAt: string;
  }>,
): boolean {
  return (
    validateSnsFandomArtistProviderEntitlement(
      entitlement,
      input.evaluatedAt,
    ).ok
    && entitlement.state === 'active'
    && entitlement.canonicalArtistId === input.canonicalArtistId
    && entitlement.providerId === input.providerId
    && entitlement.providerClientRef === input.providerClientRef
    && entitlement.providerArtistId === input.providerArtistId
    && entitlement.allowedDimensions.includes(input.dimension)
  );
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
  if (observation.evidence.providerClientRef.trim().length === 0) {
    blockers.push('provider-client-ref-empty');
  }
  if (
    observation.evidence.providerEndpoints.length === 0
    || observation.evidence.providerEndpoints.some(
      (endpoint) => endpoint.trim().length === 0,
    )
  ) {
    blockers.push('provider-endpoints-invalid');
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

  const periodStart = observation.time.providerPeriodStart;
  const periodEnd = observation.time.providerPeriodEnd;
  if ((periodStart === null) !== (periodEnd === null)) {
    blockers.push('provider-period-pair-incomplete');
  }
  if (
    periodStart !== null
    && periodEnd !== null
    && validIso(periodStart)
    && validIso(periodEnd)
    && Date.parse(periodStart) > Date.parse(periodEnd)
  ) {
    blockers.push('provider-period-order-invalid');
  }
  if (
    periodEnd !== null
    && validIso(periodEnd)
    && validIso(observation.time.observedAt)
    && Date.parse(observation.time.observedAt) < Date.parse(periodEnd)
  ) {
    blockers.push('observation-precedes-provider-period-end');
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
    | 'time-semantics-conflict'
    | 'missing'
    | 'unsupported';
  temporalBasis:
    | 'provider-period'
    | 'observation-time'
    | 'mixed'
    | 'none';
  observationCount: number;
  distinctObservationTimeCount: number;
  distinctProviderPeriodCount: number;
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

    const periodBacked = observed.filter(
      (item) =>
        item.time.providerPeriodStart !== null
        && item.time.providerPeriodEnd !== null,
    );
    const pointInTime = observed.filter(
      (item) =>
        item.time.providerPeriodStart === null
        && item.time.providerPeriodEnd === null,
    );
    const distinctProviderPeriods = Array.from(
      new Set(periodBacked.map((item) => [
        item.time.providerPeriodStart,
        item.time.providerPeriodEnd,
      ].join('|'))),
    ).sort();

    let temporalBasis: SnsFandomPersistenceEvidence['temporalBasis'];
    let state: SnsFandomPersistenceEvidence['state'];
    if (group.every((item) => item.value.missingState === 'unsupported')) {
      temporalBasis = 'none';
      state = 'unsupported';
    } else if (observed.length === 0) {
      temporalBasis = 'none';
      state = 'missing';
    } else if (periodBacked.length === observed.length) {
      temporalBasis = 'provider-period';
      state = distinctProviderPeriods.length < 2
        ? 'history-insufficient'
        : 'temporal-history-present';
    } else if (pointInTime.length === observed.length) {
      temporalBasis = 'observation-time';
      state = distinctObservedAt.length < 2
        ? 'history-insufficient'
        : 'temporal-history-present';
    } else {
      temporalBasis = 'mixed';
      state = 'time-semantics-conflict';
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
      temporalBasis,
      observationCount: observed.length,
      distinctObservationTimeCount: distinctObservedAt.length,
      distinctProviderPeriodCount: distinctProviderPeriods.length,
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
  contentLevelReactionEvidenceCount: number;
  temporalPersistenceEvidenceCount: number;
  productionReadyProviders: readonly SnsFandomProviderId[];
  providerApprovedProviders: readonly SnsFandomProviderId[];
  artistAuthorizedProviders: readonly SnsFandomProviderId[];
  evidenceEligibleProviders: readonly SnsFandomProviderId[];
  blockers: readonly string[];
}>;

export function evaluateSnsFandomPointReadiness(
  input: Readonly<{
    canonicalArtistId: string;
    observations: readonly SnsFandomObservation[];
    providerQualifications?: readonly SnsFandomProviderQualification[];
    providerApprovals?: readonly SnsFandomProviderApprovalEvidence[];
    artistEntitlements?: readonly SnsFandomArtistProviderEntitlement[];
    evaluatedAt?: string;
  }>,
): SnsFandomPointReadinessResult {
  const qualifications =
    input.providerQualifications ?? SNS_FANDOM_PROVIDER_QUALIFICATIONS;
  const blockers: string[] = [];

  const productionReadyProviders = qualifications
    .filter((item) => item.state === 'production-ready')
    .map((item) => item.providerId);

  const providerApprovals = input.providerApprovals ?? [];
  const artistEntitlements = input.artistEntitlements ?? [];
  const evaluatedAt = input.evaluatedAt ?? null;

  const providerApprovedProviders = qualifications
    .filter((qualification) => (
      qualification.state === 'conditional-approval-required'
      && evaluatedAt !== null
      && providerApprovals.some((approval) => (
        approval.providerId === qualification.providerId
        && approval.approvedDimensions.some((dimension) =>
          qualification.constructCoverage.includes(dimension)
        )
        && validateSnsFandomProviderApprovalEvidence(
          approval,
          evaluatedAt,
        ).ok
        && approval.state === 'approved'
      ))
    ))
    .map((item) => item.providerId);

  const artistAuthorizedProviders = qualifications
    .filter((qualification) => (
      qualification.state === 'authorized-account-only'
      && evaluatedAt !== null
      && artistEntitlements.some((entitlement) => (
        entitlement.providerId === qualification.providerId
        && entitlement.canonicalArtistId === input.canonicalArtistId
        && entitlement.allowedDimensions.some((dimension) =>
          qualification.constructCoverage.includes(dimension)
        )
        && validateSnsFandomArtistProviderEntitlement(
          entitlement,
          evaluatedAt,
        ).ok
        && entitlement.state === 'active'
      ))
    ))
    .map((item) => item.providerId);

  const evidenceEligibleProviders = Array.from(
    new Set([
      ...productionReadyProviders,
      ...providerApprovedProviders,
      ...artistAuthorizedProviders,
    ]),
  );

  const isObservationProviderEligible = (
    observation: SnsFandomObservation,
  ): boolean => qualifications.some((qualification) => {
    if (
      qualification.providerId !== observation.providerId
      || !qualification.constructCoverage.includes(
        observation.variable.dimension,
      )
    ) {
      return false;
    }

    if (qualification.state === 'production-ready') {
      return true;
    }

    if (
      qualification.state === 'conditional-approval-required'
      && evaluatedAt !== null
    ) {
      return providerApprovals.some((approval) =>
        isSnsFandomProviderApprovalActiveFor(approval, {
          providerId: observation.providerId,
          providerClientRef: observation.evidence.providerClientRef,
          providerEndpoints: observation.evidence.providerEndpoints,
          dimension: observation.variable.dimension,
          metricId: observation.variable.metricId,
          evaluatedAt,
        })
      );
    }

    if (
      qualification.state !== 'authorized-account-only'
      || evaluatedAt === null
      || observation.entity.providerArtistId === null
    ) {
      return false;
    }

    return artistEntitlements.some((entitlement) =>
      isSnsFandomArtistEntitlementActiveFor(entitlement, {
        canonicalArtistId: input.canonicalArtistId,
        providerId: observation.providerId,
        providerClientRef: observation.evidence.providerClientRef,
        providerArtistId: observation.entity.providerArtistId!,
        dimension: observation.variable.dimension,
        evaluatedAt,
      })
    );
  });

  const validObserved = input.observations.filter((observation) => (
    observation.entity.canonicalArtistId === input.canonicalArtistId
    && validateSnsFandomObservation(observation).ok
    && observation.value.missingState === 'observed'
    && observation.variable.metricRole === 'construct-evidence'
    && isObservationProviderEligible(observation)
  ));

  const contentLevelReactionEvidence = validObserved.filter(
    (observation) =>
      observation.variable.dimension === 'public-reaction-diffusion'
      && observation.entity.providerContentId !== null,
  );

  const reactionEvidence = validObserved.filter(
    (observation) =>
      observation.variable.dimension === 'public-reaction-diffusion'
      && observation.entity.providerContentId === null,
  );

  if (reactionEvidence.length === 0) {
    blockers.push('public-reaction-diffusion-evidence-missing');
    if (contentLevelReactionEvidence.length > 0) {
      blockers.push(
        'public-reaction-artist-level-aggregation-missing',
      );
    }
  }

  const persistenceEvidence = buildSnsFandomPersistenceEvidence(
    validObserved,
  ).filter(
    (item) =>
      item.canonicalArtistId === input.canonicalArtistId
      && item.dimension === 'fandom-activity-persistence'
      && item.metricRole === 'construct-evidence'
      && item.state === 'temporal-history-present'
      && evidenceEligibleProviders.includes(item.providerId),
  );

  if (persistenceEvidence.length === 0) {
    blockers.push('fandom-activity-persistence-history-missing');
  }

  const reactionProviderAvailable = qualifications.some(
    (qualification) => (
      qualification.constructCoverage.includes('public-reaction-diffusion')
      && (
        qualification.state === 'production-ready'
        || providerApprovedProviders.includes(qualification.providerId)
        || artistAuthorizedProviders.includes(qualification.providerId)
      )
    ),
  );
  const persistenceProviderAvailable = qualifications.some(
    (qualification) => (
      qualification.constructCoverage.includes('fandom-activity-persistence')
      && (
        qualification.state === 'production-ready'
        || providerApprovedProviders.includes(qualification.providerId)
        || artistAuthorizedProviders.includes(qualification.providerId)
      )
    ),
  );

  if (!reactionProviderAvailable) {
    blockers.push('public-reaction-diffusion-provider-rights-blocked');
  }
  if (!persistenceProviderAvailable) {
    blockers.push('fandom-activity-persistence-provider-rights-blocked');
  }

  const state =
    !reactionProviderAvailable || !persistenceProviderAvailable
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
    contentLevelReactionEvidenceCount:
      contentLevelReactionEvidence.length,
    temporalPersistenceEvidenceCount: persistenceEvidence.length,
    productionReadyProviders: Object.freeze(productionReadyProviders),
    providerApprovedProviders: Object.freeze(providerApprovedProviders),
    artistAuthorizedProviders: Object.freeze(artistAuthorizedProviders),
    evidenceEligibleProviders: Object.freeze(evidenceEligibleProviders),
    blockers: Object.freeze(blockers),
  });
}
