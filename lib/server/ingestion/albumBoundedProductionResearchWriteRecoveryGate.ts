import { canonicalJson, isSha256, sha256Canonical } from '../../shared/canonicalDigest';

export const ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_RECOVERY_GATE_VERSION =
  'album-bounded-production-research-write-recovery-gate-v1' as const;

export const ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_RECOVERY_COHORT = Object.freeze({
  supersedesGateVersion: 'album-bounded-production-research-write-gate-v1',
  sourceWorkflowRunId: 33458837843,
  reacquisitionAttemptRunId: 33824680792,
  acquisitionProviderId: 'circle-retail',
  providerId: 'circle-chart',
  providerPeriod: 'day:20260831',
  sourcePayloadDigest: 'd21ba4cb22b58ee014b1cdfc1f899f9860408b927c21ef387b0ba473de5f2236',
  maxProviderRequestsPerAuthorization: 1,
  maxDatabaseWrites: 3,
  legacyObservationIdsStatus: 'invalid-time-dependent' as const,
  observations: Object.freeze([
    Object.freeze({
      providerSkuId: '8809954226502',
      fandexArtistId: 'straykids',
      fandexReleaseId: 'straykids-this-and-that',
    }),
    Object.freeze({
      providerSkuId: '8809704435567',
      fandexArtistId: 'enhypen',
      fandexReleaseId: 'enhypen-the-sin-bliss',
    }),
    Object.freeze({
      providerSkuId: '8800370675042',
      fandexArtistId: 'katseye',
      fandexReleaseId: 'katseye-wild',
    }),
  ]),
});

export type AlbumProductionWriteRecoveryObservation = Readonly<{
  observationId: string;
  providerId: string;
  providerSkuId: string | null;
  fandexArtistId: string | null;
  fandexReleaseId: string | null;
  providerPeriod: string | null;
  semantic: string;
  unit: string;
  syntheticFixture: boolean;
  valueIsNonNegativeSafeInteger: boolean;
}>;

export type AlbumProductionWriteRecoveryReacquisition = Readonly<{
  sourcePayloadDigest: string;
  status: string;
  acceptedObservationCount: number;
  identityPendingRowCount: number;
  nonIdentityRejectedRowCount: number;
  observations: readonly AlbumProductionWriteRecoveryObservation[];
}>;

export type AlbumProductionWriteRecoveryReacquisitionResult = Readonly<{
  contractVersion: typeof ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_RECOVERY_GATE_VERSION;
  valid: boolean;
  issues: readonly string[];
  stableObservationIds: readonly string[];
  sourcePayloadDigest: string;
  reacquisitionDigest: string;
  databaseWriteAuthorized: false;
  publicationAuthorized: false;
  commercialRightsCleared: false;
}>;

function tupleKey(input: Readonly<{
  providerSkuId: string | null;
  fandexArtistId: string | null;
  fandexReleaseId: string | null;
}>): string {
  return [input.providerSkuId ?? '', input.fandexArtistId ?? '', input.fandexReleaseId ?? ''].join('|');
}

function expectedTupleKeys(): readonly string[] {
  return Object.freeze(ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_RECOVERY_COHORT.observations
    .map(tupleKey)
    .sort());
}

export function validateAlbumBoundedProductionResearchWriteRecoveryReacquisition(
  input: AlbumProductionWriteRecoveryReacquisition,
): AlbumProductionWriteRecoveryReacquisitionResult {
  const issues: string[] = [];
  if (input.sourcePayloadDigest !== ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_RECOVERY_COHORT.sourcePayloadDigest) {
    issues.push('source-payload-digest-mismatch');
  }
  if (input.status !== 'accepted-reviewed-subset') issues.push('reviewed-subset-status-invalid');
  if (input.acceptedObservationCount !== 3 || input.observations.length !== 3) {
    issues.push('reviewed-observation-count-mismatch');
  }
  if (input.identityPendingRowCount !== 47) issues.push('identity-pending-count-mismatch');
  if (input.nonIdentityRejectedRowCount !== 0) issues.push('provider-data-rejection-present');

  const ids = input.observations.map(observation => observation.observationId);
  if (ids.some(id => !isSha256(id)) || new Set(ids).size !== ids.length) {
    issues.push('stable-observation-id-set-invalid');
  }

  const actualTupleKeys = input.observations.map(tupleKey).sort();
  if (canonicalJson(actualTupleKeys) !== canonicalJson(expectedTupleKeys())) {
    issues.push('reviewed-provider-tuple-set-mismatch');
  }

  for (const observation of input.observations) {
    if (observation.providerId !== ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_RECOVERY_COHORT.providerId) {
      issues.push('provider-mismatch');
    }
    if (observation.providerPeriod !== ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_RECOVERY_COHORT.providerPeriod) {
      issues.push('provider-period-mismatch');
    }
    if (observation.semantic !== 'period-sale' || observation.unit !== 'physical-units') {
      issues.push('semantic-unit-mismatch');
    }
    if (observation.syntheticFixture) issues.push('synthetic-observation-not-allowed');
    if (!observation.valueIsNonNegativeSafeInteger) issues.push('quantity-invalid');
  }

  const stableObservationIds = Object.freeze([...ids].sort());
  const stableIssues = Object.freeze([...new Set(issues)].sort());
  const digestPayload = Object.freeze({
    contractVersion: ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_RECOVERY_GATE_VERSION,
    sourcePayloadDigest: input.sourcePayloadDigest,
    status: input.status,
    acceptedObservationCount: input.acceptedObservationCount,
    identityPendingRowCount: input.identityPendingRowCount,
    nonIdentityRejectedRowCount: input.nonIdentityRejectedRowCount,
    stableObservationIds,
    providerTuples: actualTupleKeys,
    issues: stableIssues,
  });

  return Object.freeze({
    contractVersion: ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_RECOVERY_GATE_VERSION,
    valid: stableIssues.length === 0,
    issues: stableIssues,
    stableObservationIds,
    sourcePayloadDigest: input.sourcePayloadDigest,
    reacquisitionDigest: sha256Canonical(digestPayload),
    databaseWriteAuthorized: false,
    publicationAuthorized: false,
    commercialRightsCleared: false,
  });
}

export const ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_RECOVERY_POLICY = Object.freeze({
  priorAuthorizationProviderRequestConsumed: true,
  additionalProviderRequestAuthorized: false,
  runtimeCredentialRequired: 'FANDEX_RUNTIME_DATABASE_URL',
  requiredDatabaseRole: 'fandex_runtime',
  requiredConnectionMode: 'unpooled',
  ownerSessionWriteAllowed: false,
  migratorSessionWriteAllowed: false,
  maxAdditionalWritesAfterReauthorization: 3,
  rawBodyStorageAuthorized: false,
  schedulerActivationAuthorized: false,
  hanteoWriteAuthorized: false,
  publicationAuthorized: false,
  commercialRightsCleared: false,
});
