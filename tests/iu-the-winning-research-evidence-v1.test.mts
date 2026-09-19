import test from 'node:test';
import assert from 'node:assert/strict';

import {
  IU_THE_WINNING_CANONICAL_REFERENCE_ENTRY_RESEARCH,
  IU_THE_WINNING_MUSICBRAINZ_RELEASE_GROUP_ID,
  IU_THE_WINNING_RELEASE_FAMILY_ID,
  IU_THE_WINNING_RELEASE_ID,
  IU_THE_WINNING_RELEASE_REFERENCE_RESEARCH,
  IU_THE_WINNING_REPORTED_WEEKLY_SALES_RESEARCH,
  IU_THE_WINNING_RESEARCH_EVIDENCE_DESCRIPTOR,
  buildIuTheWinningIdentityPersistenceRecords,
} from '../lib/alternative-evidence/iuTheWinningResearchEvidence';
import { serializeAlbumIdentityPersistenceRecord } from '../lib/alternative-evidence/albumIdentityEvidencePersistenceResearch';
import {
  validateAlbumIdentityResearchStoredRow,
  type AlbumIdentityResearchStoredRow,
} from '../lib/alternative-evidence/albumIdentityStoredEvidenceHydrationResearch';
import { proposeMusicBrainzReleaseIdentityMapping } from '../lib/alternative-evidence/musicReleaseIdentityMappingResearch';
import type { MusicBrainzReleaseGroupResearchObservation } from '../lib/alternative-evidence/musicbrainzAlbumCatalogResearch';

const AUTH = Object.freeze({
  acquisition: 'allowed' as const,
  automation: 'manual-only' as const,
  rawStorage: 'not-applicable' as const,
  normalizedStorage: 'allowed' as const,
  retention: 'allowed' as const,
  commercialUse: 'unknown' as const,
  derivedPublication: 'unknown' as const,
  rawRedistribution: 'not-applicable' as const,
});

const observation: MusicBrainzReleaseGroupResearchObservation = Object.freeze({
  contractVersion: 'musicbrainz-album-catalog-research-v1',
  lifecycle: 'research',
  directProductContributionEligible: false,
  productScorePublished: false,
  productMethodologyFrozen: false,
  providerId: 'musicbrainz',
  canonicalArtistId: 'iu',
  providerArtistId: 'b9545342-1e6d-4dae-84ac-013374ad8d7c',
  providerReleaseGroupId: IU_THE_WINNING_MUSICBRAINZ_RELEASE_GROUP_ID,
  title: 'The Winning',
  firstReleaseDate: '2024-02-20',
  primaryType: 'EP',
  secondaryTypes: Object.freeze([]),
  artistCredit: Object.freeze([Object.freeze({
    providerArtistId: 'b9545342-1e6d-4dae-84ac-013374ad8d7c',
    canonicalArtistMatch: true,
    providerArtistName: 'IU',
    creditedName: 'IU',
    joinPhrase: '',
  })]),
  canonicalArtistCreditState: 'sole-credit',
  providerObservationTime: null,
  collectedAt: '2026-09-16T10:48:22.145Z',
  sourceUrl: `https://musicbrainz.org/release-group/${IU_THE_WINNING_MUSICBRAINZ_RELEASE_GROUP_ID}`,
  providerPayloadDigest: '7fd250f29cd727473ec161ec467ad1ed46eed4b8e0e6d6328702e52e5934dc80',
  catalogInclusionMeaning: 'observed-in-provider-artist-release-group-browse',
});

test('The Winning research evidence stays Product-closed', () => {
  assert.equal(IU_THE_WINNING_RESEARCH_EVIDENCE_DESCRIPTOR.lifecycle, 'research');
  assert.equal(IU_THE_WINNING_RESEARCH_EVIDENCE_DESCRIPTOR.directProductContributionEligible, false);
  assert.equal(IU_THE_WINNING_RESEARCH_EVIDENCE_DESCRIPTOR.productionEligible, false);
  assert.equal(IU_THE_WINNING_RESEARCH_EVIDENCE_DESCRIPTOR.reportedWeeklySalesDirectProviderObservation, false);
});

test('MusicBrainz exact release-group resolves to the human-reviewed The Winning research identity', () => {
  assert.equal(IU_THE_WINNING_RELEASE_REFERENCE_RESEARCH.release.releaseType, 'mini-album');
  assert.equal(IU_THE_WINNING_RELEASE_REFERENCE_RESEARCH.release.label, null);
  assert.equal(IU_THE_WINNING_RELEASE_REFERENCE_RESEARCH.release.territory, null);
  const result = proposeMusicBrainzReleaseIdentityMapping(observation, [IU_THE_WINNING_RELEASE_REFERENCE_RESEARCH]);
  assert.equal(result.matchMode, 'explicit-provider-mapping');
  assert.equal(result.resolutionState, 'resolved');
  assert.equal(result.resolvedFandexReleaseId, IU_THE_WINNING_RELEASE_ID);
  assert.equal(result.resolvedFandexReleaseFamilyId, IU_THE_WINNING_RELEASE_FAMILY_ID);
});

test('reported Hanteo weekly sales preserves calendar-week semantics without becoming direct provider evidence', () => {
  const evidence = IU_THE_WINNING_REPORTED_WEEKLY_SALES_RESEARCH;
  assert.equal(evidence.chartPeriod, '2024-02-19/2024-02-25');
  assert.equal(evidence.chartRank, 3);
  assert.equal(evidence.reportedSalesValue, 206128);
  assert.equal(evidence.reportedSalesUnit, 'physical-units');
  assert.equal(evidence.acquisitionOrigin, 'news-reported-provider-value');
  assert.equal(evidence.directProviderObservation, false);
  assert.equal(evidence.initialChodongClaimAllowed, false);
  assert.equal(evidence.cumulativeSalesClaimAllowed, false);
  assert.match(evidence.providerChartUrl, /2024-W08$/);
  assert.equal(evidence.evidenceDigest.length, 64);
});

test('The Winning canonical reference is evidence-linked and research scoped', () => {
  assert.equal(IU_THE_WINNING_CANONICAL_REFERENCE_ENTRY_RESEARCH.reference.release.fandexReleaseId,
    IU_THE_WINNING_RELEASE_ID);
  assert.deepEqual(IU_THE_WINNING_CANONICAL_REFERENCE_ENTRY_RESEARCH.evidenceRefs,
    [`web:musicbrainz:release-group:${IU_THE_WINNING_MUSICBRAINZ_RELEASE_GROUP_ID}`]);
});

test('two deterministic The Winning identity rows serialize through the existing Stored Evidence contract', () => {
  const records = buildIuTheWinningIdentityPersistenceRecords({
    observedAt: '2026-09-16T10:48:22.145Z',
    collectedAt: '2026-09-16T10:48:22.145Z',
    authorizationSnapshot: AUTH,
  });
  assert.equal(records.length, 2);
  assert.equal(new Set(records.map((record) => record.recordId)).size, 2);
  const rows = records.map((record) => serializeAlbumIdentityPersistenceRecord(record));
  assert.deepEqual(rows.map((row) => row.record_type).sort(),
    ['canonical-release-reference', 'release-reference-evidence']);
  for (const row of rows) {
    assert.equal(row.fandex_release_id, IU_THE_WINNING_RELEASE_ID);
    assert.equal(row.fandex_release_family_id, IU_THE_WINNING_RELEASE_FAMILY_ID);
    assert.deepEqual(
      validateAlbumIdentityResearchStoredRow(row as AlbumIdentityResearchStoredRow),
      { valid: true, issues: [] },
    );
  }
});
