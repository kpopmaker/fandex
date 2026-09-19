import type {
  FandexReleaseIdentity,
  IdentityResolutionState,
  IdentityReviewState,
  ProductRelationship,
} from './identityFoundation';
import type {
  FandexReleaseIdentityResearchReference,
  MusicReleaseProviderMappingReference,
} from './musicReleaseIdentityMappingResearch';

export const IU_CANONICAL_RELEASE_REFERENCE_CATALOG_RESEARCH_CONTRACT_VERSION =
  'iu-canonical-release-reference-catalog-research-v1' as const;

export const IU_CANONICAL_RELEASE_REFERENCE_CATALOG_RESEARCH_DESCRIPTOR = Object.freeze({
  contractVersion: IU_CANONICAL_RELEASE_REFERENCE_CATALOG_RESEARCH_CONTRACT_VERSION,
  lifecycle: 'research' as const,
  canonicalArtistId: 'iu' as const,
  directProductContributionEligible: false as const,
  productScorePublished: false as const,
  productMethodologyFrozen: false as const,
  productionEligible: false as const,
  catalogCompletenessClaimAllowed: false as const,
  physicalRetailDateMayDifferFromFirstReleaseDate: true as const,
  semantics: 'evidence-backed-release-identity-reference-catalog' as const,
});

export type IuReleaseReferenceEvidence = Readonly<{
  evidenceId: string;
  providerId: 'musicbrainz' | 'yes24';
  sourceKind: 'catalog-provider-release-group' | 'retailer-public-product-page';
  sourceUrl: string;
  providerEntityId: string;
  observedArtist: 'IU';
  observedTitle: string;
  observedReleaseType: string | null;
  providerFirstReleaseDate: string | null;
  retailProductReleaseDate: string | null;
  territory: string | null;
  barcode: string | null;
  researchOnly: true;
}>;

export type IuCanonicalReleaseReferenceCatalogEntry = Readonly<{
  reference: FandexReleaseIdentityResearchReference;
  evidenceRefs: readonly string[];
  releaseFamilyEvidenceRefs: readonly string[];
  notes: readonly string[];
}>;

export type IuYes24RetailProductReleaseMappingResearch = Readonly<{
  contractVersion: typeof IU_CANONICAL_RELEASE_REFERENCE_CATALOG_RESEARCH_CONTRACT_VERSION;
  lifecycle: 'research';
  retailerId: 'yes24';
  retailerProductId: string;
  retailerTitle: string;
  retailProductReleaseDate: string;
  fandexReleaseId: string;
  fandexReleaseFamilyId: string;
  productRelationship: ProductRelationship;
  resolutionState: IdentityResolutionState;
  reviewState: IdentityReviewState;
  evidenceRefs: readonly string[];
  blockers: readonly string[];
  directProductContributionEligible: false;
  productScorePublished: false;
}>;

const MB_LILAC_RG = 'bdeb7a5c-c628-4346-b886-842fc86d7250';
const MB_LOVE_POEM_RG = '2c9d0799-ee08-4988-a096-689955210d22';
const MB_MODERN_TIMES_RG = '59c7150d-d3be-43ab-a089-0a1676950821';

export const IU_RELEASE_IDS = Object.freeze({
  lilac: 'research:iu:release:lilac:2021-03-25',
  lovePoem: 'research:iu:release:love-poem:2019-11-18',
  modernTimes: 'research:iu:release:modern-times:2013-10-07',
  modernTimesEpilogue: 'research:iu:release:modern-times-epilogue:2013-12-20',
});

export const IU_RELEASE_FAMILY_IDS = Object.freeze({
  lilac: 'research:iu:release-family:lilac',
  lovePoem: 'research:iu:release-family:love-poem',
  modernTimes: 'research:iu:release-family:modern-times',
});

export const IU_RELEASE_REFERENCE_EVIDENCE = Object.freeze({
  musicbrainzLilac: Object.freeze({
    evidenceId: `web:musicbrainz:release-group:${MB_LILAC_RG}`,
    providerId: 'musicbrainz' as const,
    sourceKind: 'catalog-provider-release-group' as const,
    sourceUrl: `https://musicbrainz.org/release-group/${MB_LILAC_RG}`,
    providerEntityId: MB_LILAC_RG,
    observedArtist: 'IU' as const,
    observedTitle: 'LILAC',
    observedReleaseType: 'Album',
    providerFirstReleaseDate: '2021-03-25',
    retailProductReleaseDate: null,
    territory: 'KR',
    barcode: '8804775158773',
    researchOnly: true as const,
  }),
  yes24LilacRandom: Object.freeze({
    evidenceId: 'web:yes24:goods:97829198',
    providerId: 'yes24' as const,
    sourceKind: 'retailer-public-product-page' as const,
    sourceUrl: 'https://www.yes24.com/product/goods/97829198',
    providerEntityId: '97829198',
    observedArtist: 'IU' as const,
    observedTitle: '아이유 (IU) 5집 - LILAC [HILAC/BYLAC ver. 중 랜덤발송]',
    observedReleaseType: 'CD',
    providerFirstReleaseDate: null,
    retailProductReleaseDate: '2021-03-26',
    territory: 'KR',
    barcode: null,
    researchOnly: true as const,
  }),
  yes24LilacBylac: Object.freeze({
    evidenceId: 'web:yes24:goods:97829237',
    providerId: 'yes24' as const,
    sourceKind: 'retailer-public-product-page' as const,
    sourceUrl: 'https://www.yes24.com/product/goods/97829237',
    providerEntityId: '97829237',
    observedArtist: 'IU' as const,
    observedTitle: '아이유 (IU) 5집 - LILAC [BYLAC ver.]',
    observedReleaseType: 'CD',
    providerFirstReleaseDate: null,
    retailProductReleaseDate: '2021-03-26',
    territory: 'KR',
    barcode: null,
    researchOnly: true as const,
  }),
  musicbrainzLovePoem: Object.freeze({
    evidenceId: `web:musicbrainz:release-group:${MB_LOVE_POEM_RG}`,
    providerId: 'musicbrainz' as const,
    sourceKind: 'catalog-provider-release-group' as const,
    sourceUrl: `https://musicbrainz.org/release-group/${MB_LOVE_POEM_RG}`,
    providerEntityId: MB_LOVE_POEM_RG,
    observedArtist: 'IU' as const,
    observedTitle: 'Love poem',
    observedReleaseType: 'EP',
    providerFirstReleaseDate: '2019-11-18',
    retailProductReleaseDate: null,
    territory: 'KR',
    barcode: '8804775136351',
    researchOnly: true as const,
  }),
  yes24LovePoem: Object.freeze({
    evidenceId: 'web:yes24:goods:82272556',
    providerId: 'yes24' as const,
    sourceKind: 'retailer-public-product-page' as const,
    sourceUrl: 'https://www.yes24.com/product/goods/82272556',
    providerEntityId: '82272556',
    observedArtist: 'IU' as const,
    observedTitle: '아이유 (IU) - 미니앨범 5집 : Love poem',
    observedReleaseType: 'CD',
    providerFirstReleaseDate: null,
    retailProductReleaseDate: '2019-11-19',
    territory: 'KR',
    barcode: null,
    researchOnly: true as const,
  }),
  musicbrainzModernTimesFamily: Object.freeze({
    evidenceId: `web:musicbrainz:release-group:${MB_MODERN_TIMES_RG}`,
    providerId: 'musicbrainz' as const,
    sourceKind: 'catalog-provider-release-group' as const,
    sourceUrl: `https://musicbrainz.org/release-group/${MB_MODERN_TIMES_RG}`,
    providerEntityId: MB_MODERN_TIMES_RG,
    observedArtist: 'IU' as const,
    observedTitle: 'Modern Times',
    observedReleaseType: 'Album',
    providerFirstReleaseDate: '2013-10-07',
    retailProductReleaseDate: null,
    territory: 'KR',
    barcode: '8804775051524',
    researchOnly: true as const,
  }),
  yes24ModernTimesNormal: Object.freeze({
    evidenceId: 'web:yes24:goods:11099872',
    providerId: 'yes24' as const,
    sourceKind: 'retailer-public-product-page' as const,
    sourceUrl: 'https://www.yes24.com/product/goods/11099872',
    providerEntityId: '11099872',
    observedArtist: 'IU' as const,
    observedTitle: '아이유 (IU) 3집 - Modern Times [일반반]',
    observedReleaseType: 'CD',
    providerFirstReleaseDate: null,
    retailProductReleaseDate: '2013-10-08',
    territory: 'KR',
    barcode: null,
    researchOnly: true as const,
  }),
  yes24ModernTimesSpecial: Object.freeze({
    evidenceId: 'web:yes24:goods:11099877',
    providerId: 'yes24' as const,
    sourceKind: 'retailer-public-product-page' as const,
    sourceUrl: 'https://www.yes24.com/product/goods/11099877',
    providerEntityId: '11099877',
    observedArtist: 'IU' as const,
    observedTitle: '아이유 (IU) 3집 - Modern Times [CD+DVD 스페셜반]',
    observedReleaseType: 'CD+DVD',
    providerFirstReleaseDate: null,
    retailProductReleaseDate: '2013-10-10',
    territory: 'KR',
    barcode: null,
    researchOnly: true as const,
  }),
  yes24ModernTimesEpilogue: Object.freeze({
    evidenceId: 'web:yes24:goods:11724509',
    providerId: 'yes24' as const,
    sourceKind: 'retailer-public-product-page' as const,
    sourceUrl: 'https://www.yes24.com/product/goods/11724509',
    providerEntityId: '11724509',
    observedArtist: 'IU' as const,
    observedTitle: '아이유 (IU) 3집 - Modern Times : Epilogue [리패키지 한정반]',
    observedReleaseType: 'CD+2DVD',
    providerFirstReleaseDate: null,
    retailProductReleaseDate: '2013-12-26',
    territory: 'KR',
    barcode: null,
    researchOnly: true as const,
  }),
} satisfies Readonly<Record<string, IuReleaseReferenceEvidence>>);

function release(input: Readonly<{
  fandexReleaseId: string;
  fandexReleaseFamilyId: string;
  canonicalTitle: string;
  releaseDate: string;
  releaseType: FandexReleaseIdentity['releaseType'];
  label: string;
}>): FandexReleaseIdentity {
  return Object.freeze({
    fandexReleaseId: input.fandexReleaseId,
    fandexReleaseFamilyId: input.fandexReleaseFamilyId,
    canonicalTitle: input.canonicalTitle,
    artistIds: Object.freeze(['iu']),
    releaseDate: input.releaseDate,
    releaseType: input.releaseType,
    label: input.label,
    territory: 'KR',
    formatFamily: 'unknown',
    reviewState: 'provider-verified',
    resolutionState: 'resolved',
  });
}

const providerMapping = (
  providerReleaseGroupId: string,
  evidenceRefs: readonly string[],
): MusicReleaseProviderMappingReference => Object.freeze({
  providerId: 'musicbrainz',
  providerReleaseGroupId,
  evidenceRefs: Object.freeze([...evidenceRefs]),
});

const lilacReference: FandexReleaseIdentityResearchReference = Object.freeze({
  release: release({
    fandexReleaseId: IU_RELEASE_IDS.lilac,
    fandexReleaseFamilyId: IU_RELEASE_FAMILY_IDS.lilac,
    canonicalTitle: 'LILAC',
    releaseDate: '2021-03-25',
    releaseType: 'full-album',
    label: 'EDAM Entertainment',
  }),
  aliases: Object.freeze(["IU 5th Album 'LILAC'", '아이유 (IU) 5집 - LILAC']),
  providerMappings: Object.freeze([providerMapping(MB_LILAC_RG, [
    IU_RELEASE_REFERENCE_EVIDENCE.musicbrainzLilac.evidenceId,
  ])]),
  evidenceRefs: Object.freeze([
    IU_RELEASE_REFERENCE_EVIDENCE.musicbrainzLilac.evidenceId,
    IU_RELEASE_REFERENCE_EVIDENCE.yes24LilacRandom.evidenceId,
    IU_RELEASE_REFERENCE_EVIDENCE.yes24LilacBylac.evidenceId,
  ]),
});

const lovePoemReference: FandexReleaseIdentityResearchReference = Object.freeze({
  release: release({
    fandexReleaseId: IU_RELEASE_IDS.lovePoem,
    fandexReleaseFamilyId: IU_RELEASE_FAMILY_IDS.lovePoem,
    canonicalTitle: 'Love poem',
    releaseDate: '2019-11-18',
    releaseType: 'mini-album',
    label: 'Kakao M',
  }),
  aliases: Object.freeze(['Love Poem', '아이유 (IU) - 미니앨범 5집 : Love poem']),
  providerMappings: Object.freeze([providerMapping(MB_LOVE_POEM_RG, [
    IU_RELEASE_REFERENCE_EVIDENCE.musicbrainzLovePoem.evidenceId,
  ])]),
  evidenceRefs: Object.freeze([
    IU_RELEASE_REFERENCE_EVIDENCE.musicbrainzLovePoem.evidenceId,
    IU_RELEASE_REFERENCE_EVIDENCE.yes24LovePoem.evidenceId,
  ]),
});

const modernTimesReference: FandexReleaseIdentityResearchReference = Object.freeze({
  release: release({
    fandexReleaseId: IU_RELEASE_IDS.modernTimes,
    fandexReleaseFamilyId: IU_RELEASE_FAMILY_IDS.modernTimes,
    canonicalTitle: 'Modern Times',
    releaseDate: '2013-10-07',
    releaseType: 'full-album',
    label: 'LOEN Entertainment',
  }),
  aliases: Object.freeze(['Modern times', '아이유 (IU) 3집 - Modern Times']),
  providerMappings: Object.freeze([]),
  evidenceRefs: Object.freeze([
    IU_RELEASE_REFERENCE_EVIDENCE.musicbrainzModernTimesFamily.evidenceId,
    IU_RELEASE_REFERENCE_EVIDENCE.yes24ModernTimesNormal.evidenceId,
    IU_RELEASE_REFERENCE_EVIDENCE.yes24ModernTimesSpecial.evidenceId,
  ]),
});

const modernTimesEpilogueReference: FandexReleaseIdentityResearchReference = Object.freeze({
  release: release({
    fandexReleaseId: IU_RELEASE_IDS.modernTimesEpilogue,
    fandexReleaseFamilyId: IU_RELEASE_FAMILY_IDS.modernTimes,
    canonicalTitle: 'Modern Times: Epilogue',
    releaseDate: '2013-12-20',
    releaseType: 'repackage',
    label: 'LOEN Entertainment',
  }),
  aliases: Object.freeze(['Modern Times – Epilogue', 'Modern Times : Epilogue', '아이유 (IU) 3집 - Modern Times : Epilogue']),
  providerMappings: Object.freeze([]),
  evidenceRefs: Object.freeze([
    IU_RELEASE_REFERENCE_EVIDENCE.musicbrainzModernTimesFamily.evidenceId,
    IU_RELEASE_REFERENCE_EVIDENCE.yes24ModernTimesEpilogue.evidenceId,
  ]),
});

export const IU_CANONICAL_RELEASE_REFERENCE_CATALOG_RESEARCH: readonly IuCanonicalReleaseReferenceCatalogEntry[] = Object.freeze([
  Object.freeze({
    reference: lilacReference,
    evidenceRefs: lilacReference.evidenceRefs,
    releaseFamilyEvidenceRefs: lilacReference.evidenceRefs,
    notes: Object.freeze(['first-release-date-is-not-physical-retailer-date']),
  }),
  Object.freeze({
    reference: lovePoemReference,
    evidenceRefs: lovePoemReference.evidenceRefs,
    releaseFamilyEvidenceRefs: lovePoemReference.evidenceRefs,
    notes: Object.freeze(['musicbrainz-ep-maps-to-fandex-mini-album']),
  }),
  Object.freeze({
    reference: modernTimesReference,
    evidenceRefs: modernTimesReference.evidenceRefs,
    releaseFamilyEvidenceRefs: Object.freeze([IU_RELEASE_REFERENCE_EVIDENCE.musicbrainzModernTimesFamily.evidenceId]),
    notes: Object.freeze([
      'musicbrainz-release-group-also-contains-modern-times-epilogue',
      'release-group-level-explicit-release-mapping-intentionally-withheld',
    ]),
  }),
  Object.freeze({
    reference: modernTimesEpilogueReference,
    evidenceRefs: modernTimesEpilogueReference.evidenceRefs,
    releaseFamilyEvidenceRefs: Object.freeze([IU_RELEASE_REFERENCE_EVIDENCE.musicbrainzModernTimesFamily.evidenceId]),
    notes: Object.freeze([
      'repackage-is-separate-fandex-release-in-modern-times-family',
      'release-group-level-explicit-release-mapping-intentionally-withheld',
    ]),
  }),
]);

export const IU_YES24_RETAIL_PRODUCT_RELEASE_MAPPINGS_RESEARCH: readonly IuYes24RetailProductReleaseMappingResearch[] = Object.freeze([
  Object.freeze({
    contractVersion: IU_CANONICAL_RELEASE_REFERENCE_CATALOG_RESEARCH_CONTRACT_VERSION,
    lifecycle: 'research', retailerId: 'yes24', retailerProductId: '97829198',
    retailerTitle: IU_RELEASE_REFERENCE_EVIDENCE.yes24LilacRandom.observedTitle,
    retailProductReleaseDate: '2021-03-26', fandexReleaseId: IU_RELEASE_IDS.lilac,
    fandexReleaseFamilyId: IU_RELEASE_FAMILY_IDS.lilac, productRelationship: 'unknown',
    resolutionState: 'resolved', reviewState: 'provider-verified',
    evidenceRefs: Object.freeze([IU_RELEASE_REFERENCE_EVIDENCE.yes24LilacRandom.evidenceId]),
    blockers: Object.freeze(['random-edition-selection-unresolved']),
    directProductContributionEligible: false, productScorePublished: false,
  }),
  Object.freeze({
    contractVersion: IU_CANONICAL_RELEASE_REFERENCE_CATALOG_RESEARCH_CONTRACT_VERSION,
    lifecycle: 'research', retailerId: 'yes24', retailerProductId: '97829237',
    retailerTitle: IU_RELEASE_REFERENCE_EVIDENCE.yes24LilacBylac.observedTitle,
    retailProductReleaseDate: '2021-03-26', fandexReleaseId: IU_RELEASE_IDS.lilac,
    fandexReleaseFamilyId: IU_RELEASE_FAMILY_IDS.lilac, productRelationship: 'edition-child',
    resolutionState: 'resolved', reviewState: 'provider-verified',
    evidenceRefs: Object.freeze([IU_RELEASE_REFERENCE_EVIDENCE.yes24LilacBylac.evidenceId]),
    blockers: Object.freeze(['canonical-edition-id-not-yet-modeled']),
    directProductContributionEligible: false, productScorePublished: false,
  }),
  Object.freeze({
    contractVersion: IU_CANONICAL_RELEASE_REFERENCE_CATALOG_RESEARCH_CONTRACT_VERSION,
    lifecycle: 'research', retailerId: 'yes24', retailerProductId: '82272556',
    retailerTitle: IU_RELEASE_REFERENCE_EVIDENCE.yes24LovePoem.observedTitle,
    retailProductReleaseDate: '2019-11-19', fandexReleaseId: IU_RELEASE_IDS.lovePoem,
    fandexReleaseFamilyId: IU_RELEASE_FAMILY_IDS.lovePoem, productRelationship: 'sku-child',
    resolutionState: 'resolved', reviewState: 'provider-verified',
    evidenceRefs: Object.freeze([IU_RELEASE_REFERENCE_EVIDENCE.yes24LovePoem.evidenceId]),
    blockers: Object.freeze([]), directProductContributionEligible: false, productScorePublished: false,
  }),
  Object.freeze({
    contractVersion: IU_CANONICAL_RELEASE_REFERENCE_CATALOG_RESEARCH_CONTRACT_VERSION,
    lifecycle: 'research', retailerId: 'yes24', retailerProductId: '11099872',
    retailerTitle: IU_RELEASE_REFERENCE_EVIDENCE.yes24ModernTimesNormal.observedTitle,
    retailProductReleaseDate: '2013-10-08', fandexReleaseId: IU_RELEASE_IDS.modernTimes,
    fandexReleaseFamilyId: IU_RELEASE_FAMILY_IDS.modernTimes, productRelationship: 'edition-child',
    resolutionState: 'resolved', reviewState: 'provider-verified',
    evidenceRefs: Object.freeze([IU_RELEASE_REFERENCE_EVIDENCE.yes24ModernTimesNormal.evidenceId]),
    blockers: Object.freeze(['canonical-edition-id-not-yet-modeled']),
    directProductContributionEligible: false, productScorePublished: false,
  }),
  Object.freeze({
    contractVersion: IU_CANONICAL_RELEASE_REFERENCE_CATALOG_RESEARCH_CONTRACT_VERSION,
    lifecycle: 'research', retailerId: 'yes24', retailerProductId: '11099877',
    retailerTitle: IU_RELEASE_REFERENCE_EVIDENCE.yes24ModernTimesSpecial.observedTitle,
    retailProductReleaseDate: '2013-10-10', fandexReleaseId: IU_RELEASE_IDS.modernTimes,
    fandexReleaseFamilyId: IU_RELEASE_FAMILY_IDS.modernTimes, productRelationship: 'edition-child',
    resolutionState: 'resolved', reviewState: 'provider-verified',
    evidenceRefs: Object.freeze([IU_RELEASE_REFERENCE_EVIDENCE.yes24ModernTimesSpecial.evidenceId]),
    blockers: Object.freeze(['canonical-edition-id-not-yet-modeled']),
    directProductContributionEligible: false, productScorePublished: false,
  }),
  Object.freeze({
    contractVersion: IU_CANONICAL_RELEASE_REFERENCE_CATALOG_RESEARCH_CONTRACT_VERSION,
    lifecycle: 'research', retailerId: 'yes24', retailerProductId: '11724509',
    retailerTitle: IU_RELEASE_REFERENCE_EVIDENCE.yes24ModernTimesEpilogue.observedTitle,
    retailProductReleaseDate: '2013-12-26', fandexReleaseId: IU_RELEASE_IDS.modernTimesEpilogue,
    fandexReleaseFamilyId: IU_RELEASE_FAMILY_IDS.modernTimes, productRelationship: 'edition-child',
    resolutionState: 'resolved', reviewState: 'provider-verified',
    evidenceRefs: Object.freeze([IU_RELEASE_REFERENCE_EVIDENCE.yes24ModernTimesEpilogue.evidenceId]),
    blockers: Object.freeze(['canonical-edition-id-not-yet-modeled']),
    directProductContributionEligible: false, productScorePublished: false,
  }),
]);

export const IU_MODERN_TIMES_MUSICBRAINZ_RELEASE_GROUP_FAMILY_EVIDENCE = Object.freeze({
  providerId: 'musicbrainz' as const,
  providerReleaseGroupId: MB_MODERN_TIMES_RG,
  fandexReleaseFamilyId: IU_RELEASE_FAMILY_IDS.modernTimes,
  candidateFandexReleaseIds: Object.freeze([
    IU_RELEASE_IDS.modernTimes,
    IU_RELEASE_IDS.modernTimesEpilogue,
  ]),
  resolutionState: 'ambiguous' as const,
  reviewState: 'provider-verified' as const,
  evidenceRefs: Object.freeze([IU_RELEASE_REFERENCE_EVIDENCE.musicbrainzModernTimesFamily.evidenceId]),
  blockers: Object.freeze(['provider-release-group-spans-multiple-fandex-releases']),
});

export function iuCanonicalReleaseIdentityReferencesResearch(): readonly FandexReleaseIdentityResearchReference[] {
  return Object.freeze(IU_CANONICAL_RELEASE_REFERENCE_CATALOG_RESEARCH.map((entry) => entry.reference));
}

export function findIuYes24RetailProductReleaseMappingResearch(
  retailerProductId: string,
): IuYes24RetailProductReleaseMappingResearch | null {
  return IU_YES24_RETAIL_PRODUCT_RELEASE_MAPPINGS_RESEARCH.find((mapping) =>
    mapping.retailerProductId === retailerProductId) ?? null;
}
