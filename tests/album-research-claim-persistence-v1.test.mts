import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALBUM_RESEARCH_CLAIM_PERSISTENCE_DESCRIPTOR,
  buildAlbumResearchClaimStoreMigrationSql,
  buildIuTheWinningReportedWeeklySalesClaim,
  serializeAlbumResearchClaim,
  validateAlbumResearchClaimStoredRow,
} from '../lib/alternative-evidence/albumResearchClaimPersistenceResearch';
import {
  IU_THE_WINNING_RELEASE_FAMILY_ID,
  IU_THE_WINNING_RELEASE_ID,
} from '../lib/alternative-evidence/iuTheWinningResearchEvidence';

test('claim persistence is a dedicated append-only research store', () => {
  assert.equal(ALBUM_RESEARCH_CLAIM_PERSISTENCE_DESCRIPTOR.lifecycle, 'research');
  assert.equal(ALBUM_RESEARCH_CLAIM_PERSISTENCE_DESCRIPTOR.appendOnly, true);
  assert.equal(ALBUM_RESEARCH_CLAIM_PERSISTENCE_DESCRIPTOR.directProductContributionEligible, false);
  assert.equal(ALBUM_RESEARCH_CLAIM_PERSISTENCE_DESCRIPTOR.productionEligible, false);
  assert.equal(ALBUM_RESEARCH_CLAIM_PERSISTENCE_DESCRIPTOR.table, 'fandex.album_research_claim_records');
});

test('The Winning 206128 claim preserves reported-provider weekly period semantics', () => {
  const claim = buildIuTheWinningReportedWeeklySalesClaim();
  assert.equal(claim.origin, 'news-reported-provider-value');
  assert.equal(claim.acquisitionProvider, 'manila-bulletin');
  assert.equal(claim.reportedProvider, 'hanteo-chart');
  assert.equal(claim.artistId, 'iu');
  assert.equal(claim.releaseId, IU_THE_WINNING_RELEASE_ID);
  assert.equal(claim.releaseFamilyCandidate?.label, IU_THE_WINNING_RELEASE_FAMILY_ID);
  assert.equal(claim.semantic, 'period-sale');
  assert.equal(claim.semanticState, 'clear');
  assert.equal(claim.definitionState, 'verified');
  assert.equal(claim.value, 206128);
  assert.equal(claim.valueKind, 'exact');
  assert.equal(claim.unit, 'physical-units');
  assert.equal(claim.providerPeriod, null);
  assert.equal(claim.reportedPeriod, '2024-02-19/2024-02-25');
  assert.equal(claim.territory, null);
  assert.ok(claim.blockers.includes('territory-unknown'));
  assert.equal(claim.researchOnly, true);
  assert.equal(claim.claimId.length, 64);
  assert.equal(claim.claimFamilyId.length, 64);
  assert.equal(claim.claimScopeId.length, 64);
});

test('serialized row round-trips claim identity and rejects tampering', () => {
  const row = serializeAlbumResearchClaim(buildIuTheWinningReportedWeeklySalesClaim());
  assert.deepEqual(validateAlbumResearchClaimStoredRow(row), []);
  assert.equal(row.release_id, IU_THE_WINNING_RELEASE_ID);
  assert.equal(row.release_family_id, IU_THE_WINNING_RELEASE_FAMILY_ID);
  assert.equal(row.value, 206128);
  assert.equal(row.unit, 'physical-units');
  const tampered = Object.freeze({ ...row, value: 1 });
  assert.ok(validateAlbumResearchClaimStoredRow(tampered).includes('value-mismatch'));
});

test('migration targets dedicated claim table and forbids zero sales sentinel', () => {
  const sql = buildAlbumResearchClaimStoreMigrationSql();
  assert.match(sql, /CREATE TABLE fandex\.album_research_claim_records/);
  assert.match(sql, /value IS NULL OR value > 0/);
  assert.match(sql, /research_only = true/);
  assert.match(sql, /collected_at >= observed_at/);
  assert.doesNotMatch(sql, /album_research_observation_records/);
  assert.doesNotMatch(sql, /album_identity_research_records/);
});
