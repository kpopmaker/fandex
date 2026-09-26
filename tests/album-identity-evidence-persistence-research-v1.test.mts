import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALBUM_IDENTITY_EVIDENCE_PERSISTENCE_RESEARCH_DESCRIPTOR,
  ALBUM_IDENTITY_EVIDENCE_RECORD_VERSION,
  buildAlbumIdentityResearchStoreMigrationSql,
  buildIuAlbumIdentityEvidencePersistenceCandidates,
  evaluateAlbumIdentityEvidenceWriteGate,
  serializeAlbumIdentityPersistenceRecord,
} from '../lib/alternative-evidence/albumIdentityEvidencePersistenceResearch';
import { defaultAuthorizationSnapshot } from '../lib/alternative-evidence/persistenceContracts';

const CAPTURE = Object.freeze({
  observedAt: '2026-09-17T00:00:00.000Z',
  collectedAt: '2026-09-17T00:00:01.000Z',
});

const allowedAuthorization = Object.freeze({
  acquisition: 'allowed',
  automation: 'manual-only',
  rawStorage: 'not-applicable',
  normalizedStorage: 'allowed',
  retention: 'allowed',
  commercialUse: 'unknown',
  derivedPublication: 'unknown',
  rawRedistribution: 'not-applicable',
});

test('descriptor keeps identity persistence research-only and separate from direct observation store', () => {
  assert.equal(ALBUM_IDENTITY_EVIDENCE_PERSISTENCE_RESEARCH_DESCRIPTOR.lifecycle, 'research');
  assert.equal(ALBUM_IDENTITY_EVIDENCE_PERSISTENCE_RESEARCH_DESCRIPTOR.databaseWriteAllowed, false);
  assert.equal(ALBUM_IDENTITY_EVIDENCE_PERSISTENCE_RESEARCH_DESCRIPTOR.productionEligible, false);
  assert.equal(ALBUM_IDENTITY_EVIDENCE_PERSISTENCE_RESEARCH_DESCRIPTOR.existingDirectObservationTableCompatible, false);
  assert.equal(ALBUM_IDENTITY_EVIDENCE_PERSISTENCE_RESEARCH_DESCRIPTOR.requiredLogicalStore, 'album_identity_research_records');
  assert.equal(ALBUM_IDENTITY_EVIDENCE_PERSISTENCE_RESEARCH_DESCRIPTOR.rawPageStorageIncluded, false);
});

test('IU identity persistence bundle contains 9 evidence + 4 release + 6 retail mapping records', () => {
  const records = buildIuAlbumIdentityEvidencePersistenceCandidates({ ...CAPTURE, authorizationSnapshot: allowedAuthorization });
  assert.equal(records.length, 19);
  assert.equal(records.filter((r) => r.recordType === 'release-reference-evidence').length, 9);
  assert.equal(records.filter((r) => r.recordType === 'canonical-release-reference').length, 4);
  assert.equal(records.filter((r) => r.recordType === 'retail-product-release-mapping').length, 6);
  assert.ok(records.every((r) => r.persistenceScope === 'research'));
  assert.ok(records.every((r) => r.recordVersion === ALBUM_IDENTITY_EVIDENCE_RECORD_VERSION));
  assert.ok(records.every((r) => r.syntheticOnly === false));
  assert.equal(new Set(records.map((r) => r.recordId)).size, 19);
});

test('Modern Times family-level MusicBrainz evidence remains release-unresolved', () => {
  const records = buildIuAlbumIdentityEvidencePersistenceCandidates({ ...CAPTURE, authorizationSnapshot: allowedAuthorization });
  const modernFamilyEvidence = records.find((r) =>
    r.recordType === 'release-reference-evidence'
      && r.payload.provider === 'musicbrainz'
      && r.payload.providerEntityId === '59c7150d-d3be-43ab-a089-0a1676950821');
  assert.ok(modernFamilyEvidence);
  assert.equal(modernFamilyEvidence.payload.fandexReleaseId, null);
  assert.equal(modernFamilyEvidence.payload.fandexReleaseFamilyId, 'research:iu:release-family:modern-times');
});

test('retailer physical release date is preserved as effective period without replacing canonical release date', () => {
  const records = buildIuAlbumIdentityEvidencePersistenceCandidates({ ...CAPTURE, authorizationSnapshot: allowedAuthorization });
  const lilacProduct = records.find((r) =>
    r.recordType === 'retail-product-release-mapping' && r.payload.providerEntityId === '97829198');
  const lilacRelease = records.find((r) =>
    r.recordType === 'canonical-release-reference'
      && r.payload.fandexReleaseId === 'research:iu:release:lilac:2021-03-25');
  assert.ok(lilacProduct);
  assert.ok(lilacRelease);
  assert.equal(lilacProduct.effectivePeriod, '2021-03-26');
  assert.equal(lilacRelease.effectivePeriod, '2021-03-25');
});

test('default unknown authorization blocks write review even though candidates can be constructed', () => {
  const authorization = defaultAuthorizationSnapshot();
  const records = buildIuAlbumIdentityEvidencePersistenceCandidates({ ...CAPTURE, authorizationSnapshot: authorization });
  const gate = evaluateAlbumIdentityEvidenceWriteGate(records, authorization);
  assert.equal(gate.state, 'blocked');
  assert.ok(gate.blockers.includes('normalized-storage-authorization-not-allowed'));
  assert.ok(gate.blockers.includes('retention-authorization-not-allowed'));
  assert.equal(gate.databaseWrites, 0);
});

test('explicit normalized-storage and retention authorization only opens migration/write review, not a write', () => {
  const records = buildIuAlbumIdentityEvidencePersistenceCandidates({ ...CAPTURE, authorizationSnapshot: allowedAuthorization });
  const gate = evaluateAlbumIdentityEvidenceWriteGate(records, allowedAuthorization);
  assert.equal(gate.state, 'eligible-for-migration-and-write-review');
  assert.deepEqual(gate.blockers, []);
  assert.equal(gate.candidateCount, 19);
  assert.equal(gate.databaseWrites, 0);
  assert.equal(gate.externalCalls, 0);
});

test('serializer maps envelope to dedicated research-store columns', () => {
  const [record] = buildIuAlbumIdentityEvidencePersistenceCandidates({ ...CAPTURE, authorizationSnapshot: allowedAuthorization });
  const row = serializeAlbumIdentityPersistenceRecord(record);
  assert.match(row.record_id, /^[0-9a-f]{64}$/);
  assert.match(row.source_entity_id ?? '', /^[0-9a-f]{64}$/);
  assert.match(row.source_record_id ?? '', /^[0-9a-f]{64}$/);
  assert.equal(row.fandex_artist_id, 'iu');
  assert.equal(row.observed_at, CAPTURE.observedAt);
  assert.equal(row.collected_at, CAPTURE.collectedAt);
});

test('migration plan targets a new dedicated table and cannot mutate the existing direct-observation table', () => {
  const sql = buildAlbumIdentityResearchStoreMigrationSql();
  assert.match(sql, /CREATE TABLE fandex\.album_identity_research_records/);
  assert.match(sql, /musicbrainz/);
  assert.match(sql, /yes24/);
  assert.match(sql, /fandex-research/);
  assert.doesNotMatch(sql, /CREATE TABLE fandex\.album_research_observation_records/);
  assert.doesNotMatch(sql, /ALTER TABLE fandex\.album_research_observation_records/);
});

test('capture timestamps fail closed', () => {
  assert.throws(() => buildIuAlbumIdentityEvidencePersistenceCandidates({
    observedAt: 'not-a-date', collectedAt: CAPTURE.collectedAt, authorizationSnapshot: allowedAuthorization,
  }), /album_identity_evidence_observed_at_invalid/);
  assert.throws(() => buildIuAlbumIdentityEvidencePersistenceCandidates({
    observedAt: '2026-09-17T00:00:02.000Z', collectedAt: '2026-09-17T00:00:01.000Z', authorizationSnapshot: allowedAuthorization,
  }), /album_identity_evidence_collection_before_observation/);
});
