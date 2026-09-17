import { sha256Canonical } from '../shared/canonicalDigest';
import type { DirectAlbumObservation } from './directAlbumProvider';
import {
  evaluateLuminateFandexAuthorizationGrant,
  type LuminateAuthorizationAssessment,
  type LuminateFandexAuthorizationGrant,
} from './luminateAlbumAuthorizationResearch';
import { buildLuminateTrackedFirstWeekWindow } from './luminateAlbumSalesProductionCandidateResearch';

export const LUMINATE_ALBUM_OBSERVATION_INTAKE_RESEARCH_VERSION =
  'luminate-album-observation-intake-research-v1' as const;
export const ALBUM_DIRECT_OBSERVATION_RESEARCH_RECORD_VERSION =
  'album-direct-observation-research-v1' as const;

const HEX64_RE = /^[0-9a-f]{64}$/;

export const LUMINATE_ALBUM_OBSERVATION_STORE_SCHEMA_RESEARCH = Object.freeze({
  lifecycle: 'research' as const,
  table: 'fandex.album_research_observation_records' as const,
  observedMainSchemaProviderConstraint: Object.freeze(['circle-chart', 'hanteo-chart'] as const),
  requiredProviderId: 'luminate-music' as const,
  providerConstraintExtensionRequired: true as const,
  mainDatabaseMutatedByThisContract: false as const,
  migrationApplicationRequiresExplicitApproval: true as const,
  recordVersion: ALBUM_DIRECT_OBSERVATION_RESEARCH_RECORD_VERSION,
});

export type LuminateObservationAuthorizationSnapshot = Readonly<{
  acquisition: 'allowed';
  automation: 'allowed';
  rawStorage: 'not-required';
  normalizedStorage: 'allowed';
  retention: 'allowed';
  commercialUse: 'allowed';
  derivedPublication: 'allowed';
  rawRedistribution: 'not-required';
  agreementEvidenceId: string;
  postTerminationPolicyEvidenceId: string;
  authorizedTerritories: readonly ('US' | 'CA')[];
  publicOutputMode: LuminateFandexAuthorizationGrant['publicOutputMode'];
}>;

export type LuminateAlbumObservationStoredRow = Readonly<{
  record_id: string;
  record_version: typeof ALBUM_DIRECT_OBSERVATION_RESEARCH_RECORD_VERSION;
  provider: 'luminate-music';
  source_entity_id: string;
  source_record_id: string;
  observation_id: string;
  payload_digest: string;
  fandex_artist_id: string;
  fandex_release_id: string;
  provider_period: string;
  record_state: 'original' | 'revised';
  supersedes_record_id: string | null;
  intake_plan_digest: string;
  write_grant_digest: string;
  authorization_snapshot: LuminateObservationAuthorizationSnapshot;
  observation_payload: DirectAlbumObservation;
  observed_at: string;
  collected_at: string;
  revision_observed_at: string | null;
}>;

export type LuminateObservationIntakeAssessment = Readonly<{
  state: 'eligible-for-research-store-write-review' | 'blocked';
  schemaState: 'ready' | 'migration-required';
  authorizationState: LuminateAuthorizationAssessment['state'];
  expectedProviderPeriod: string;
  blockers: readonly string[];
}>;

export type LuminateObservationIntakeInput = Readonly<{
  observation: DirectAlbumObservation;
  releaseDate: string;
  grant: LuminateFandexAuthorizationGrant;
  schemaProviderConstraintIncludesLuminate: boolean;
  supersedesStoredRecordId?: string | null;
}>;

function validTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function expectedProviderPeriod(releaseDate: string): string {
  const window = buildLuminateTrackedFirstWeekWindow(releaseDate);
  return `${window.startDate}/${window.endDate}`;
}

export function evaluateLuminateObservationIntake(
  input: LuminateObservationIntakeInput,
): LuminateObservationIntakeAssessment {
  const blockers: string[] = [];
  const auth = evaluateLuminateFandexAuthorizationGrant(input.grant);
  const expectedPeriod = expectedProviderPeriod(input.releaseDate);

  if (!input.schemaProviderConstraintIncludesLuminate) {
    blockers.push('luminate-provider-not-allowed-by-observation-store-schema');
  }
  if (auth.state !== 'eligible-for-provider-onboarding-review' || !auth.rightsResolved) {
    blockers.push('luminate-source-authorization-unresolved');
    blockers.push(...auth.blockers);
  }

  const observation = input.observation;
  if (observation.providerId !== 'luminate-music') blockers.push('luminate-provider-id-mismatch');
  if (observation.semantic !== 'first-week-sale') blockers.push('luminate-first-week-sale-semantic-required');
  if (observation.unit !== 'physical-units') blockers.push('luminate-physical-units-required');
  if (observation.value === null || !Number.isSafeInteger(observation.value) || observation.value <= 0) {
    blockers.push('luminate-positive-integer-physical-units-required');
  }
  if (observation.territory !== 'US' && observation.territory !== 'CA') {
    blockers.push('luminate-supported-territory-required');
  } else if (!auth.authorizedTerritories.includes(observation.territory)) {
    blockers.push('luminate-observation-territory-not-authorized');
  }
  if (observation.providerPeriod !== expectedPeriod) blockers.push('luminate-provider-period-mismatch');
  if (!observation.fandexArtistId) blockers.push('luminate-fandex-artist-identity-required');
  if (!observation.fandexReleaseId) blockers.push('luminate-fandex-release-identity-required');
  if (!observation.fandexReleaseFamilyId) blockers.push('luminate-release-family-required');
  if (!observation.providerReleaseId) blockers.push('luminate-provider-release-identity-required');
  if (observation.scopeRole !== 'release-total') blockers.push('luminate-release-total-scope-required');
  if (observation.parentObservationId !== null) blockers.push('luminate-release-total-parent-must-be-null');
  if (observation.syntheticFixture) blockers.push('luminate-synthetic-fixture-not-store-write-eligible');
  if (!validTimestamp(observation.observedAt)) blockers.push('luminate-observed-at-invalid');
  if (!validTimestamp(observation.collectedAt)) blockers.push('luminate-collected-at-invalid');
  if (validTimestamp(observation.observedAt)
    && validTimestamp(observation.collectedAt)
    && Date.parse(observation.collectedAt) < Date.parse(observation.observedAt)) {
    blockers.push('luminate-collection-before-observation');
  }

  const supersedesStoredRecordId = input.supersedesStoredRecordId ?? null;
  if (observation.supersedesObservationId !== null) {
    if (!observation.revisionId) blockers.push('luminate-revision-id-required-for-supersession');
    if (!observation.revisionObservedAt || !validTimestamp(observation.revisionObservedAt)) {
      blockers.push('luminate-revision-observed-at-required-for-supersession');
    }
    if (!supersedesStoredRecordId || !HEX64_RE.test(supersedesStoredRecordId)) {
      blockers.push('luminate-superseded-stored-record-id-required');
    }
  } else {
    if (observation.revisionId !== null || observation.revisionObservedAt !== null) {
      blockers.push('luminate-revision-fields-without-supersession');
    }
    if (supersedesStoredRecordId !== null) blockers.push('luminate-stored-supersession-without-observation-supersession');
  }

  return Object.freeze({
    state: blockers.length === 0
      ? 'eligible-for-research-store-write-review' as const
      : 'blocked' as const,
    schemaState: input.schemaProviderConstraintIncludesLuminate
      ? 'ready' as const
      : 'migration-required' as const,
    authorizationState: auth.state,
    expectedProviderPeriod: expectedPeriod,
    blockers: Object.freeze([...new Set(blockers)]),
  });
}

export function buildLuminateObservationStoreProviderConstraintMigrationSql(): string {
  return `ALTER TABLE fandex.album_research_observation_records\n  DROP CONSTRAINT album_research_observation_records_provider_check;\n\nALTER TABLE fandex.album_research_observation_records\n  ADD CONSTRAINT album_research_observation_records_provider_check\n  CHECK (provider = ANY (ARRAY['circle-chart'::text, 'hanteo-chart'::text, 'luminate-music'::text]));`;
}

export function buildLuminateObservationStoredRow(
  input: LuminateObservationIntakeInput,
): LuminateAlbumObservationStoredRow {
  const assessment = evaluateLuminateObservationIntake(input);
  if (assessment.state !== 'eligible-for-research-store-write-review') {
    throw new Error(`luminate_observation_intake_blocked:${assessment.blockers.join(',')}`);
  }

  const observation = input.observation;
  const agreementEvidenceId = input.grant.agreementEvidenceId!;
  const postTerminationPolicyEvidenceId = input.grant.postTerminationPolicyEvidenceId!;
  const authorizationSnapshot: LuminateObservationAuthorizationSnapshot = Object.freeze({
    acquisition: 'allowed',
    automation: 'allowed',
    rawStorage: 'not-required',
    normalizedStorage: 'allowed',
    retention: 'allowed',
    commercialUse: 'allowed',
    derivedPublication: 'allowed',
    rawRedistribution: 'not-required',
    agreementEvidenceId,
    postTerminationPolicyEvidenceId,
    authorizedTerritories: Object.freeze([...input.grant.authorizedTerritories]),
    publicOutputMode: input.grant.publicOutputMode,
  });

  const payloadDigest = sha256Canonical(observation);
  const sourceEntityId = sha256Canonical({
    providerId: observation.providerId,
    providerReleaseId: observation.providerReleaseId,
    fandexReleaseId: observation.fandexReleaseId,
  });
  const sourceRecordId = sha256Canonical({
    providerId: observation.providerId,
    providerObservationId: observation.providerObservationId,
    providerReleaseId: observation.providerReleaseId,
    providerPeriod: observation.providerPeriod,
    revisionId: observation.revisionId,
  });
  const intakePlanDigest = sha256Canonical({
    contractVersion: LUMINATE_ALBUM_OBSERVATION_INTAKE_RESEARCH_VERSION,
    observationId: observation.observationId,
    releaseDate: input.releaseDate,
    expectedProviderPeriod: assessment.expectedProviderPeriod,
    territory: observation.territory,
    scopeRole: observation.scopeRole,
  });
  const writeGrantDigest = sha256Canonical({
    agreementEvidenceId,
    postTerminationPolicyEvidenceId,
    licenseActive: input.grant.licenseActive,
    authorizedTerritories: [...input.grant.authorizedTerritories].sort(),
    publicOutputMode: input.grant.publicOutputMode,
    normalizedStorage: input.grant.normalizedStorage,
    retentionDuringLicense: input.grant.retentionDuringLicense,
    commercialProductUse: input.grant.commercialProductUse,
    publicDerivedMetricPublication: input.grant.publicDerivedMetricPublication,
  });
  const recordState = observation.supersedesObservationId ? 'revised' as const : 'original' as const;
  const recordId = sha256Canonical({
    recordVersion: ALBUM_DIRECT_OBSERVATION_RESEARCH_RECORD_VERSION,
    observationId: observation.observationId,
    payloadDigest,
    intakePlanDigest,
    writeGrantDigest,
    recordState,
  });

  for (const digest of [recordId, sourceEntityId, sourceRecordId, observation.observationId, payloadDigest, intakePlanDigest, writeGrantDigest]) {
    if (!HEX64_RE.test(digest)) throw new Error('luminate_observation_store_digest_invalid');
  }

  return Object.freeze({
    record_id: recordId,
    record_version: ALBUM_DIRECT_OBSERVATION_RESEARCH_RECORD_VERSION,
    provider: 'luminate-music' as const,
    source_entity_id: sourceEntityId,
    source_record_id: sourceRecordId,
    observation_id: observation.observationId,
    payload_digest: payloadDigest,
    fandex_artist_id: observation.fandexArtistId!,
    fandex_release_id: observation.fandexReleaseId!,
    provider_period: observation.providerPeriod!,
    record_state: recordState,
    supersedes_record_id: input.supersedesStoredRecordId ?? null,
    intake_plan_digest: intakePlanDigest,
    write_grant_digest: writeGrantDigest,
    authorization_snapshot: authorizationSnapshot,
    observation_payload: observation,
    observed_at: observation.observedAt,
    collected_at: observation.collectedAt,
    revision_observed_at: observation.revisionObservedAt,
  });
}
