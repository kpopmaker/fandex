import assert from 'node:assert/strict';
import test from 'node:test';

import { decodeMusicBrainzReleaseGroupPage } from '../lib/alternative-evidence/musicbrainzAlbumCatalogResearch';
import {
  evaluateMusicReleaseEligibilityResearch,
  MUSIC_RELEASE_ELIGIBILITY_RESEARCH_CONTRACT_VERSION,
  MUSIC_RELEASE_ELIGIBILITY_RESEARCH_DESCRIPTOR,
} from '../lib/alternative-evidence/musicReleaseEligibilityResearch';

const IU_MUSICBRAINZ_ARTIST_ID = 'b9545342-1e6d-4dae-84ac-013374ad8d7c';
const OTHER_ARTIST_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

function credit(artistId: string, name: string, joinphrase = '') {
  return {
    name,
    joinphrase,
    artist: { id: artistId, name },
  };
}

const providerFixture = Object.freeze({
  'release-group-count': 6,
  'release-group-offset': 0,
  'release-groups': [
    {
      id: '00000000-0000-4000-8000-000000000001',
      title: 'Palette',
      'first-release-date': '2017-04-21',
      'primary-type': 'Album',
      'secondary-types': [],
      'artist-credit': [credit(IU_MUSICBRAINZ_ARTIST_ID, 'IU')],
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      title: 'Love poem',
      'first-release-date': '2019-11-18',
      'primary-type': 'EP',
      'secondary-types': [],
      'artist-credit': [credit(IU_MUSICBRAINZ_ARTIST_ID, 'IU')],
    },
    {
      id: '00000000-0000-4000-8000-000000000003',
      title: 'Love poem',
      'first-release-date': '2019-11-01',
      'primary-type': 'Single',
      'secondary-types': [],
      'artist-credit': [credit(IU_MUSICBRAINZ_ARTIST_ID, 'IU')],
    },
    {
      id: '00000000-0000-4000-8000-000000000004',
      title: 'Compilation Album Fixture',
      'first-release-date': '2020-01-01',
      'primary-type': 'Album',
      'secondary-types': ['Compilation'],
      'artist-credit': [credit(IU_MUSICBRAINZ_ARTIST_ID, 'IU')],
    },
    {
      id: '00000000-0000-4000-8000-000000000005',
      title: 'Soundtrack EP Fixture',
      'first-release-date': '2021-01-01',
      'primary-type': 'EP',
      'secondary-types': ['Soundtrack'],
      'artist-credit': [
        credit(OTHER_ARTIST_ID, 'Other Artist', ' & '),
        credit(IU_MUSICBRAINZ_ARTIST_ID, 'IU'),
      ],
    },
    {
      id: '00000000-0000-4000-8000-000000000006',
      title: 'Palette',
      'first-release-date': '2022-01-01',
      'primary-type': 'Album',
      'secondary-types': [],
      'artist-credit': [
        credit(IU_MUSICBRAINZ_ARTIST_ID, 'IU', ' & '),
        credit(OTHER_ARTIST_ID, 'Other Artist'),
      ],
    },
  ],
});

function observations() {
  return decodeMusicBrainzReleaseGroupPage(providerFixture, {
    canonicalArtistId: 'iu',
    providerArtistId: IU_MUSICBRAINZ_ARTIST_ID,
    requestedLimit: 100,
    collectedAt: '2026-09-16T10:48:21.000Z',
  }).observations;
}

test('eligibility evaluator is research-only and does not select a production rule', () => {
  assert.equal(MUSIC_RELEASE_ELIGIBILITY_RESEARCH_DESCRIPTOR.lifecycle, 'research');
  assert.equal(MUSIC_RELEASE_ELIGIBILITY_RESEARCH_DESCRIPTOR.directProductContributionEligible, false);
  assert.equal(MUSIC_RELEASE_ELIGIBILITY_RESEARCH_DESCRIPTOR.productScorePublished, false);
  assert.equal(MUSIC_RELEASE_ELIGIBILITY_RESEARCH_DESCRIPTOR.productMethodologyFrozen, false);
  assert.equal(MUSIC_RELEASE_ELIGIBILITY_RESEARCH_DESCRIPTOR.productionRuleSelected, false);
});

test('parallel scenarios expose eligibility sensitivity without choosing a winner', () => {
  const result = evaluateMusicReleaseEligibilityResearch(observations());
  assert.equal(result.contractVersion, MUSIC_RELEASE_ELIGIBILITY_RESEARCH_CONTRACT_VERSION);
  assert.equal(result.totalObservedReleaseGroups, 6);
  assert.equal(result.productionRuleSelected, false);

  const counts = Object.fromEntries(result.scenarioSummaries.map((item) => [item.scenarioId, item.includedCount]));
  assert.deepEqual(counts, {
    'primary-album-only': 3,
    'primary-album-or-ep': 5,
    'album-or-ep-non-compilation': 4,
    'album-or-ep-non-compilation-sole-credit': 2,
  });
});

test('provider-native type and credit distributions are preserved descriptively', () => {
  const result = evaluateMusicReleaseEligibilityResearch(observations());
  assert.deepEqual(result.primaryTypeCounts, { Album: 3, EP: 2, Single: 1 });
  assert.deepEqual(result.secondaryTypeCounts, { Compilation: 1, Soundtrack: 1 });
  assert.deepEqual(result.creditStateCounts, { 'sole-credit': 4, 'multi-artist-credit': 2 });
});

test('compilation and multi-artist exclusions are explicit reasons, not hidden filters', () => {
  const result = evaluateMusicReleaseEligibilityResearch(observations());
  const compilation = result.rows.find((row) => row.providerReleaseGroupId.endsWith('0004'));
  const multiCredit = result.rows.find((row) => row.providerReleaseGroupId.endsWith('0005'));
  assert.ok(compilation);
  assert.ok(multiCredit);

  const compilationDecision = compilation.decisions.find(
    (item) => item.scenarioId === 'album-or-ep-non-compilation',
  );
  assert.equal(compilationDecision?.included, false);
  assert.ok(compilationDecision?.reasons.includes('secondary-type-compilation'));

  const soleDecision = multiCredit.decisions.find(
    (item) => item.scenarioId === 'album-or-ep-non-compilation-sole-credit',
  );
  assert.equal(soleDecision?.included, false);
  assert.ok(soleDecision?.reasons.includes('canonical-artist-credit-multi-artist-credit'));
});

test('same normalized title is surfaced as a collision but never auto-deduplicated', () => {
  const result = evaluateMusicReleaseEligibilityResearch(observations());
  const paletteCollision = result.exactNormalizedTitleCollisionGroups.find(
    (group) => group.exactNormalizedTitleKey === 'palette',
  );
  assert.ok(paletteCollision);
  assert.equal(paletteCollision.providerReleaseGroupIds.length, 2);
  assert.deepEqual(paletteCollision.primaryTypes, ['Album', 'Album']);
  assert.equal(result.totalObservedReleaseGroups, 6);
});

test('unresolved blockers remain explicit and score transformation is not inferred', () => {
  const result = evaluateMusicReleaseEligibilityResearch(observations());
  assert.ok(result.unresolvedBlockers.includes('primary-type-scope-not-frozen'));
  assert.ok(result.unresolvedBlockers.includes('release-family-deduplication-not-defined'));
  assert.ok(result.unresolvedBlockers.includes('market-scope-not-observed-at-release-group-level'));
  assert.ok(result.unresolvedBlockers.includes('canonical-release-to-musicAlbumPoint-transform-not-defined'));
  assert.equal('score' in result, false);
  assert.equal('musicAlbumPoint' in result, false);
});
