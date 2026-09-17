import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildIuPiecesIdentityPersistenceRecords,
  IU_PIECES_CANONICAL_REFERENCE_ENTRY_RESEARCH,
  IU_PIECES_MUSICBRAINZ_EVIDENCE,
  IU_PIECES_RELEASE_FAMILY_ID,
  IU_PIECES_RELEASE_ID,
  IU_PIECES_RESEARCH_EVIDENCE_DESCRIPTOR,
} from '../lib/alternative-evidence/iuPiecesResearchEvidence';
import { evaluateCanonicalAlbumReleaseEligibility } from '../lib/alternative-evidence/albumReleaseEligibilityResearch';

const authorizationSnapshot = Object.freeze({
  acquisition: 'allowed' as const,
  automation: 'not-applicable' as const,
  rawStorage: 'not-applicable' as const,
  normalizedStorage: 'allowed' as const,
  retention: 'allowed' as const,
  commercialUse: 'not-applicable' as const,
  derivedPublication: 'not-applicable' as const,
  rawRedistribution: 'not-applicable' as const,
});

test('Pieces is research identity evidence, not Product evidence', () => {
  assert.equal(IU_PIECES_RESEARCH_EVIDENCE_DESCRIPTOR.lifecycle, 'research');
  assert.equal(IU_PIECES_RESEARCH_EVIDENCE_DESCRIPTOR.productionEligible, false);
  assert.equal(IU_PIECES_RESEARCH_EVIDENCE_DESCRIPTOR.baselineSelectionWithoutComparableObservationAllowed, false);
});

test('MusicBrainz evidence maps Pieces EP to a distinct FANDEX mini-album family', () => {
  assert.equal(IU_PIECES_MUSICBRAINZ_EVIDENCE.observedReleaseType, 'EP');
  assert.equal(IU_PIECES_MUSICBRAINZ_EVIDENCE.providerFirstReleaseDate, '2021-12-29');
  const release = IU_PIECES_CANONICAL_REFERENCE_ENTRY_RESEARCH.reference.release;
  assert.equal(release.fandexReleaseId, IU_PIECES_RELEASE_ID);
  assert.equal(release.fandexReleaseFamilyId, IU_PIECES_RELEASE_FAMILY_ID);
  assert.equal(release.releaseType, 'mini-album');
  assert.equal(release.releaseDate, '2021-12-29');
  assert.equal(evaluateCanonicalAlbumReleaseEligibility(release, 'iu').state, 'eligible');
});

test('Pieces identity persistence emits provider evidence plus canonical reference records', () => {
  const records = buildIuPiecesIdentityPersistenceRecords({
    observedAt: '2026-09-18T00:00:00.000Z',
    collectedAt: '2026-09-18T00:00:00.000Z',
    authorizationSnapshot,
  });
  assert.equal(records.length, 2);
  assert.deepEqual(records.map((record) => record.payload.recordType), [
    'release-reference-evidence',
    'canonical-release-reference',
  ]);
  assert.ok(records.every((record) => record.payload.fandexReleaseId === IU_PIECES_RELEASE_ID));
  assert.ok(records.every((record) => record.effectivePeriod === '2021-12-29'));
  assert.ok(records.every((record) => /^[0-9a-f]{64}$/.test(record.recordId)));
});
