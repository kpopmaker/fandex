import { sha256Canonical } from '../shared/canonicalDigest';
import {
  envelopeRecord,
  type AuthorizationSnapshot,
  type PersistenceRecordEnvelope,
} from './persistenceContracts';
import {
  IU_CANONICAL_RELEASE_REFERENCE_CATALOG_RESEARCH,
  IU_RELEASE_REFERENCE_EVIDENCE,
  IU_YES24_RETAIL_PRODUCT_RELEASE_MAPPINGS_RESEARCH,
  type IuCanonicalReleaseReferenceCatalogEntry,
  type IuReleaseReferenceEvidence,
  type IuYes24RetailProductReleaseMappingResearch,
} from './iuCanonicalReleaseReferenceCatalogResearch';

export const ALBUM_IDENTITY_EVIDENCE_PERSISTENCE_RESEARCH_CONTRACT_VERSION =
  'album-identity-evidence-persistence-research-v1' as const;
export const ALBUM_IDENTITY_EVIDENCE_RECORD_VERSION =
  'album-identity-evidence-research-v1' as const;

export const ALBUM_IDENTITY_EVIDENCE_PERSISTENCE_RESEARCH_DESCRIPTOR = Object.freeze({
  contractVersion: ALBUM_IDENTITY_EVIDENCE_PERSISTENCE_RESEARCH_CONTRACT_VERSION,
  lifecycle: 'research' as const,
  directProductContributionEligible: false as const,
  productScorePublished: false as const,
  productMethodologyFrozen: false as const,
  productionEligible: false as const,
  databaseWriteAllowed: false as const,
  existingDirectObservationTableCompatible: false as const,
  requiredLogicalStore: 'album_identity_research_records' as const,
  rawPageStorageIncluded: false as const,
  normalizedReferenceMetadataOnly: true as const,
  semantics: 'normalized-album-identity-reference-evidence-persistence-candidate' as const,
});

export type AlbumIdentityEvidenceRecordType =
  | 'release-reference-evidence'
  | 'canonical-release-reference'
  | 'retail-product-release-mapping';

export type AlbumIdentityEvidencePersistencePayload = Readonly<{
  recordType: AlbumIdentityEvidenceRecordType;
  canonicalArtistId: 'iu';
  provider: 'musicbrainz' | 'yes24' | 'fandex-research';
  providerEntityId: string;
  fandexReleaseId: string | null;
  fandexReleaseFamilyId: string | null;
  evidenceRefs: readonly string[];
  data: IuReleaseReferenceEvidence | IuCanonicalReleaseReferenceCatalogEntry | IuYes24RetailProductReleaseMappingResearch;
}>;

export type AlbumIdentityEvidencePersistenceRecord =
  PersistenceRecordEnvelope<AlbumIdentityEvidencePersistencePayload>;

export type AlbumIdentityEvidenceCaptureContext = Readonly<{
  observedAt: string;
  collectedAt: string;
  authorizationSnapshot: AuthorizationSnapshot;
}>;

export type AlbumIdentityEvidenceWriteGate = Readonly<{
  state: 'eligible-for-migration-and-write-review' | 'blocked';
  blockers: readonly string[];
  candidateCount: number;
  existingDirectObservationTableCompatible: false;
  targetLogicalStore: 'album_identity_research_records';
  databaseWrites: 0;
  externalCalls: 0;
}>;

const frozenUnique = (values: readonly string[]) => Object.freeze([...new Set(values)]);
const digestId = (kind: string, value: string) => sha256Canonical({ kind, value });

function assertIsoTimestamp(value: string, code: string): void {
  if (!value || Number.isNaN(Date.parse(value))) throw new Error(code);
}

function evidenceToReleaseIds(evidenceId: string): Readonly<{ releaseId: string | null; familyId: string | null }> {
  const matches = IU_CANONICAL_RELEASE_REFERENCE_CATALOG_RESEARCH.filter((entry) =>
    entry.evidenceRefs.includes(evidenceId));
  const releaseIds = frozenUnique(matches.map((entry) => entry.reference.release.fandexReleaseId)
    .filter((value): value is string => value !== null));
  const familyIds = frozenUnique(matches.map((entry) => entry.reference.release.fandexReleaseFamilyId)
    .filter((value): value is string => value !== null));
  return Object.freeze({
    releaseId: releaseIds.length === 1 ? releaseIds[0] : null,
    familyId: familyIds.length === 1 ? familyIds[0] : null,
  });
}

function wrapPayload(
  payload: AlbumIdentityEvidencePersistencePayload,
  context: AlbumIdentityEvidenceCaptureContext,
  effectivePeriod: string | null,
): AlbumIdentityEvidencePersistenceRecord {
  return envelopeRecord({
    recordType: payload.recordType,
    recordVersion: ALBUM_IDENTITY_EVIDENCE_RECORD_VERSION,
    persistenceScope: 'research',
    payload,
    sourceEntityId: digestId(`${payload.provider}:entity`, payload.providerEntityId),
    sourceRecordId: digestId(`${payload.recordType}:source`, `${payload.provider}:${payload.providerEntityId}`),
    createdFromRecordIds: [],
    contributionIdentityId: null,
    knowledgeMode: 'current-research',
    effectivePeriod,
    observedAt: context.observedAt,
    collectedAt: context.collectedAt,
    revisionObservedAt: null,
    methodologyVersion: null,
    syntheticOnly: false,
    authorizationSnapshot: context.authorizationSnapshot,
    supersedesRecordId: null,
    recordState: 'original',
  });
}

export function buildIuAlbumIdentityEvidencePersistenceCandidates(
  context: AlbumIdentityEvidenceCaptureContext,
): readonly AlbumIdentityEvidencePersistenceRecord[] {
  assertIsoTimestamp(context.observedAt, 'album_identity_evidence_observed_at_invalid');
  assertIsoTimestamp(context.collectedAt, 'album_identity_evidence_collected_at_invalid');
  if (Date.parse(context.collectedAt) < Date.parse(context.observedAt)) {
    throw new Error('album_identity_evidence_collection_before_observation');
  }

  const records: AlbumIdentityEvidencePersistenceRecord[] = [];
  for (const evidence of Object.values(IU_RELEASE_REFERENCE_EVIDENCE)) {
    const ids = evidenceToReleaseIds(evidence.evidenceId);
    const payload: AlbumIdentityEvidencePersistencePayload = Object.freeze({
      recordType: 'release-reference-evidence',
      canonicalArtistId: 'iu',
      provider: evidence.providerId,
      providerEntityId: evidence.providerEntityId,
      fandexReleaseId: ids.releaseId,
      fandexReleaseFamilyId: ids.familyId,
      evidenceRefs: Object.freeze([evidence.evidenceId]),
      data: evidence,
    });
    records.push(wrapPayload(payload, context, evidence.providerFirstReleaseDate ?? evidence.retailProductReleaseDate));
  }

  for (const entry of IU_CANONICAL_RELEASE_REFERENCE_CATALOG_RESEARCH) {
    const release = entry.reference.release;
    if (!release.fandexReleaseId || !release.fandexReleaseFamilyId) continue;
    const payload: AlbumIdentityEvidencePersistencePayload = Object.freeze({
      recordType: 'canonical-release-reference',
      canonicalArtistId: 'iu',
      provider: 'fandex-research',
      providerEntityId: release.fandexReleaseId,
      fandexReleaseId: release.fandexReleaseId,
      fandexReleaseFamilyId: release.fandexReleaseFamilyId,
      evidenceRefs: frozenUnique(entry.evidenceRefs),
      data: entry,
    });
    records.push(wrapPayload(payload, context, release.releaseDate));
  }

  for (const mapping of IU_YES24_RETAIL_PRODUCT_RELEASE_MAPPINGS_RESEARCH) {
    const payload: AlbumIdentityEvidencePersistencePayload = Object.freeze({
      recordType: 'retail-product-release-mapping',
      canonicalArtistId: 'iu',
      provider: 'yes24',
      providerEntityId: mapping.retailerProductId,
      fandexReleaseId: mapping.fandexReleaseId,
      fandexReleaseFamilyId: mapping.fandexReleaseFamilyId,
      evidenceRefs: frozenUnique(mapping.evidenceRefs),
      data: mapping,
    });
    records.push(wrapPayload(payload, context, mapping.retailProductReleaseDate));
  }
  return Object.freeze(records);
}

export function evaluateAlbumIdentityEvidenceWriteGate(
  records: readonly AlbumIdentityEvidencePersistenceRecord[],
  authorization: AuthorizationSnapshot,
): AlbumIdentityEvidenceWriteGate {
  const blockers: string[] = [];
  if (records.length === 0) blockers.push('no-persistence-candidates');
  if (authorization.normalizedStorage !== 'allowed') blockers.push('normalized-storage-authorization-not-allowed');
  if (!['allowed', 'not-applicable'].includes(authorization.retention)) blockers.push('retention-authorization-not-allowed');
  if (records.some((record) => record.persistenceScope !== 'research')) blockers.push('non-research-record-present');
  if (records.some((record) => record.syntheticOnly)) blockers.push('synthetic-record-present');
  if (records.some((record) => record.recordVersion !== ALBUM_IDENTITY_EVIDENCE_RECORD_VERSION)) {
    blockers.push('record-version-mismatch');
  }
  return Object.freeze({
    state: blockers.length === 0 ? 'eligible-for-migration-and-write-review' : 'blocked',
    blockers: frozenUnique(blockers),
    candidateCount: records.length,
    existingDirectObservationTableCompatible: false,
    targetLogicalStore: 'album_identity_research_records',
    databaseWrites: 0,
    externalCalls: 0,
  });
}

export function buildAlbumIdentityResearchStoreMigrationSql(): string {
  return `CREATE TABLE fandex.album_identity_research_records (\n  record_id char(64) PRIMARY KEY CHECK (record_id ~ '^[0-9a-f]{64}$'),\n  record_version text NOT NULL CHECK (record_version = '${ALBUM_IDENTITY_EVIDENCE_RECORD_VERSION}'),\n  record_type text NOT NULL CHECK (record_type IN ('release-reference-evidence','canonical-release-reference','retail-product-release-mapping')),\n  provider text NOT NULL CHECK (provider IN ('musicbrainz','yes24','fandex-research')),\n  source_entity_id char(64) NOT NULL CHECK (source_entity_id ~ '^[0-9a-f]{64}$'),\n  source_record_id char(64) NOT NULL CHECK (source_record_id ~ '^[0-9a-f]{64}$'),\n  payload_digest char(64) NOT NULL CHECK (payload_digest ~ '^[0-9a-f]{64}$'),\n  fandex_artist_id text NOT NULL CHECK (length(trim(fandex_artist_id)) > 0),\n  fandex_release_id text NULL,\n  fandex_release_family_id text NULL,\n  effective_period text NULL,\n  record_state text NOT NULL CHECK (record_state IN ('original','revised','conflicting','rejected')),\n  supersedes_record_id char(64) NULL REFERENCES fandex.album_identity_research_records(record_id),\n  authorization_snapshot jsonb NOT NULL CHECK (octet_length(authorization_snapshot::text) <= 4096),\n  evidence_payload jsonb NOT NULL CHECK (octet_length(evidence_payload::text) <= 32768),\n  observed_at timestamptz NOT NULL,\n  collected_at timestamptz NOT NULL,\n  revision_observed_at timestamptz NULL,\n  created_at timestamptz NOT NULL DEFAULT now(),\n  UNIQUE (record_type, source_record_id, payload_digest),\n  CHECK (collected_at >= observed_at),\n  CHECK (supersedes_record_id IS NULL OR supersedes_record_id <> record_id)\n);`;
}

export function serializeAlbumIdentityPersistenceRecord(record: AlbumIdentityEvidencePersistenceRecord) {
  return Object.freeze({
    record_id: record.recordId,
    record_version: record.recordVersion,
    record_type: record.recordType,
    provider: record.payload.provider,
    source_entity_id: record.sourceEntityId,
    source_record_id: record.sourceRecordId,
    payload_digest: record.payloadDigest,
    fandex_artist_id: record.payload.canonicalArtistId,
    fandex_release_id: record.payload.fandexReleaseId,
    fandex_release_family_id: record.payload.fandexReleaseFamilyId,
    effective_period: record.effectivePeriod,
    record_state: record.recordState,
    supersedes_record_id: record.supersedesRecordId,
    authorization_snapshot: record.authorizationSnapshot,
    evidence_payload: record.payload,
    observed_at: record.observedAt,
    collected_at: record.collectedAt,
    revision_observed_at: record.revisionObservedAt,
  });
}
