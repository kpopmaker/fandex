import {
  buildLuminateReleaseGroupDiscoveryPlan,
  type LuminateReleaseGroupDiscoveryPlan,
} from './luminateSnowflakeAlbumExtractionResearch';
import {
  IU_PIECES_RELEASE_ID,
  IU_PIECES_RELEASE_FAMILY_ID,
} from './iuPiecesResearchEvidence';
import {
  IU_THE_WINNING_RELEASE_ID,
  IU_THE_WINNING_RELEASE_FAMILY_ID,
} from './iuTheWinningResearchEvidence';

export const IU_LUMINATE_PROVIDER_IDENTITY_REVIEW_RESEARCH_VERSION =
  'iu-luminate-provider-identity-review-research-v1' as const;

export type IuLuminateRetailBarcodeEvidence = Readonly<{
  fandexReleaseId: string;
  barcode: string;
  editionLabel: string;
  catalogNumber: string | null;
  sourceUrl: string;
  evidenceRole: 'edition-crosscheck-only';
}>;

export const IU_LUMINATE_RETAIL_BARCODE_EVIDENCE_RESEARCH = Object.freeze([
  Object.freeze({
    fandexReleaseId: IU_THE_WINNING_RELEASE_ID,
    barcode: '8804775368752',
    editionLabel: 'The Winning standard/U win/I win physical edition family',
    catalogNumber: 'L200002886',
    sourceUrl: 'https://k-pop-planet.com/products/iu-the-winning',
    evidenceRole: 'edition-crosscheck-only' as const,
  }),
  Object.freeze({
    fandexReleaseId: IU_THE_WINNING_RELEASE_ID,
    barcode: '8804775368769',
    editionLabel: 'The Winning Special ver.',
    catalogNumber: 'L200002887',
    sourceUrl: 'https://k-pop-planet.com/products/iu-the-winning-special-ver',
    evidenceRole: 'edition-crosscheck-only' as const,
  }),
  Object.freeze({
    fandexReleaseId: IU_PIECES_RELEASE_ID,
    barcode: '8804775236938',
    editionLabel: 'Pieces physical edition',
    catalogNumber: null,
    sourceUrl: 'https://musicbrainz.org/release-group/cd6cb8a6-1e27-45ac-a0af-6bed5f2e56c5',
    evidenceRole: 'edition-crosscheck-only' as const,
  }),
] as const);

export const IU_LUMINATE_PROVIDER_IDENTITY_REVIEW_RESEARCH_DESCRIPTOR = Object.freeze({
  contractVersion: IU_LUMINATE_PROVIDER_IDENTITY_REVIEW_RESEARCH_VERSION,
  lifecycle: 'research' as const,
  providerId: 'luminate-music' as const,
  providerIdentityLevel: 'Musical Release Group / MRELG_ID' as const,
  automaticProviderIdentityAcceptanceAllowed: false as const,
  barcodeAloneMayResolveReleaseGroup: false as const,
  multipleEditionBarcodesAllowedForOneFandexReleaseFamily: true as const,
  titleArtistReleaseDateReviewRequired: true as const,
  exactOneAcceptedMrelgPerFandexReleaseRequired: true as const,
  crossReleaseMrelgReuseAllowed: false as const,
  productOrEditionIdsMaySubstituteMrelgId: false as const,
  directProductContributionEligible: false as const,
  productionEligible: false as const,
});

export type IuLuminateProviderIdentityCandidate = Readonly<{
  fandexReleaseId: string;
  fandexReleaseFamilyId: string;
  canonicalTitle: string;
  releaseDate: string;
  mrelgId: string;
  luminateTitle: string;
  luminateDisplayArtist: string;
  luminateReleaseDate: string;
  matchedBarcodes: readonly string[];
  reviewed: boolean;
}>;

export type IuLuminateProviderIdentityResolution = Readonly<{
  state: 'resolved-research' | 'blocked';
  fandexReleaseId: string;
  mrelgId: string | null;
  blockers: readonly string[];
}>;

const RELEASE_EXPECTATIONS = Object.freeze({
  [IU_THE_WINNING_RELEASE_ID]: Object.freeze({
    familyId: IU_THE_WINNING_RELEASE_FAMILY_ID,
    canonicalTitle: 'The Winning',
    releaseDate: '2024-02-20',
    acceptableBarcodes: Object.freeze(['8804775368752', '8804775368769'] as const),
  }),
  [IU_PIECES_RELEASE_ID]: Object.freeze({
    familyId: IU_PIECES_RELEASE_FAMILY_ID,
    canonicalTitle: 'Pieces',
    releaseDate: '2021-12-29',
    acceptableBarcodes: Object.freeze(['8804775236938'] as const),
  }),
});

export function buildIuLuminateProviderIdentityDiscoveryPlans(): readonly LuminateReleaseGroupDiscoveryPlan[] {
  return Object.freeze([
    buildLuminateReleaseGroupDiscoveryPlan({
      fandexReleaseId: IU_THE_WINNING_RELEASE_ID,
      canonicalTitle: 'The Winning',
      artistDisplayName: 'IU',
      releaseDate: '2024-02-20',
      barcode: null,
    }),
    buildLuminateReleaseGroupDiscoveryPlan({
      fandexReleaseId: IU_PIECES_RELEASE_ID,
      canonicalTitle: 'Pieces',
      artistDisplayName: 'IU',
      releaseDate: '2021-12-29',
      barcode: '8804775236938',
    }),
  ]);
}

export function evaluateIuLuminateProviderIdentityCandidate(
  candidate: IuLuminateProviderIdentityCandidate,
): IuLuminateProviderIdentityResolution {
  const blockers: string[] = [];
  const expected = RELEASE_EXPECTATIONS[candidate.fandexReleaseId as keyof typeof RELEASE_EXPECTATIONS];

  if (!expected) {
    blockers.push('iu-luminate-provider-identity-release-not-in-reviewed-target-set');
  } else {
    if (candidate.fandexReleaseFamilyId !== expected.familyId) {
      blockers.push('iu-luminate-provider-identity-family-mismatch');
    }
    if (candidate.luminateTitle.trim().toLowerCase() !== expected.canonicalTitle.toLowerCase()) {
      blockers.push('iu-luminate-provider-identity-title-mismatch');
    }
    if (candidate.luminateDisplayArtist.trim().toLowerCase() !== 'iu') {
      blockers.push('iu-luminate-provider-identity-artist-mismatch');
    }
    if (candidate.luminateReleaseDate !== expected.releaseDate) {
      blockers.push('iu-luminate-provider-identity-release-date-mismatch');
    }
    const unexpectedBarcode = candidate.matchedBarcodes.find(
      (barcode) => !expected.acceptableBarcodes.includes(barcode as never),
    );
    if (unexpectedBarcode) {
      blockers.push('iu-luminate-provider-identity-unexpected-edition-barcode');
    }
  }

  if (!candidate.mrelgId.trim()) blockers.push('iu-luminate-provider-identity-mrelg-id-missing');
  if (!candidate.reviewed) blockers.push('iu-luminate-provider-identity-human-review-required');

  return Object.freeze({
    state: blockers.length === 0 ? 'resolved-research' as const : 'blocked' as const,
    fandexReleaseId: candidate.fandexReleaseId,
    mrelgId: blockers.length === 0 ? candidate.mrelgId : null,
    blockers: Object.freeze([...new Set(blockers)]),
  });
}

export function validateIuLuminateProviderIdentityPair(
  current: IuLuminateProviderIdentityResolution,
  baseline: IuLuminateProviderIdentityResolution,
): readonly string[] {
  const blockers: string[] = [];
  if (current.state !== 'resolved-research') blockers.push('iu-luminate-current-mrelg-unresolved');
  if (baseline.state !== 'resolved-research') blockers.push('iu-luminate-baseline-mrelg-unresolved');
  if (current.fandexReleaseId !== IU_THE_WINNING_RELEASE_ID) {
    blockers.push('iu-luminate-current-release-id-unexpected');
  }
  if (baseline.fandexReleaseId !== IU_PIECES_RELEASE_ID) {
    blockers.push('iu-luminate-baseline-release-id-unexpected');
  }
  if (current.mrelgId && baseline.mrelgId && current.mrelgId === baseline.mrelgId) {
    blockers.push('iu-luminate-cross-release-mrelg-reuse-forbidden');
  }
  return Object.freeze([...new Set(blockers)]);
}
