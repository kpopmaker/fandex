import assert from 'node:assert/strict';
import test from 'node:test';

import {
  IU_CANONICAL_RELEASE_REFERENCE_CATALOG_RESEARCH,
  IU_CANONICAL_RELEASE_REFERENCE_CATALOG_RESEARCH_DESCRIPTOR,
  IU_MODERN_TIMES_MUSICBRAINZ_RELEASE_GROUP_FAMILY_EVIDENCE,
  IU_RELEASE_FAMILY_IDS,
  IU_RELEASE_IDS,
  IU_RELEASE_REFERENCE_EVIDENCE,
  IU_YES24_RETAIL_PRODUCT_RELEASE_MAPPINGS_RESEARCH,
  findIuYes24RetailProductReleaseMappingResearch,
  iuCanonicalReleaseIdentityReferencesResearch,
} from '../lib/alternative-evidence/iuCanonicalReleaseReferenceCatalogResearch';
import {
  proposeMusicBrainzReleaseIdentityMapping,
} from '../lib/alternative-evidence/musicReleaseIdentityMappingResearch';
import type { MusicBrainzReleaseGroupResearchObservation } from '../lib/alternative-evidence/musicbrainzAlbumCatalogResearch';

const IU_MUSICBRAINZ_ARTIST_ID = 'b9545342-1e6d-4dae-84ac-013374ad8d7c';

function observation(input: Readonly<{
  providerReleaseGroupId: string;
  title: string;
  firstReleaseDate: string;
  primaryType: string;
}>): MusicBrainzReleaseGroupResearchObservation {
  return Object.freeze({
    contractVersion: 'musicbrainz-album-catalog-research-v1',
    lifecycle: 'research',
    directProductContributionEligible: false,
    productScorePublished: false,
    productMethodologyFrozen: false,
    providerId: 'musicbrainz',
    canonicalArtistId: 'iu',
    providerArtistId: IU_MUSICBRAINZ_ARTIST_ID,
    providerReleaseGroupId: input.providerReleaseGroupId,
    title: input.title,
    firstReleaseDate: input.firstReleaseDate,
    primaryType: input.primaryType,
    secondaryTypes: Object.freeze([]),
    artistCredit: Object.freeze([Object.freeze({
      providerArtistId: IU_MUSICBRAINZ_ARTIST_ID,
      canonicalArtistMatch: true,
      providerArtistName: 'IU',
      creditedName: 'IU',
      joinPhrase: '',
    })]),
    canonicalArtistCreditState: 'sole-credit',
    providerObservationTime: null,
    collectedAt: '2026-09-16T10:48:21.000Z',
    sourceUrl: `https://musicbrainz.org/release-group/${input.providerReleaseGroupId}`,
    providerPayloadDigest: 'a'.repeat(64),
    catalogInclusionMeaning: 'observed-in-provider-artist-release-group-browse',
  });
}

test('catalog is research-only and makes no completeness or Product claim', () => {
  assert.equal(IU_CANONICAL_RELEASE_REFERENCE_CATALOG_RESEARCH_DESCRIPTOR.lifecycle, 'research');
  assert.equal(IU_CANONICAL_RELEASE_REFERENCE_CATALOG_RESEARCH_DESCRIPTOR.directProductContributionEligible, false);
  assert.equal(IU_CANONICAL_RELEASE_REFERENCE_CATALOG_RESEARCH_DESCRIPTOR.productScorePublished, false);
  assert.equal(IU_CANONICAL_RELEASE_REFERENCE_CATALOG_RESEARCH_DESCRIPTOR.productMethodologyFrozen, false);
  assert.equal(IU_CANONICAL_RELEASE_REFERENCE_CATALOG_RESEARCH_DESCRIPTOR.productionEligible, false);
  assert.equal(IU_CANONICAL_RELEASE_REFERENCE_CATALOG_RESEARCH_DESCRIPTOR.catalogCompletenessClaimAllowed, false);
});

test('catalog preserves four evidence-backed canonical release identities', () => {
  const references = iuCanonicalReleaseIdentityReferencesResearch();
  assert.equal(references.length, 4);
  assert.deepEqual(references.map((reference) => reference.release.fandexReleaseId), [
    IU_RELEASE_IDS.lilac,
    IU_RELEASE_IDS.lovePoem,
    IU_RELEASE_IDS.modernTimes,
    IU_RELEASE_IDS.modernTimesEpilogue,
  ]);
  for (const reference of references) {
    assert.equal(reference.release.resolutionState, 'resolved');
    assert.equal(reference.release.reviewState, 'provider-verified');
    assert.deepEqual(reference.release.artistIds, ['iu']);
  }
});

test('Modern Times original and Epilogue are distinct releases in one FANDEX release family', () => {
  const references = iuCanonicalReleaseIdentityReferencesResearch();
  const modernTimes = references.find((reference) => reference.release.fandexReleaseId === IU_RELEASE_IDS.modernTimes)!;
  const epilogue = references.find((reference) => reference.release.fandexReleaseId === IU_RELEASE_IDS.modernTimesEpilogue)!;
  assert.equal(modernTimes.release.fandexReleaseFamilyId, IU_RELEASE_FAMILY_IDS.modernTimes);
  assert.equal(epilogue.release.fandexReleaseFamilyId, IU_RELEASE_FAMILY_IDS.modernTimes);
  assert.notEqual(modernTimes.release.fandexReleaseId, epilogue.release.fandexReleaseId);
  assert.equal(modernTimes.release.releaseType, 'full-album');
  assert.equal(epilogue.release.releaseType, 'repackage');
});

test('MusicBrainz Modern Times release-group is retained as family-level ambiguous evidence', () => {
  assert.equal(IU_MODERN_TIMES_MUSICBRAINZ_RELEASE_GROUP_FAMILY_EVIDENCE.providerReleaseGroupId,
    '59c7150d-d3be-43ab-a089-0a1676950821');
  assert.equal(IU_MODERN_TIMES_MUSICBRAINZ_RELEASE_GROUP_FAMILY_EVIDENCE.resolutionState, 'ambiguous');
  assert.deepEqual(IU_MODERN_TIMES_MUSICBRAINZ_RELEASE_GROUP_FAMILY_EVIDENCE.candidateFandexReleaseIds, [
    IU_RELEASE_IDS.modernTimes,
    IU_RELEASE_IDS.modernTimesEpilogue,
  ]);
  assert.deepEqual(IU_MODERN_TIMES_MUSICBRAINZ_RELEASE_GROUP_FAMILY_EVIDENCE.blockers,
    ['provider-release-group-spans-multiple-fandex-releases']);
});

test('first release dates remain distinct from physical retailer product dates', () => {
  assert.equal(IU_RELEASE_REFERENCE_EVIDENCE.musicbrainzLilac.providerFirstReleaseDate, '2021-03-25');
  assert.equal(IU_RELEASE_REFERENCE_EVIDENCE.yes24LilacRandom.retailProductReleaseDate, '2021-03-26');
  assert.equal(IU_RELEASE_REFERENCE_EVIDENCE.musicbrainzLovePoem.providerFirstReleaseDate, '2019-11-18');
  assert.equal(IU_RELEASE_REFERENCE_EVIDENCE.yes24LovePoem.retailProductReleaseDate, '2019-11-19');
  assert.equal(IU_RELEASE_REFERENCE_EVIDENCE.musicbrainzModernTimesFamily.providerFirstReleaseDate, '2013-10-07');
  assert.equal(IU_RELEASE_REFERENCE_EVIDENCE.yes24ModernTimesNormal.retailProductReleaseDate, '2013-10-08');
});

test('YES24 real product ids map to release identity without pretending edition completeness', () => {
  assert.equal(IU_YES24_RETAIL_PRODUCT_RELEASE_MAPPINGS_RESEARCH.length, 6);
  assert.equal(findIuYes24RetailProductReleaseMappingResearch('82272556')?.fandexReleaseId, IU_RELEASE_IDS.lovePoem);
  assert.equal(findIuYes24RetailProductReleaseMappingResearch('11099872')?.fandexReleaseId, IU_RELEASE_IDS.modernTimes);
  assert.equal(findIuYes24RetailProductReleaseMappingResearch('11099877')?.fandexReleaseId, IU_RELEASE_IDS.modernTimes);
  assert.equal(findIuYes24RetailProductReleaseMappingResearch('11724509')?.fandexReleaseId, IU_RELEASE_IDS.modernTimesEpilogue);
  assert.equal(findIuYes24RetailProductReleaseMappingResearch('97829237')?.productRelationship, 'edition-child');
  assert.equal(findIuYes24RetailProductReleaseMappingResearch('97829198')?.productRelationship, 'unknown');
  assert.deepEqual(findIuYes24RetailProductReleaseMappingResearch('97829198')?.blockers,
    ['random-edition-selection-unresolved']);
});

test('safe explicit MusicBrainz release-group mapping resolves LILAC and Love poem', () => {
  const references = iuCanonicalReleaseIdentityReferencesResearch();
  const lilac = proposeMusicBrainzReleaseIdentityMapping(observation({
    providerReleaseGroupId: 'bdeb7a5c-c628-4346-b886-842fc86d7250',
    title: 'LILAC', firstReleaseDate: '2021-03-25', primaryType: 'Album',
  }), references);
  assert.equal(lilac.matchMode, 'explicit-provider-mapping');
  assert.equal(lilac.resolutionState, 'resolved');
  assert.equal(lilac.resolvedFandexReleaseId, IU_RELEASE_IDS.lilac);
  assert.equal(lilac.canonicalArtistScopeState, 'confirmed-in-scope');

  const lovePoem = proposeMusicBrainzReleaseIdentityMapping(observation({
    providerReleaseGroupId: '2c9d0799-ee08-4988-a096-689955210d22',
    title: 'Love poem', firstReleaseDate: '2019-11-18', primaryType: 'EP',
  }), references);
  assert.equal(lovePoem.resolutionState, 'resolved');
  assert.equal(lovePoem.resolvedFandexReleaseId, IU_RELEASE_IDS.lovePoem);
});

test('Modern Times release-group does not auto-resolve to one FANDEX release', () => {
  const result = proposeMusicBrainzReleaseIdentityMapping(observation({
    providerReleaseGroupId: '59c7150d-d3be-43ab-a089-0a1676950821',
    title: 'Modern Times', firstReleaseDate: '2013-10-07', primaryType: 'Album',
  }), iuCanonicalReleaseIdentityReferencesResearch());
  assert.equal(result.matchMode, 'title-type-date');
  assert.equal(result.resolutionState, 'candidate');
  assert.equal(result.resolvedFandexReleaseId, null);
  assert.deepEqual(result.candidateFandexReleaseIds, [IU_RELEASE_IDS.modernTimes]);
  assert.ok(result.blockers.includes('review-required'));
});

test('catalog does not contain score or production eligibility fields on entries', () => {
  for (const entry of IU_CANONICAL_RELEASE_REFERENCE_CATALOG_RESEARCH) {
    assert.ok(!('score' in entry));
    assert.ok(!('value' in entry));
  }
  for (const mapping of IU_YES24_RETAIL_PRODUCT_RELEASE_MAPPINGS_RESEARCH) {
    assert.equal(mapping.directProductContributionEligible, false);
    assert.equal(mapping.productScorePublished, false);
  }
});
