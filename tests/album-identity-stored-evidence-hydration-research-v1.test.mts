import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildIuAlbumIdentityEvidencePersistenceCandidates,
  serializeAlbumIdentityPersistenceRecord,
} from '../lib/alternative-evidence/albumIdentityEvidencePersistenceResearch';
import {
  ALBUM_IDENTITY_RESEARCH_ROWS_FOR_RETAIL_PRODUCT_SQL,
  ALBUM_IDENTITY_STORED_EVIDENCE_HYDRATION_RESEARCH_DESCRIPTOR,
  enrichRetailObservationWithStoredAlbumIdentityResearch,
  fromRetailObservationWithStoredAlbumIdentityResearch,
  hydrateAlbumIdentityResearchStoredRow,
  resolveRetailObservationIdentityFromStoredAlbumResearch,
  validateAlbumIdentityResearchStoredRow,
  type AlbumIdentityResearchStoredRow,
} from '../lib/alternative-evidence/albumIdentityStoredEvidenceHydrationResearch';
import { buildRetailObservation, RETAIL_OBSERVATION_CONTRACT_VERSION } from '../lib/alternative-evidence/retailObservation';
import { buildYes24ObservationEvidence } from '../lib/alternative-evidence/yes24RetailAdapter';

const CAPTURE = Object.freeze({
  observedAt: '2026-09-17T00:00:00.000Z',
  collectedAt: '2026-09-17T00:00:01.000Z',
});

const authorization = Object.freeze({
  acquisition: 'allowed',
  automation: 'manual-only',
  rawStorage: 'not-applicable',
  normalizedStorage: 'allowed',
  retention: 'allowed',
  commercialUse: 'unknown',
  derivedPublication: 'unknown',
  rawRedistribution: 'not-applicable',
});

const storedRows = (): readonly AlbumIdentityResearchStoredRow[] =>
  buildIuAlbumIdentityEvidencePersistenceCandidates({ ...CAPTURE, authorizationSnapshot: authorization })
    .map((record) => serializeAlbumIdentityPersistenceRecord(record)) as readonly AlbumIdentityResearchStoredRow[];

function retailObservation(productId: string, releaseId: string | null = null) {
  return buildRetailObservation({
    contractVersion: RETAIL_OBSERVATION_CONTRACT_VERSION,
    retailerId: 'yes24',
    retailerProductId: productId,
    productIdentity: Object.freeze({ retailerId: 'yes24', retailerProductId: productId, identityState: 'candidate' as const }),
    fandexArtistId: releaseId ? 'iu' : null,
    fandexReleaseId: releaseId,
    fandexReleaseFamilyId: null,
    retailerArtistText: 'IU',
    retailerTitle: 'fixture',
    categoryFamily: 'music',
    providerCategoryId: '003001011',
    categoryResolutionState: 'resolved',
    chartType: 'daily',
    semantic: 'retail-rank',
    rank: 3,
    movement: null,
    providerIndex: null,
    providerIndexName: null,
    providerPeriod: '2026-09-17',
    providerPeriodState: 'resolved',
    providerPublishedAt: '2026-09-17T00:00:00.000Z',
    observedAt: '2026-09-17T00:00:00.000Z',
    collectedAt: '2026-09-17T00:00:02.000Z',
    sourceType: 'yes24-official-api',
    missingState: 'observed',
    syntheticFixture: false,
  });
}

test('descriptor keeps Stored Evidence hydration research-only and production closed', () => {
  assert.equal(ALBUM_IDENTITY_STORED_EVIDENCE_HYDRATION_RESEARCH_DESCRIPTOR.lifecycle, 'research');
  assert.equal(ALBUM_IDENTITY_STORED_EVIDENCE_HYDRATION_RESEARCH_DESCRIPTOR.productionEligible, false);
  assert.equal(ALBUM_IDENTITY_STORED_EVIDENCE_HYDRATION_RESEARCH_DESCRIPTOR.directProductContributionEligible, false);
  assert.equal(ALBUM_IDENTITY_STORED_EVIDENCE_HYDRATION_RESEARCH_DESCRIPTOR.automaticProductionIdentityPromotionAllowed, false);
  assert.equal(ALBUM_IDENTITY_STORED_EVIDENCE_HYDRATION_RESEARCH_DESCRIPTOR.ambiguousProviderFamilyMayResolveSingleRelease, false);
});

test('all 19 deterministic Stored Evidence rows rehydrate with verified integrity', () => {
  const rows = storedRows();
  assert.equal(rows.length, 19);
  for (const row of rows) {
    assert.deepEqual(validateAlbumIdentityResearchStoredRow(row), { valid: true, issues: [] });
    assert.equal(hydrateAlbumIdentityResearchStoredRow(row).integrityState, 'verified');
  }
});

test('Postgres Date timestamps validate the same as serializer ISO strings', () => {
  const row = storedRows()[0];
  const pgStyle = Object.freeze({
    ...row,
    observed_at: new Date(CAPTURE.observedAt),
    collected_at: new Date(CAPTURE.collectedAt),
  });
  assert.deepEqual(validateAlbumIdentityResearchStoredRow(pgStyle), { valid: true, issues: [] });
});

test('payload digest tampering fails closed before identity enrichment', () => {
  const rows = storedRows();
  const tampered = rows.map((row, index) => index === 0
    ? Object.freeze({ ...row, payload_digest: '0'.repeat(64) })
    : row);
  const result = enrichRetailObservationWithStoredAlbumIdentityResearch(retailObservation('82272556'), tampered);
  assert.equal(result.resolution.state, 'blocked');
  assert.ok(result.resolution.blockers.includes('stored-evidence-integrity-invalid'));
  assert.equal(result.observation.fandexArtistId, null);
  assert.equal(result.observation.fandexReleaseId, null);
});

test('storage authorization tampering fails closed even when payload digest is unchanged', () => {
  const rows = storedRows();
  const tampered = rows.map((row, index) => index === 0
    ? Object.freeze({ ...row, authorization_snapshot: Object.freeze({ ...authorization, normalizedStorage: 'blocked' }) })
    : row);
  const validation = validateAlbumIdentityResearchStoredRow(tampered[0]);
  assert.equal(validation.valid, false);
  assert.ok(validation.issues.includes('research-storage-authorization-invalid'));
  const result = enrichRetailObservationWithStoredAlbumIdentityResearch(retailObservation('82272556'), tampered);
  assert.equal(result.resolution.state, 'blocked');
  assert.equal(result.observation.fandexReleaseId, null);
});

test('Love poem YES24 product resolves only through stored retail mapping plus canonical reference lineage', () => {
  const rows = storedRows();
  const observation = retailObservation('82272556');
  const resolution = resolveRetailObservationIdentityFromStoredAlbumResearch(observation, rows);
  assert.equal(resolution.state, 'resolved-research');
  assert.equal(resolution.artistId, 'iu');
  assert.equal(resolution.releaseId, 'research:iu:release:love-poem:2019-11-18');
  assert.equal(resolution.releaseFamilyId, 'research:iu:release-family:love-poem');
  assert.equal(resolution.evidenceRecordIds.length, 2);
  assert.ok(resolution.blockers.includes('stored-identity-research-only'));
});

test('canonical release reference is required; mapping alone cannot hydrate a release identity', () => {
  const rows = storedRows().filter((row) => !(
    row.record_type === 'canonical-release-reference'
    && row.fandex_release_id === 'research:iu:release:love-poem:2019-11-18'
  ));
  const resolution = resolveRetailObservationIdentityFromStoredAlbumResearch(retailObservation('82272556'), rows);
  assert.equal(resolution.state, 'blocked');
  assert.ok(resolution.blockers.includes('canonical-release-reference-not-stored-or-invalid'));
});

test('MusicBrainz Modern Times family evidence cannot resolve a single release without a product mapping', () => {
  const rows = storedRows().filter((row) => row.record_type !== 'retail-product-release-mapping');
  const result = enrichRetailObservationWithStoredAlbumIdentityResearch(retailObservation('11099872'), rows);
  assert.equal(result.resolution.state, 'unresolved');
  assert.equal(result.observation.fandexReleaseId, null);
  assert.equal(result.observation.fandexReleaseFamilyId, null);
});

test('preexisting conflicting release identity is rejected and cleared', () => {
  const wrong = 'research:iu:release:lilac:2021-03-25';
  const result = enrichRetailObservationWithStoredAlbumIdentityResearch(retailObservation('82272556', wrong), storedRows());
  assert.equal(result.resolution.state, 'blocked');
  assert.ok(result.resolution.blockers.includes('preexisting-release-identity-conflict'));
  assert.equal(result.observation.fandexArtistId, null);
  assert.equal(result.observation.fandexReleaseId, null);
});

test('Stored Evidence bridge produces research-only Canonical Feature Input with resolved research IDs', () => {
  const observation = retailObservation('82272556');
  const evidence = buildYes24ObservationEvidence(observation);
  const bridged = fromRetailObservationWithStoredAlbumIdentityResearch(observation, evidence, storedRows());
  assert.equal(bridged.resolution.state, 'resolved-research');
  assert.equal(bridged.features.length, 1);
  const feature = bridged.features[0];
  assert.equal(feature.featureKey, 'physicalRetailLevelProxy');
  assert.equal(feature.artistId, 'iu');
  assert.equal(feature.releaseId, 'research:iu:release:love-poem:2019-11-18');
  assert.equal(feature.releaseFamilyId, 'research:iu:release-family:love-poem');
  assert.equal(feature.releaseIdentityState, 'resolved');
  assert.equal(feature.eligibilityState, 'research-only');
  assert.ok(feature.blockers.includes('stored-identity-research-only'));
  assert.deepEqual(bridged.effects, { databaseReads: 0, databaseWrites: 0, externalCalls: 0 });
});

test('edition-level blockers remain visible without blocking safe release-level hydration', () => {
  const observation = retailObservation('11099872');
  const result = fromRetailObservationWithStoredAlbumIdentityResearch(
    observation,
    buildYes24ObservationEvidence(observation),
    storedRows(),
  );
  assert.equal(result.resolution.state, 'resolved-research');
  assert.equal(result.resolution.releaseId, 'research:iu:release:modern-times:2013-10-07');
  assert.ok(result.resolution.blockers.includes('canonical-edition-id-not-yet-modeled'));
  assert.ok(result.features[0].blockers.includes('canonical-edition-id-not-yet-modeled'));
  assert.equal(result.features[0].eligibilityState, 'research-only');
});

test('DB read template is parameterized and limited to mapping plus its canonical release reference', () => {
  assert.match(ALBUM_IDENTITY_RESEARCH_ROWS_FOR_RETAIL_PRODUCT_SQL, /provider = \$1/);
  assert.match(ALBUM_IDENTITY_RESEARCH_ROWS_FOR_RETAIL_PRODUCT_SQL, /providerEntityId' = \$2/);
  assert.match(ALBUM_IDENTITY_RESEARCH_ROWS_FOR_RETAIL_PRODUCT_SQL, /canonical-release-reference/);
  assert.doesNotMatch(ALBUM_IDENTITY_RESEARCH_ROWS_FOR_RETAIL_PRODUCT_SQL, /INSERT|UPDATE|DELETE/i);
});
