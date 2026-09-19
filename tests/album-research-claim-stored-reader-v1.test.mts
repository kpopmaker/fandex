import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildIuTheWinningReportedWeeklySalesClaim,
  serializeAlbumResearchClaim,
  type AlbumResearchClaimStoredRow,
} from '../lib/alternative-evidence/albumResearchClaimPersistenceResearch';
import {
  ALBUM_RESEARCH_CLAIMS_FOR_RELEASE_SQL,
  ALBUM_RESEARCH_CLAIM_STORED_READER_RESEARCH_DESCRIPTOR,
  readStoredAlbumResearchClaimsAndBuildFeaturesResearch,
} from '../lib/alternative-evidence/albumResearchClaimStoredReaderResearch';
import { IU_THE_WINNING_RELEASE_ID } from '../lib/alternative-evidence/iuTheWinningResearchEvidence';

const dbRow = (): AlbumResearchClaimStoredRow => {
  const serialized = serializeAlbumResearchClaim(buildIuTheWinningReportedWeeklySalesClaim());
  return Object.freeze({
    ...serialized,
    value: String(serialized.value),
    observed_at: new Date(String(serialized.observed_at)),
    collected_at: new Date(String(serialized.collected_at)),
  });
};

test('reader is one-read research-only and keeps DB failure distinct from Missing', () => {
  assert.equal(ALBUM_RESEARCH_CLAIM_STORED_READER_RESEARCH_DESCRIPTOR.lifecycle, 'research');
  assert.equal(ALBUM_RESEARCH_CLAIM_STORED_READER_RESEARCH_DESCRIPTOR.maxDatabaseReadsPerCall, 1);
  assert.equal(ALBUM_RESEARCH_CLAIM_STORED_READER_RESEARCH_DESCRIPTOR.databaseReadFailureIsMissing, false);
  assert.equal(ALBUM_RESEARCH_CLAIM_STORED_READER_RESEARCH_DESCRIPTOR.databaseReadFailureIsZero, false);
  assert.equal(ALBUM_RESEARCH_CLAIM_STORED_READER_RESEARCH_DESCRIPTOR.productionEligible, false);
});

test('actual Postgres-like row becomes a blocked-news absolute shadow feature, not direct Product evidence', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const executor = {
    async query(sql: string, params: unknown[]) {
      calls.push({ sql, params });
      return { rows: [dbRow()] };
    },
  };
  const result = await readStoredAlbumResearchClaimsAndBuildFeaturesResearch(executor, IU_THE_WINNING_RELEASE_ID);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].params, [IU_THE_WINNING_RELEASE_ID]);
  assert.equal(result.claims.length, 1);
  assert.equal(result.features.length, 1);
  const feature = result.features[0];
  assert.equal(feature.featureKey, 'providerNativePeriodSales');
  assert.equal(feature.featureRole, 'absolute');
  assert.equal(feature.sourceClass, 'news-reported-provider');
  assert.equal(feature.value, 206128);
  assert.equal(feature.unit, 'physical-units');
  assert.equal(feature.releaseId, IU_THE_WINNING_RELEASE_ID);
  assert.equal(feature.eligibilityState, 'shadow-candidate');
  assert.equal(feature.proxyFallbackState, 'blocked');
  assert.ok(feature.blockers.includes('news-reported-not-direct-provider-period'));
  assert.ok(feature.blockers.includes('territory-unknown'));
  assert.deepEqual(result.effects, { databaseReads: 1, databaseWrites: 0, externalCalls: 0 });
});

test('tampered DB row fails closed instead of producing a feature', async () => {
  const row = Object.freeze({ ...dbRow(), value: '1' });
  const executor = { async query() { return { rows: [row] }; } };
  await assert.rejects(
    readStoredAlbumResearchClaimsAndBuildFeaturesResearch(executor, IU_THE_WINNING_RELEASE_ID),
    /album_research_claim_stored_invalid:value-mismatch/,
  );
});

test('DB transport failure is surfaced unchanged', async () => {
  const executor = { async query() { throw new Error('db-offline'); } };
  await assert.rejects(
    readStoredAlbumResearchClaimsAndBuildFeaturesResearch(executor, IU_THE_WINNING_RELEASE_ID),
    /db-offline/,
  );
});

test('reader SQL is parameterized, read-only, and research-filtered', () => {
  assert.match(ALBUM_RESEARCH_CLAIMS_FOR_RELEASE_SQL, /release_id = \$1/);
  assert.match(ALBUM_RESEARCH_CLAIMS_FOR_RELEASE_SQL, /research_only = true/);
  assert.doesNotMatch(ALBUM_RESEARCH_CLAIMS_FOR_RELEASE_SQL, /INSERT|UPDATE|DELETE/i);
});
