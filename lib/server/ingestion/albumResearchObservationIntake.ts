import { sha256Canonical } from '../../shared/canonicalDigest';
import type { DirectAlbumObservation } from '../../alternative-evidence/directAlbumProvider';
import {
  defaultAuthorizationSnapshot,
  envelopeRecord,
  planPersistenceAppend,
  type AuthorizationSnapshot,
  type PersistenceAppendPlan,
  type PersistenceRecord,
  type PersistenceRecordEnvelope,
} from '../../alternative-evidence/persistenceContracts';

export const ALBUM_RESEARCH_OBSERVATION_INTAKE_VERSION =
  'album-research-observation-intake-v1' as const;
export const ALBUM_RESEARCH_OBSERVATION_GRANT_VERSION =
  'album-research-observation-intake-grant-v1' as const;
export const ALBUM_RESEARCH_OBSERVATION_RECORD_TYPE =
  'AlbumDirectObservationResearchRecord' as const;
export const ALBUM_RESEARCH_OBSERVATION_RECORD_VERSION =
  'album-direct-observation-research-v1' as const;

export type AlbumResearchObservationProviderId = 'circle-chart' | 'hanteo-chart';

export type AlbumResearchObservationIntakeGrant = Readonly<{
  grantVersion: typeof ALBUM_RESEARCH_OBSERVATION_GRANT_VERSION;
  scope: 'research';
  observationIds: readonly string[];
  providerIds: readonly AlbumResearchObservationProviderId[];
  authorizationEvidenceIds: readonly string[];
  technicalResearchStorageAuthorized: true;
  rawBodyStorageAuthorized: false;
  databaseWriteExecutionAuthorized: false;
  publicationAuthorized: false;
  commercialUseAuthorized: false;
  rightsCleared: false;
  grantDigest: string;
}>;

export type AlbumResearchObservationRecord = PersistenceRecordEnvelope<DirectAlbumObservation>;

export type AlbumResearchObservationIntakeStatus = 'planned' | 'blocked' | 'invalid';

export type AlbumResearchObservationIntakeResult = Readonly<{
  contractVersion: typeof ALBUM_RESEARCH_OBSERVATION_INTAKE_VERSION;
  status: AlbumResearchObservationIntakeStatus;
  reasons: readonly string[];
  grantDigest: string | null;
  candidateObservationCount: number;
  candidateRecordCount: number;
  providerRecordCounts: Readonly<Record<AlbumResearchObservationProviderId, number>>;
  records: readonly AlbumResearchObservationRecord[];
  persistencePlan: PersistenceAppendPlan | null;
  executionAuthorized: false;
  effects: Readonly<{
    databaseReads: 0;
    databaseWrites: 0;
    externalCalls: 0;
    scheduleMutations: 0;
    environmentMutations: 0;
  }>;
  resultDigest: string;
}>;

const SUPPORTED_PROVIDERS = new Set<AlbumResearchObservationProviderId>([
  'circle-chart',
  'hanteo-chart',
]);

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

function isHexDigest(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

function isIsoInstant(value: string | null): boolean {
  return value !== null && Number.isFinite(Date.parse(value));
}

function providerId(value: string): AlbumResearchObservationProviderId | null {
  return SUPPORTED_PROVIDERS.has(value as AlbumResearchObservationProviderId)
    ? value as AlbumResearchObservationProviderId
    : null;
}

function requireNonBlank(value: string | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateObservation(observation: DirectAlbumObservation): readonly string[] {
  const reasons: string[] = [];
  if (!providerId(observation.providerId)) reasons.push('provider-not-supported');
  if (!isHexDigest(observation.observationId)) reasons.push('observation-id-invalid');
  if (!isHexDigest(observation.evidenceDigest)) reasons.push('evidence-digest-invalid');
  if (observation.syntheticFixture) reasons.push('synthetic-observation-not-eligible');
  if (observation.semantic !== 'period-sale') reasons.push('semantic-not-period-sale');
  if (observation.unit !== 'physical-units') reasons.push('unit-not-physical-units');
  if (!Number.isSafeInteger(observation.value) || observation.value === null || observation.value < 0) {
    reasons.push('quantity-invalid');
  }
  if (!requireNonBlank(observation.fandexArtistId)) reasons.push('fandex-artist-id-required');
  if (!requireNonBlank(observation.fandexReleaseId)) reasons.push('fandex-release-id-required');
  if (!requireNonBlank(observation.providerPeriod)) reasons.push('provider-period-required');
  if (!isIsoInstant(observation.observedAt)) reasons.push('observed-at-invalid');
  if (!isIsoInstant(observation.collectedAt)) reasons.push('collected-at-invalid');

  if (observation.supersedesObservationId) {
    if (!requireNonBlank(observation.revisionId)) reasons.push('revision-id-required');
    if (!isIsoInstant(observation.revisionObservedAt)) reasons.push('revision-observed-at-required');
  } else if (observation.revisionId !== null || observation.revisionObservedAt !== null) {
    reasons.push('revision-without-supersession-forbidden');
  }

  return uniqueSorted(reasons);
}

function grantDigestInput(
  grant: Omit<AlbumResearchObservationIntakeGrant, 'grantDigest'>,
): Readonly<Record<string, unknown>> {
  return {
    grantVersion: grant.grantVersion,
    scope: grant.scope,
    observationIds: grant.observationIds,
    providerIds: grant.providerIds,
    authorizationEvidenceIds: grant.authorizationEvidenceIds,
    technicalResearchStorageAuthorized: grant.technicalResearchStorageAuthorized,
    rawBodyStorageAuthorized: grant.rawBodyStorageAuthorized,
    databaseWriteExecutionAuthorized: grant.databaseWriteExecutionAuthorized,
    publicationAuthorized: grant.publicationAuthorized,
    commercialUseAuthorized: grant.commercialUseAuthorized,
    rightsCleared: grant.rightsCleared,
  };
}

export function createAlbumResearchObservationIntakeGrant(input: Readonly<{
  observations: readonly DirectAlbumObservation[];
  authorizationEvidenceIds: readonly string[];
}>): AlbumResearchObservationIntakeGrant {
  if (input.observations.length === 0) {
    throw new Error('album_research_intake_grant_observations_required');
  }
  if (input.authorizationEvidenceIds.length === 0
    || input.authorizationEvidenceIds.some(id => !id.trim())) {
    throw new Error('album_research_intake_grant_evidence_required');
  }

  const observationIds = uniqueSorted(input.observations.map(observation => observation.observationId));
  if (observationIds.length !== input.observations.length) {
    throw new Error('album_research_intake_grant_duplicate_observation_id');
  }

  const providers = uniqueSorted(input.observations.map(observation => observation.providerId));
  if (providers.some(provider => !providerId(provider))) {
    throw new Error('album_research_intake_grant_provider_not_supported');
  }

  const base = Object.freeze({
    grantVersion: ALBUM_RESEARCH_OBSERVATION_GRANT_VERSION,
    scope: 'research' as const,
    observationIds,
    providerIds: Object.freeze(providers as AlbumResearchObservationProviderId[]),
    authorizationEvidenceIds: uniqueSorted(input.authorizationEvidenceIds),
    technicalResearchStorageAuthorized: true as const,
    rawBodyStorageAuthorized: false as const,
    databaseWriteExecutionAuthorized: false as const,
    publicationAuthorized: false as const,
    commercialUseAuthorized: false as const,
    rightsCleared: false as const,
  });

  return Object.freeze({
    ...base,
    grantDigest: sha256Canonical(grantDigestInput(base)),
  });
}

function validateGrant(
  grant: AlbumResearchObservationIntakeGrant | null,
  observations: readonly DirectAlbumObservation[],
): readonly string[] {
  if (!grant) return Object.freeze(['research-intake-grant-required']);

  const reasons: string[] = [];
  if (grant.grantVersion !== ALBUM_RESEARCH_OBSERVATION_GRANT_VERSION) {
    reasons.push('research-intake-grant-version-invalid');
  }
  if (grant.scope !== 'research') reasons.push('research-intake-scope-invalid');
  if (grant.technicalResearchStorageAuthorized !== true) {
    reasons.push('technical-research-storage-not-authorized');
  }
  if (grant.rawBodyStorageAuthorized !== false) reasons.push('raw-body-storage-must-remain-disabled');
  if (grant.databaseWriteExecutionAuthorized !== false) reasons.push('database-write-execution-must-remain-disabled');
  if (grant.publicationAuthorized !== false) reasons.push('publication-must-remain-disabled');
  if (grant.commercialUseAuthorized !== false) reasons.push('commercial-use-must-remain-disabled');
  if (grant.rightsCleared !== false) reasons.push('rights-clearance-must-not-be-implied');
  if (grant.authorizationEvidenceIds.length === 0
    || grant.authorizationEvidenceIds.some(id => !id.trim())) {
    reasons.push('research-intake-grant-evidence-required');
  }

  const expectedDigest = sha256Canonical(grantDigestInput({
    grantVersion: grant.grantVersion,
    scope: grant.scope,
    observationIds: grant.observationIds,
    providerIds: grant.providerIds,
    authorizationEvidenceIds: grant.authorizationEvidenceIds,
    technicalResearchStorageAuthorized: grant.technicalResearchStorageAuthorized,
    rawBodyStorageAuthorized: grant.rawBodyStorageAuthorized,
    databaseWriteExecutionAuthorized: grant.databaseWriteExecutionAuthorized,
    publicationAuthorized: grant.publicationAuthorized,
    commercialUseAuthorized: grant.commercialUseAuthorized,
    rightsCleared: grant.rightsCleared,
  }));
  if (expectedDigest !== grant.grantDigest) reasons.push('research-intake-grant-digest-invalid');

  const expectedObservationIds = uniqueSorted(observations.map(observation => observation.observationId));
  if (JSON.stringify(expectedObservationIds) !== JSON.stringify(grant.observationIds)) {
    reasons.push('research-intake-observation-set-mismatch');
  }
  const expectedProviders = uniqueSorted(observations.map(observation => observation.providerId));
  if (JSON.stringify(expectedProviders) !== JSON.stringify(grant.providerIds)) {
    reasons.push('research-intake-provider-set-mismatch');
  }

  return uniqueSorted(reasons);
}

export function buildAlbumResearchObservationSeriesKey(
  observation: DirectAlbumObservation,
): string {
  return sha256Canonical({
    contractVersion: ALBUM_RESEARCH_OBSERVATION_INTAKE_VERSION,
    providerId: observation.providerId,
    providerObservationId: observation.providerObservationId,
    providerArtistId: observation.providerArtistId,
    providerReleaseId: observation.providerReleaseId,
    providerEditionId: observation.providerEditionId,
    providerSkuId: observation.providerSkuId,
    fandexArtistId: observation.fandexArtistId,
    fandexReleaseId: observation.fandexReleaseId,
    semantic: observation.semantic,
    unit: observation.unit,
    territory: observation.territory,
    format: observation.format,
    providerPeriod: observation.providerPeriod,
  });
}

function isObservationPayload(value: unknown): value is DirectAlbumObservation {
  return Boolean(value && typeof value === 'object'
    && 'contractVersion' in value
    && 'observationId' in value
    && 'providerId' in value);
}

function albumResearchRecords(existing: readonly PersistenceRecord[]): readonly PersistenceRecord[] {
  return existing.filter(record =>
    record.persistenceScope === 'research'
    && record.recordType === ALBUM_RESEARCH_OBSERVATION_RECORD_TYPE,
  );
}

function findSupersededRecord(
  observation: DirectAlbumObservation,
  existing: readonly PersistenceRecord[],
): PersistenceRecord | null {
  if (!observation.supersedesObservationId) return null;
  const matches = existing.filter(record =>
    isObservationPayload(record.payload)
    && record.payload.observationId === observation.supersedesObservationId,
  );
  if (matches.length > 1) throw new Error('album_research_intake_supersession_target_ambiguous');
  return matches[0] ?? null;
}

function authorizationSnapshot(): AuthorizationSnapshot {
  return Object.freeze({
    ...defaultAuthorizationSnapshot(),
    acquisition: 'bounded-public-direct-research',
    automation: 'disabled',
    rawStorage: 'blocked',
    normalizedStorage: 'technical-research-only',
    retention: 'review-required',
    commercialUse: 'blocked',
    derivedPublication: 'blocked',
    rawRedistribution: 'blocked',
  });
}

function envelopeObservation(
  observation: DirectAlbumObservation,
  existing: readonly PersistenceRecord[],
): AlbumResearchObservationRecord {
  const seriesKey = buildAlbumResearchObservationSeriesKey(observation);
  const previous = findSupersededRecord(observation, existing);

  if (observation.supersedesObservationId && !previous) {
    throw new Error('album_research_intake_supersession_target_missing');
  }
  if (previous && isObservationPayload(previous.payload)) {
    const previousSeriesKey = buildAlbumResearchObservationSeriesKey(previous.payload);
    if (previousSeriesKey !== seriesKey) {
      throw new Error('album_research_intake_revision_series_mismatch');
    }
  }

  return envelopeRecord({
    recordType: ALBUM_RESEARCH_OBSERVATION_RECORD_TYPE,
    recordVersion: ALBUM_RESEARCH_OBSERVATION_RECORD_VERSION,
    persistenceScope: 'research',
    payload: observation,
    sourceEntityId: seriesKey,
    sourceRecordId: seriesKey,
    createdFromRecordIds: previous ? Object.freeze([previous.recordId]) : Object.freeze([]),
    contributionIdentityId: observation.fandexReleaseId,
    knowledgeMode: observation.knowledgeMode,
    effectivePeriod: observation.providerPeriod,
    observedAt: observation.observedAt,
    collectedAt: observation.collectedAt,
    revisionObservedAt: observation.revisionObservedAt,
    methodologyVersion: null,
    syntheticOnly: false,
    authorizationSnapshot: authorizationSnapshot(),
    supersedesRecordId: previous?.recordId ?? null,
    recordState: previous ? 'revised' : 'original',
  });
}

function countByProvider(records: readonly AlbumResearchObservationRecord[]): Readonly<Record<AlbumResearchObservationProviderId, number>> {
  return Object.freeze({
    'circle-chart': records.filter(record => record.payload.providerId === 'circle-chart').length,
    'hanteo-chart': records.filter(record => record.payload.providerId === 'hanteo-chart').length,
  });
}

function freezeResult(input: Omit<AlbumResearchObservationIntakeResult, 'resultDigest'>): AlbumResearchObservationIntakeResult {
  const digestShape = {
    contractVersion: input.contractVersion,
    status: input.status,
    reasons: input.reasons,
    grantDigest: input.grantDigest,
    candidateObservationCount: input.candidateObservationCount,
    candidateRecordCount: input.candidateRecordCount,
    providerRecordCounts: input.providerRecordCounts,
    recordIds: input.records.map(record => record.recordId),
    persistencePlanDigest: input.persistencePlan?.planDigest ?? null,
    executionAuthorized: input.executionAuthorized,
    effects: input.effects,
  };
  return Object.freeze({
    ...input,
    resultDigest: sha256Canonical(digestShape),
  });
}

function zeroEffects() {
  return Object.freeze({
    databaseReads: 0 as const,
    databaseWrites: 0 as const,
    externalCalls: 0 as const,
    scheduleMutations: 0 as const,
    environmentMutations: 0 as const,
  });
}

export function planAlbumResearchObservationIntake(input: Readonly<{
  observations: readonly DirectAlbumObservation[];
  existingRecords?: readonly PersistenceRecord[];
  grant?: AlbumResearchObservationIntakeGrant | null;
}>): AlbumResearchObservationIntakeResult {
  const existing = albumResearchRecords(input.existingRecords ?? []);
  const grantReasons = validateGrant(input.grant ?? null, input.observations);
  if (grantReasons.length > 0) {
    return freezeResult({
      contractVersion: ALBUM_RESEARCH_OBSERVATION_INTAKE_VERSION,
      status: 'blocked',
      reasons: grantReasons,
      grantDigest: input.grant?.grantDigest ?? null,
      candidateObservationCount: input.observations.length,
      candidateRecordCount: 0,
      providerRecordCounts: Object.freeze({ 'circle-chart': 0, 'hanteo-chart': 0 }),
      records: Object.freeze([]),
      persistencePlan: null,
      executionAuthorized: false,
      effects: zeroEffects(),
    });
  }

  if (input.observations.length === 0) {
    return freezeResult({
      contractVersion: ALBUM_RESEARCH_OBSERVATION_INTAKE_VERSION,
      status: 'invalid',
      reasons: Object.freeze(['observation-set-empty']),
      grantDigest: input.grant!.grantDigest,
      candidateObservationCount: 0,
      candidateRecordCount: 0,
      providerRecordCounts: Object.freeze({ 'circle-chart': 0, 'hanteo-chart': 0 }),
      records: Object.freeze([]),
      persistencePlan: null,
      executionAuthorized: false,
      effects: zeroEffects(),
    });
  }

  const observationIds = input.observations.map(observation => observation.observationId);
  if (new Set(observationIds).size !== observationIds.length) {
    return freezeResult({
      contractVersion: ALBUM_RESEARCH_OBSERVATION_INTAKE_VERSION,
      status: 'invalid',
      reasons: Object.freeze(['duplicate-observation-id']),
      grantDigest: input.grant!.grantDigest,
      candidateObservationCount: input.observations.length,
      candidateRecordCount: 0,
      providerRecordCounts: Object.freeze({ 'circle-chart': 0, 'hanteo-chart': 0 }),
      records: Object.freeze([]),
      persistencePlan: null,
      executionAuthorized: false,
      effects: zeroEffects(),
    });
  }

  const validationReasons = uniqueSorted(input.observations.flatMap(validateObservation));
  if (validationReasons.length > 0) {
    return freezeResult({
      contractVersion: ALBUM_RESEARCH_OBSERVATION_INTAKE_VERSION,
      status: 'invalid',
      reasons: validationReasons,
      grantDigest: input.grant!.grantDigest,
      candidateObservationCount: input.observations.length,
      candidateRecordCount: 0,
      providerRecordCounts: Object.freeze({ 'circle-chart': 0, 'hanteo-chart': 0 }),
      records: Object.freeze([]),
      persistencePlan: null,
      executionAuthorized: false,
      effects: zeroEffects(),
    });
  }

  let records: AlbumResearchObservationRecord[];
  try {
    records = input.observations.map(observation => envelopeObservation(observation, existing));
  } catch (error) {
    return freezeResult({
      contractVersion: ALBUM_RESEARCH_OBSERVATION_INTAKE_VERSION,
      status: 'invalid',
      reasons: Object.freeze([error instanceof Error ? error.message : 'album_research_intake_envelope_failed']),
      grantDigest: input.grant!.grantDigest,
      candidateObservationCount: input.observations.length,
      candidateRecordCount: 0,
      providerRecordCounts: Object.freeze({ 'circle-chart': 0, 'hanteo-chart': 0 }),
      records: Object.freeze([]),
      persistencePlan: null,
      executionAuthorized: false,
      effects: zeroEffects(),
    });
  }

  for (const record of records) {
    if (record.supersedesRecordId) continue;
    const changedExisting = existing.find(existingRecord =>
      existingRecord.sourceRecordId === record.sourceRecordId
      && existingRecord.payloadDigest !== record.payloadDigest,
    );
    if (changedExisting) {
      return freezeResult({
        contractVersion: ALBUM_RESEARCH_OBSERVATION_INTAKE_VERSION,
        status: 'invalid',
        reasons: Object.freeze(['changed-observation-requires-explicit-revision']),
        grantDigest: input.grant!.grantDigest,
        candidateObservationCount: input.observations.length,
        candidateRecordCount: records.length,
        providerRecordCounts: countByProvider(records),
        records: Object.freeze(records),
        persistencePlan: null,
        executionAuthorized: false,
        effects: zeroEffects(),
      });
    }
  }

  const persistencePlan = planPersistenceAppend(existing, records, {
    scope: 'research',
    authorization: authorizationSnapshot(),
    technicalEligibility: 'eligible',
    syntheticOnly: false,
  });

  if (persistencePlan.blockedCount > 0
    || persistencePlan.invalidCount > 0
    || persistencePlan.conflictCount > 0) {
    return freezeResult({
      contractVersion: ALBUM_RESEARCH_OBSERVATION_INTAKE_VERSION,
      status: 'invalid',
      reasons: Object.freeze(['generic-persistence-plan-not-clean']),
      grantDigest: input.grant!.grantDigest,
      candidateObservationCount: input.observations.length,
      candidateRecordCount: records.length,
      providerRecordCounts: countByProvider(records),
      records: Object.freeze(records),
      persistencePlan,
      executionAuthorized: false,
      effects: zeroEffects(),
    });
  }

  return freezeResult({
    contractVersion: ALBUM_RESEARCH_OBSERVATION_INTAKE_VERSION,
    status: 'planned',
    reasons: Object.freeze([]),
    grantDigest: input.grant!.grantDigest,
    candidateObservationCount: input.observations.length,
    candidateRecordCount: records.length,
    providerRecordCounts: countByProvider(records),
    records: Object.freeze(records),
    persistencePlan,
    executionAuthorized: false,
    effects: zeroEffects(),
  });
}
