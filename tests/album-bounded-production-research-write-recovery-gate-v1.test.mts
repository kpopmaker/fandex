import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_RECOVERY_COHORT,
  ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_RECOVERY_POLICY,
  validateAlbumBoundedProductionResearchWriteRecoveryReacquisition,
} from '../lib/server/ingestion/albumBoundedProductionResearchWriteRecoveryGate';

const observations = Object.freeze([
  Object.freeze({ observationId: '1'.repeat(64), providerId: 'circle-chart', providerSkuId: '8809954226502', fandexArtistId: 'straykids', fandexReleaseId: 'straykids-this-and-that', providerPeriod: 'day:20260831', semantic: 'period-sale', unit: 'physical-units', syntheticFixture: false, valueIsNonNegativeSafeInteger: true }),
  Object.freeze({ observationId: '2'.repeat(64), providerId: 'circle-chart', providerSkuId: '8809704435567', fandexArtistId: 'enhypen', fandexReleaseId: 'enhypen-the-sin-bliss', providerPeriod: 'day:20260831', semantic: 'period-sale', unit: 'physical-units', syntheticFixture: false, valueIsNonNegativeSafeInteger: true }),
  Object.freeze({ observationId: '3'.repeat(64), providerId: 'circle-chart', providerSkuId: '8800370675042', fandexArtistId: 'katseye', fandexReleaseId: 'katseye-wild', providerPeriod: 'day:20260831', semantic: 'period-sale', unit: 'physical-units', syntheticFixture: false, valueIsNonNegativeSafeInteger: true }),
]);

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    sourcePayloadDigest: ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_RECOVERY_COHORT.sourcePayloadDigest,
    status: 'accepted-reviewed-subset',
    acceptedObservationCount: 3,
    identityPendingRowCount: 47,
    nonIdentityRejectedRowCount: 0,
    observations,
    ...overrides,
  } as any;
}

test('accepts stable-ID reacquisition when payload and reviewed provider tuples are exact', () => {
  const result = validateAlbumBoundedProductionResearchWriteRecoveryReacquisition(validInput());
  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
  assert.equal(result.databaseWriteAuthorized, false);
  assert.deepEqual(result.stableObservationIds, ['1'.repeat(64), '2'.repeat(64), '3'.repeat(64)]);
});

test('does not depend on legacy timestamp-derived observation IDs', () => {
  assert.equal(ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_RECOVERY_COHORT.legacyObservationIdsStatus, 'invalid-time-dependent');
  const result = validateAlbumBoundedProductionResearchWriteRecoveryReacquisition(validInput({
    observations: observations.map((observation, index) => ({ ...observation, observationId: String(index + 7).repeat(64).slice(0, 64) })),
  }));
  assert.equal(result.valid, true);
});

test('rejects payload drift and reviewed tuple drift', () => {
  const result = validateAlbumBoundedProductionResearchWriteRecoveryReacquisition(validInput({
    sourcePayloadDigest: 'f'.repeat(64),
    observations: [{ ...observations[0], providerSkuId: 'unexpected' }, observations[1], observations[2]],
  }));
  assert.equal(result.valid, false);
  assert.ok(result.issues.includes('source-payload-digest-mismatch'));
  assert.ok(result.issues.includes('reviewed-provider-tuple-set-mismatch'));
});

test('rejects provider-data errors, synthetic rows and invalid quantities', () => {
  const result = validateAlbumBoundedProductionResearchWriteRecoveryReacquisition(validInput({
    nonIdentityRejectedRowCount: 1,
    observations: [{ ...observations[0], syntheticFixture: true, valueIsNonNegativeSafeInteger: false }, observations[1], observations[2]],
  }));
  assert.equal(result.valid, false);
  assert.ok(result.issues.includes('provider-data-rejection-present'));
  assert.ok(result.issues.includes('synthetic-observation-not-allowed'));
  assert.ok(result.issues.includes('quantity-invalid'));
});

test('prior single Provider request is consumed and a runtime-only credential is required', () => {
  assert.equal(ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_RECOVERY_POLICY.priorAuthorizationProviderRequestConsumed, true);
  assert.equal(ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_RECOVERY_POLICY.additionalProviderRequestAuthorized, false);
  assert.equal(ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_RECOVERY_POLICY.requiredDatabaseRole, 'fandex_runtime');
  assert.equal(ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_RECOVERY_POLICY.ownerSessionWriteAllowed, false);
  assert.equal(ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_RECOVERY_POLICY.migratorSessionWriteAllowed, false);
});
