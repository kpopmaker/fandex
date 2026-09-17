import { sha256Canonical } from '../shared/canonicalDigest';
import type { AlternativeEvidence } from './contracts';
import {
  fromRetailObservation,
  type CanonicalAlbumFeatureInput,
} from './canonicalAlbumFeatureInput';
import {
  ALBUM_IDENTITY_EVIDENCE_RECORD_VERSION,
  type AlbumIdentityEvidencePersistencePayload,
} from './albumIdentityEvidencePersistenceResearch';
import { buildPersistenceRecordId } from './persistenceContracts';
import type { RetailObservation } from './retailObservation';

export const ALBUM_IDENTITY_STORED_EVIDENCE_HYDRATION_RESEARCH_CONTRACT_VERSION =
  'album-identity-stored-evidence-hydration-research-v1' as const;

export const ALBUM_IDENTITY_STORED_EVIDENCE_HYDRATION_RESEARCH_DESCRIPTOR = Object.freeze({
  contractVersion: ALBUM_IDENTITY_STORED_EVIDENCE_HYDRATION_RESEARCH_CONTRACT_VERSION,
  lifecycle: 'research' as const,
  sourceStore: 'fandex.album_identity_research_records' as const,
  directProductContributionEligible: false as const,
  productScorePublished: false as const,
  productMethodologyFrozen: false as const,
  productionEligible: false as const,
  automaticProductionIdentityPromotionAllowed: false as const,
  supportedFeatureBridge: 'yes24-retail-product-release-mapping' as const,
  ambiguousProviderFamilyMayResolveSingleRelease: false as const,
  semantics: 'verified-stored-identity-evidence-to-research-canonical-feature-input' as const,
});

export const ALBUM_IDENTITY_RESEARCH_ROWS_FOR_RETAIL_PRODUCT_SQL = `WITH retail_mapping AS (
  SELECT *
  FROM fandex.album_identity_research_records
  WHERE record_type = 'retail-product-release-mapping'
    AND provider = $1
    AND evidence_payload ->> 'providerEntityId' = $2
)
SELECT r.*
FROM fandex.album_identity_research_records r
WHERE r.record_id IN (SELECT record_id FROM retail_mapping)
   OR (
     r.record_type = 'canonical-release-reference'
     AND r.fandex_release_id IN (
       SELECT fandex_release_id FROM retail_mapping WHERE fandex_release_id IS NOT NULL
     )
   )
ORDER BY r.record_type, r.record_id;` as const;

export type AlbumIdentityResearchStoredRow = Readonly<{
  record_id: string;
  record_version: string;
  record_type: string;
  provider: string;
  source_entity_id: string;
  source_record_id: string;
  payload_digest: string;
  fandex_artist_id: string;
  fandex_release_id: string | null;
  fandex_release_family_id: string | null;
  effective_period: string | null;
  record_state: string;
  supersedes_record_id: string | null;
  authorization_snapshot: unknown;
  evidence_payload: unknown;
  observed_at: string;
  collected_at: string;
  revision_observed_at: string | null;
}>;

export type AlbumIdentityStoredRowValidation = Readonly<{
  valid: boolean;
  issues: readonly string[];
}>;

export type HydratedAlbumIdentityStoredRecord = Readonly<{
  row: AlbumIdentityResearchStoredRow;
  payload: AlbumIdentityEvidencePersistencePayload;
  integrityState: 'verified';
  persistenceScope: 'research';
  syntheticOnly: false;
}>;

export type StoredRetailIdentityResolution = Readonly<{
  state: 'resolved-research' | 'unresolved' | 'ambiguous' | 'blocked';
  artistId: string | null;
  releaseId: string | null;
  releaseFamilyId: string | null;
  evidenceRecordIds: readonly string[];
  blockers: readonly string[];
}>;

export type StoredRetailIdentityFeatureBridge = Readonly<{
  resolution: StoredRetailIdentityResolution;
  observation: RetailObservation;
  features: readonly CanonicalAlbumFeatureInput[];
  effects: Readonly<{ databaseReads: 0; databaseWrites: 0; externalCalls: 0 }>;
}>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const unique = (values: readonly string[]) => Object.freeze([...new Set(values)]);
const digestId = (kind: string, value: string) => sha256Canonical({ kind, value });

function payloadShape(value: unknown): value is AlbumIdentityEvidencePersistencePayload {
  if (!isRecord(value)) return false;
  if (!['release-reference-evidence', 'canonical-release-reference', 'retail-product-release-mapping']
    .includes(String(value.recordType))) return false;
  if (value.canonicalArtistId !== 'iu') return false;
  if (!['musicbrainz', 'yes24', 'fandex-research'].includes(String(value.provider))) return false;
  if (typeof value.providerEntityId !== 'string' || value.providerEntityId.trim() === '') return false;
  if (value.fandexReleaseId !== null && typeof value.fandexReleaseId !== 'string') return false;
  if (value.fandexReleaseFamilyId !== null && typeof value.fandexReleaseFamilyId !== 'string') return false;
  if (!Array.isArray(value.evidenceRefs) || value.evidenceRefs.some((item) => typeof item !== 'string')) return false;
  return isRecord(value.data);
}

function retailMappingShape(value: unknown): value is Record<string, unknown> & {
  lifecycle: 'research';
  retailerId: 'yes24';
  retailerProductId: string;
  fandexReleaseId: string;
  fandexReleaseFamilyId: string;
  resolutionState: 'resolved';
  reviewState: string;
  blockers: readonly string[];
  directProductContributionEligible: false;
  productScorePublished: false;
} {
  if (!isRecord(value)) return false;
  return value.lifecycle === 'research'
    && value.retailerId === 'yes24'
    && typeof value.retailerProductId === 'string'
    && typeof value.fandexReleaseId === 'string'
    && typeof value.fandexReleaseFamilyId === 'string'
    && value.resolutionState === 'resolved'
    && typeof value.reviewState === 'string'
    && Array.isArray(value.blockers)
    && value.blockers.every((item) => typeof item === 'string')
    && value.directProductContributionEligible === false
    && value.productScorePublished === false;
}

function iso(value: string): boolean {
  return value.trim() !== '' && !Number.isNaN(Date.parse(value));
}

export function validateAlbumIdentityResearchStoredRow(
  row: AlbumIdentityResearchStoredRow,
): AlbumIdentityStoredRowValidation {
  const issues: string[] = [];
  if (row.record_version !== ALBUM_IDENTITY_EVIDENCE_RECORD_VERSION) issues.push('record-version-mismatch');
  if (!payloadShape(row.evidence_payload)) {
    issues.push('evidence-payload-shape-invalid');
    return Object.freeze({ valid: false, issues: unique(issues) });
  }

  const payload = row.evidence_payload;
  const expectedDigest = sha256Canonical(payload);
  if (row.payload_digest !== expectedDigest) issues.push('payload-digest-mismatch');
  if (row.record_id !== buildPersistenceRecordId(row.record_type, expectedDigest, 'research')) {
    issues.push('record-id-mismatch');
  }
  if (row.record_type !== payload.recordType) issues.push('record-type-mismatch');
  if (row.provider !== payload.provider) issues.push('provider-mismatch');
  if (row.fandex_artist_id !== payload.canonicalArtistId) issues.push('artist-id-mismatch');
  if (row.fandex_release_id !== payload.fandexReleaseId) issues.push('release-id-mismatch');
  if (row.fandex_release_family_id !== payload.fandexReleaseFamilyId) issues.push('release-family-id-mismatch');
  if (row.source_entity_id !== digestId(`${payload.provider}:entity`, payload.providerEntityId)) {
    issues.push('source-entity-id-mismatch');
  }
  if (row.source_record_id !== digestId(`${payload.recordType}:source`, `${payload.provider}:${payload.providerEntityId}`)) {
    issues.push('source-record-id-mismatch');
  }
  if (!['original', 'revised', 'conflicting', 'rejected'].includes(row.record_state)) {
    issues.push('record-state-invalid');
  }
  if (!iso(row.observed_at)) issues.push('observed-at-invalid');
  if (!iso(row.collected_at)) issues.push('collected-at-invalid');
  if (iso(row.observed_at) && iso(row.collected_at)
    && Date.parse(row.collected_at) < Date.parse(row.observed_at)) {
    issues.push('collection-before-observation');
  }
  if (row.revision_observed_at !== null && !iso(row.revision_observed_at)) {
    issues.push('revision-observed-at-invalid');
  }
  return Object.freeze({ valid: issues.length === 0, issues: unique(issues) });
}

export function hydrateAlbumIdentityResearchStoredRow(
  row: AlbumIdentityResearchStoredRow,
): HydratedAlbumIdentityStoredRecord {
  const validation = validateAlbumIdentityResearchStoredRow(row);
  if (!validation.valid) {
    throw new Error(`album_identity_stored_evidence_invalid:${validation.issues.join(',')}`);
  }
  return Object.freeze({
    row,
    payload: row.evidence_payload as AlbumIdentityEvidencePersistencePayload,
    integrityState: 'verified' as const,
    persistenceScope: 'research' as const,
    syntheticOnly: false as const,
  });
}

function blocked(blockers: readonly string[], evidenceRecordIds: readonly string[] = []): StoredRetailIdentityResolution {
  return Object.freeze({
    state: 'blocked' as const,
    artistId: null,
    releaseId: null,
    releaseFamilyId: null,
    evidenceRecordIds: unique(evidenceRecordIds),
    blockers: unique(blockers),
  });
}

export function resolveRetailObservationIdentityFromStoredAlbumResearch(
  observation: RetailObservation,
  rows: readonly AlbumIdentityResearchStoredRow[],
): StoredRetailIdentityResolution {
  if (observation.retailerId !== 'yes24') return blocked(['unsupported-retailer']);
  if (!observation.retailerProductId) return blocked(['retailer-product-id-missing']);
  if (!observation.productIdentity) return blocked(['retail-product-identity-missing']);
  if (observation.productIdentity.retailerId !== observation.retailerId
    || observation.productIdentity.retailerProductId !== observation.retailerProductId) {
    return blocked(['retail-product-identity-key-mismatch']);
  }

  let hydrated: HydratedAlbumIdentityStoredRecord[];
  try {
    hydrated = rows.map((row) => hydrateAlbumIdentityResearchStoredRow(row));
  } catch (error) {
    return blocked([
      'stored-evidence-integrity-invalid',
      error instanceof Error ? error.message : 'stored-evidence-hydration-failed',
    ]);
  }

  const mappings = hydrated.filter((record) => {
    const payload = record.payload;
    return record.row.record_state !== 'conflicting'
      && record.row.record_state !== 'rejected'
      && payload.recordType === 'retail-product-release-mapping'
      && payload.provider === 'yes24'
      && payload.providerEntityId === observation.retailerProductId;
  });

  if (mappings.length === 0) {
    return Object.freeze({
      state: 'unresolved' as const,
      artistId: null,
      releaseId: null,
      releaseFamilyId: null,
      evidenceRecordIds: Object.freeze([]),
      blockers: Object.freeze(['stored-retail-product-release-mapping-not-found']),
    });
  }

  const accepted = mappings.filter((record) => {
    const data = record.payload.data;
    return retailMappingShape(data)
      && data.retailerId === observation.retailerId
      && data.retailerProductId === observation.retailerProductId
      && data.fandexReleaseId === record.payload.fandexReleaseId
      && data.fandexReleaseFamilyId === record.payload.fandexReleaseFamilyId;
  });
  if (accepted.length !== mappings.length) {
    return blocked(['stored-retail-mapping-contract-invalid'], mappings.map((record) => record.row.record_id));
  }

  const identities = unique(accepted.map((record) =>
    `${record.payload.canonicalArtistId}|${record.payload.fandexReleaseId}|${record.payload.fandexReleaseFamilyId}`));
  if (identities.length !== 1) {
    return Object.freeze({
      state: 'ambiguous' as const,
      artistId: null,
      releaseId: null,
      releaseFamilyId: null,
      evidenceRecordIds: unique(accepted.map((record) => record.row.record_id)),
      blockers: Object.freeze(['multiple-stored-retail-release-identities']),
    });
  }

  const selected = accepted[0];
  const releaseId = selected.payload.fandexReleaseId;
  const familyId = selected.payload.fandexReleaseFamilyId;
  if (!releaseId || !familyId) {
    return blocked(['stored-retail-mapping-release-identity-missing'], accepted.map((record) => record.row.record_id));
  }

  const references = hydrated.filter((record) =>
    record.row.record_state !== 'conflicting'
    && record.row.record_state !== 'rejected'
    && record.payload.recordType === 'canonical-release-reference'
    && record.payload.fandexReleaseId === releaseId
    && record.payload.fandexReleaseFamilyId === familyId);
  if (references.length !== 1) {
    return blocked([
      references.length === 0
        ? 'canonical-release-reference-not-stored'
        : 'canonical-release-reference-not-unique',
    ], accepted.map((record) => record.row.record_id));
  }

  const mappingData = selected.payload.data;
  if (!retailMappingShape(mappingData)) {
    return blocked(['stored-retail-mapping-contract-invalid'], accepted.map((record) => record.row.record_id));
  }
  const sharedEvidence = mappingData.blockers;
  const evidenceRefs = selected.payload.evidenceRefs;
  if (!evidenceRefs.some((ref) => references[0].payload.evidenceRefs.includes(ref))) {
    return blocked(['retail-mapping-release-reference-lineage-missing'], [selected.row.record_id, references[0].row.record_id]);
  }

  if (observation.fandexArtistId !== null && observation.fandexArtistId !== selected.payload.canonicalArtistId) {
    return blocked(['preexisting-artist-identity-conflict'], [selected.row.record_id, references[0].row.record_id]);
  }
  if (observation.fandexReleaseId !== null && observation.fandexReleaseId !== releaseId) {
    return blocked(['preexisting-release-identity-conflict'], [selected.row.record_id, references[0].row.record_id]);
  }
  if (observation.fandexReleaseFamilyId !== null && observation.fandexReleaseFamilyId !== familyId) {
    return blocked(['preexisting-release-family-identity-conflict'], [selected.row.record_id, references[0].row.record_id]);
  }

  return Object.freeze({
    state: 'resolved-research' as const,
    artistId: selected.payload.canonicalArtistId,
    releaseId,
    releaseFamilyId: familyId,
    evidenceRecordIds: unique([selected.row.record_id, references[0].row.record_id]),
    blockers: unique(['stored-identity-research-only', ...sharedEvidence]),
  });
}

function failClosedObservation(observation: RetailObservation): RetailObservation {
  return Object.freeze({
    ...observation,
    productIdentity: observation.productIdentity
      ? Object.freeze({ ...observation.productIdentity, identityState: 'unresolved' as const })
      : null,
    fandexArtistId: null,
    fandexReleaseId: null,
    fandexReleaseFamilyId: null,
  });
}

export function enrichRetailObservationWithStoredAlbumIdentityResearch(
  observation: RetailObservation,
  rows: readonly AlbumIdentityResearchStoredRow[],
): Readonly<{ resolution: StoredRetailIdentityResolution; observation: RetailObservation }> {
  const resolution = resolveRetailObservationIdentityFromStoredAlbumResearch(observation, rows);
  if (resolution.state !== 'resolved-research') {
    return Object.freeze({ resolution, observation: failClosedObservation(observation) });
  }
  const enriched = Object.freeze({
    ...observation,
    productIdentity: observation.productIdentity
      ? Object.freeze({ ...observation.productIdentity, identityState: 'resolved' as const })
      : null,
    fandexArtistId: resolution.artistId,
    fandexReleaseId: resolution.releaseId,
    fandexReleaseFamilyId: resolution.releaseFamilyId,
  });
  return Object.freeze({ resolution, observation: enriched });
}

export function fromRetailObservationWithStoredAlbumIdentityResearch(
  observation: RetailObservation,
  evidence: AlternativeEvidence,
  rows: readonly AlbumIdentityResearchStoredRow[],
  options: Readonly<{ rankFeatureKey?: 'physicalRetailLevelProxy' | 'diagnosticRank'; includeBreadth?: boolean }> = {},
): StoredRetailIdentityFeatureBridge {
  const enrichment = enrichRetailObservationWithStoredAlbumIdentityResearch(observation, rows);
  const features = fromRetailObservation(enrichment.observation, evidence, options).map((feature) => Object.freeze({
    ...feature,
    eligibilityState: feature.eligibilityState === 'diagnostic-only' ? 'diagnostic-only' as const : 'research-only' as const,
    blockers: unique([...feature.blockers, ...enrichment.resolution.blockers]),
  }));
  return Object.freeze({
    resolution: enrichment.resolution,
    observation: enrichment.observation,
    features: Object.freeze(features),
    effects: Object.freeze({ databaseReads: 0 as const, databaseWrites: 0 as const, externalCalls: 0 as const }),
  });
}
