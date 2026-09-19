import assert from 'node:assert/strict';
import test from 'node:test';

import {
  confirmMusicBrainzReleaseIdentityMapping,
  MUSIC_RELEASE_IDENTITY_MAPPING_RESEARCH_DESCRIPTOR,
  proposeMusicBrainzReleaseIdentityMapping,
  releaseIdentityEnrichmentFromMapping,
  type FandexReleaseIdentityResearchReference,
} from '../lib/alternative-evidence/musicReleaseIdentityMappingResearch';
import { decodeMusicBrainzReleaseGroupPage } from '../lib/alternative-evidence/musicbrainzAlbumCatalogResearch';
import type { FandexReleaseIdentity, IdentityReviewState, IdentityResolutionState, ReleaseType } from '../lib/alternative-evidence/identityFoundation';

const IU_MUSICBRAINZ_ARTIST_ID = 'b9545342-1e6d-4dae-84ac-013374ad8d7c';
const LILAC_RELEASE_GROUP_ID = 'bdeb7a5c-c628-4346-b886-842fc86d7250';
const MODERN_TIMES_RELEASE_GROUP_ID = '59c7150d-d3be-43ab-a089-0a1676950821';
const LOVE_POEM_RELEASE_GROUP_ID = '2c9d0799-ee08-4988-a096-689955210d22';

function observation(input: Readonly<{
  id: string;
  title: string;
  date: string;
  primaryType: 'Album' | 'EP' | 'Single';
  collaboration?: boolean;
}>) {
  const artistCredit = input.collaboration
    ? [
      { name: 'Other Artist', joinphrase: ' & ', artist: { id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', name: 'Other Artist' } },
      { name: 'IU', joinphrase: '', artist: { id: IU_MUSICBRAINZ_ARTIST_ID, name: 'IU' } },
    ]
    : [{ name: 'IU', joinphrase: '', artist: { id: IU_MUSICBRAINZ_ARTIST_ID, name: 'IU' } }];
  return decodeMusicBrainzReleaseGroupPage({
    'release-group-count': 1,
    'release-group-offset': 0,
    'release-groups': [{
      id: input.id,
      title: input.title,
      'first-release-date': input.date,
      'primary-type': input.primaryType,
      'secondary-types': [],
      'artist-credit': artistCredit,
    }],
  }, {
    canonicalArtistId: 'iu',
    providerArtistId: IU_MUSICBRAINZ_ARTIST_ID,
    requestedLimit: 100,
    collectedAt: '2026-09-17T00:00:00.000Z',
  }).observations[0];
}

function reference(input: Readonly<{
  id: string;
  familyId?: string;
  title: string;
  date: string;
  releaseType: ReleaseType;
  aliases?: readonly string[];
  providerReleaseGroupId?: string;
  resolutionState?: IdentityResolutionState;
  reviewState?: IdentityReviewState;
}>): FandexReleaseIdentityResearchReference {
  const release: FandexReleaseIdentity = Object.freeze({
    fandexReleaseId: input.id,
    fandexReleaseFamilyId: input.familyId ?? `${input.id}-family`,
    canonicalTitle: input.title,
    artistIds: Object.freeze(['iu']),
    releaseDate: input.date,
    releaseType: input.releaseType,
    label: null,
    territory: 'KR',
    formatFamily: 'unknown',
    reviewState: input.reviewState ?? 'unreviewed',
    resolutionState: input.resolutionState ?? 'candidate',
  });
  return Object.freeze({
    release,
    aliases: Object.freeze([...(input.aliases ?? [])]),
    providerMappings: Object.freeze(input.providerReleaseGroupId ? [{
      providerId: 'musicbrainz' as const,
      providerReleaseGroupId: input.providerReleaseGroupId,
      evidenceRefs: Object.freeze([`musicbrainz:release-group:${input.providerReleaseGroupId}`]),
    }] : []),
    evidenceRefs: Object.freeze([`fandex-release-reference:${input.id}`]),
  });
}

test('descriptor is research-only and forbids automatic Product resolution semantics', () => {
  assert.equal(MUSIC_RELEASE_IDENTITY_MAPPING_RESEARCH_DESCRIPTOR.lifecycle, 'research');
  assert.equal(MUSIC_RELEASE_IDENTITY_MAPPING_RESEARCH_DESCRIPTOR.directProductContributionEligible, false);
  assert.equal(MUSIC_RELEASE_IDENTITY_MAPPING_RESEARCH_DESCRIPTOR.productScorePublished, false);
  assert.equal(MUSIC_RELEASE_IDENTITY_MAPPING_RESEARCH_DESCRIPTOR.productMethodologyFrozen, false);
  assert.equal(MUSIC_RELEASE_IDENTITY_MAPPING_RESEARCH_DESCRIPTOR.productionEligible, false);
  assert.equal(MUSIC_RELEASE_IDENTITY_MAPPING_RESEARCH_DESCRIPTOR.automaticResolutionAllowed, false);
});

test('real LILAC MusicBrainz identity becomes a candidate, never an automatic resolved release', () => {
  const proposal = proposeMusicBrainzReleaseIdentityMapping(observation({
    id: LILAC_RELEASE_GROUP_ID,
    title: 'LILAC',
    date: '2021-03-25',
    primaryType: 'Album',
  }), [reference({
    id: 'iu:lilac:2021',
    title: 'LILAC',
    date: '2021-03-25',
    releaseType: 'full-album',
  })]);
  assert.equal(proposal.matchMode, 'title-type-date');
  assert.equal(proposal.resolutionState, 'candidate');
  assert.equal(proposal.reviewState, 'machine-candidate');
  assert.deepEqual(proposal.candidateFandexReleaseIds, ['iu:lilac:2021']);
  assert.equal(proposal.resolvedFandexReleaseId, null);
  assert.ok(proposal.blockers.includes('review-required'));
});

test('real Modern Times identity accepts Album to full-album type compatibility without changing provider semantics', () => {
  const proposal = proposeMusicBrainzReleaseIdentityMapping(observation({
    id: MODERN_TIMES_RELEASE_GROUP_ID,
    title: 'Modern Times',
    date: '2013-10-07',
    primaryType: 'Album',
  }), [reference({
    id: 'iu:modern-times:2013',
    title: 'Modern Times',
    date: '2013-10-07',
    releaseType: 'full-album',
  })]);
  assert.equal(proposal.matchMode, 'title-type-date');
  assert.equal(proposal.resolutionState, 'candidate');
  assert.equal(proposal.observedPrimaryType, 'Album');
});

test('real Love poem EP identity maps to an EP candidate', () => {
  const proposal = proposeMusicBrainzReleaseIdentityMapping(observation({
    id: LOVE_POEM_RELEASE_GROUP_ID,
    title: 'Love poem',
    date: '2019-11-18',
    primaryType: 'EP',
  }), [reference({
    id: 'iu:love-poem:2019',
    title: 'Love Poem',
    aliases: ['Love poem'],
    date: '2019-11-18',
    releaseType: 'ep',
  })]);
  assert.equal(proposal.matchMode, 'title-type-date');
  assert.deepEqual(proposal.candidateFandexReleaseIds, ['iu:love-poem:2019']);
});

test('same normalized title with more than one plausible release remains ambiguous', () => {
  const obs = observation({
    id: '11111111-2222-4333-8444-555555555555',
    title: 'Same Title',
    date: '2024-01-01',
    primaryType: 'EP',
  });
  const proposal = proposeMusicBrainzReleaseIdentityMapping(obs, [
    reference({ id: 'iu:same-title:a', title: 'Same Title', date: '2024-01-01', releaseType: 'ep' }),
    reference({ id: 'iu:same-title:b', title: 'Same Title', date: '2024-01-01', releaseType: 'mini-album' }),
  ]);
  assert.equal(proposal.resolutionState, 'ambiguous');
  assert.ok(proposal.blockers.includes('release-ambiguous'));
  assert.equal(proposal.resolvedFandexReleaseId, null);
});

test('type conflict fails closed instead of coercing Album to EP', () => {
  const proposal = proposeMusicBrainzReleaseIdentityMapping(observation({
    id: '22222222-3333-4444-8555-666666666666',
    title: 'Type Conflict',
    date: '2024-01-01',
    primaryType: 'Album',
  }), [reference({
    id: 'iu:type-conflict',
    title: 'Type Conflict',
    date: '2024-01-01',
    releaseType: 'ep',
  })]);
  assert.equal(proposal.resolutionState, 'conflicting');
  assert.ok(proposal.blockers.includes('release-type-conflict'));
});

test('multi-artist credit cannot auto-resolve even when an explicit provider mapping exists', () => {
  const ref = reference({
    id: 'iu:collaboration',
    title: 'Collaboration',
    date: '2024-01-01',
    releaseType: 'single',
    providerReleaseGroupId: '33333333-4444-4555-8666-777777777777',
    resolutionState: 'resolved',
    reviewState: 'human-reviewed',
  });
  const proposal = proposeMusicBrainzReleaseIdentityMapping(observation({
    id: '33333333-4444-4555-8666-777777777777',
    title: 'Collaboration',
    date: '2024-01-01',
    primaryType: 'Single',
    collaboration: true,
  }), [ref]);
  assert.equal(proposal.matchMode, 'explicit-provider-mapping');
  assert.equal(proposal.resolutionState, 'candidate');
  assert.equal(proposal.resolvedFandexReleaseId, null);
  assert.ok(proposal.blockers.includes('multi-artist-credit-review-required'));
});

test('review confirmation can resolve a candidate only with explicit scope decision and evidence', () => {
  const ref = reference({
    id: 'iu:lilac:2021',
    title: 'LILAC',
    date: '2021-03-25',
    releaseType: 'full-album',
  });
  const proposal = proposeMusicBrainzReleaseIdentityMapping(observation({
    id: LILAC_RELEASE_GROUP_ID,
    title: 'LILAC',
    date: '2021-03-25',
    primaryType: 'Album',
  }), [ref]);
  assert.throws(() => confirmMusicBrainzReleaseIdentityMapping(proposal, ref, {
    reviewState: 'human-reviewed',
    canonicalArtistScopeDecision: 'confirmed-in-scope',
    evidenceRefs: [],
  }), /mapping_confirmation_evidence_required/);

  const resolved = confirmMusicBrainzReleaseIdentityMapping(proposal, ref, {
    reviewState: 'human-reviewed',
    canonicalArtistScopeDecision: 'confirmed-in-scope',
    evidenceRefs: ['review:iu-lilac-release-identity'],
  });
  assert.equal(resolved.resolutionState, 'resolved');
  assert.equal(resolved.canonicalArtistScopeState, 'confirmed-in-scope');
  assert.equal(resolved.resolvedFandexReleaseId, 'iu:lilac:2021');
  assert.deepEqual(resolved.blockers, []);

  const enrichment = releaseIdentityEnrichmentFromMapping(resolved);
  assert.deepEqual(enrichment, {
    artistId: 'iu',
    artistState: 'resolved',
    releaseId: 'iu:lilac:2021',
    releaseState: 'resolved',
    releaseFamilyId: 'iu:lilac:2021-family',
  });
});

test('confirmed out-of-scope mapping remains rejected and cannot enrich Product identity', () => {
  const ref = reference({
    id: 'iu:collaboration',
    title: 'Collaboration',
    date: '2024-01-01',
    releaseType: 'single',
  });
  const proposal = proposeMusicBrainzReleaseIdentityMapping(observation({
    id: '44444444-5555-4666-8777-888888888888',
    title: 'Collaboration',
    date: '2024-01-01',
    primaryType: 'Single',
    collaboration: true,
  }), [ref]);
  const rejected = confirmMusicBrainzReleaseIdentityMapping(proposal, ref, {
    reviewState: 'human-reviewed',
    canonicalArtistScopeDecision: 'confirmed-out-of-scope',
    evidenceRefs: ['review:collaboration-out-of-scope'],
  });
  assert.equal(rejected.resolutionState, 'rejected');
  assert.equal(rejected.resolvedFandexReleaseId, null);
  assert.equal(releaseIdentityEnrichmentFromMapping(rejected).releaseId, null);
});
