import {
  IU_RELEASE_IDS,
  IU_RELEASE_FAMILY_IDS,
} from './iuCanonicalReleaseReferenceCatalogResearch';
import {
  IU_PIECES_RELEASE_FAMILY_ID,
  IU_PIECES_RELEASE_ID,
} from './iuPiecesResearchEvidence';
import {
  IU_THE_WINNING_RELEASE_FAMILY_ID,
  IU_THE_WINNING_RELEASE_ID,
} from './iuTheWinningResearchEvidence';

export const IU_LUMINATE_BASELINE_ACQUISITION_RESEARCH_CONTRACT_VERSION =
  'iu-luminate-baseline-acquisition-research-v1' as const;

export const IU_LUMINATE_BASELINE_ACQUISITION_RESEARCH_DESCRIPTOR = Object.freeze({
  contractVersion: IU_LUMINATE_BASELINE_ACQUISITION_RESEARCH_CONTRACT_VERSION,
  lifecycle: 'research' as const,
  providerId: 'luminate-music' as const,
  territoryMustBeSingleLane: true as const,
  allowedTerritories: Object.freeze(['US', 'CA'] as const),
  currentReleaseId: IU_THE_WINNING_RELEASE_ID,
  baselineDefinition: 'immediately-previous-comparable-eligible-release' as const,
  baselinePreselectionWithoutObservation: false as const,
  missingCandidateObservationMayBecomeZero: false as const,
  laterFallbackMaySkipNonComparableCandidate: true as const,
  boundedEarlierIdentityCoverage: true as const,
  semantics: 'ordered-acquisition-targets-not-preselected-normalization-baseline' as const,
});

export type IuLuminateBaselineAcquisitionTarget = Readonly<{
  order: number;
  role: 'current' | 'baseline-candidate';
  fandexReleaseId: string;
  fandexReleaseFamilyId: string;
  releaseDate: string;
  canonicalTitle: string;
  releaseType: 'mini-album' | 'full-album';
  acquisitionState:
    | 'required-current'
    | 'first-baseline-candidate'
    | 'fallback-baseline-candidate';
  selectionMeaning: string;
}>;

export const IU_LUMINATE_BASELINE_ACQUISITION_TARGETS_RESEARCH:
  readonly IuLuminateBaselineAcquisitionTarget[] = Object.freeze([
  Object.freeze({
    order: 0,
    role: 'current',
    fandexReleaseId: IU_THE_WINNING_RELEASE_ID,
    fandexReleaseFamilyId: IU_THE_WINNING_RELEASE_FAMILY_ID,
    releaseDate: '2024-02-20',
    canonicalTitle: 'The Winning',
    releaseType: 'mini-album',
    acquisitionState: 'required-current',
    selectionMeaning: 'current-release-observation-required',
  }),
  Object.freeze({
    order: 1,
    role: 'baseline-candidate',
    fandexReleaseId: IU_PIECES_RELEASE_ID,
    fandexReleaseFamilyId: IU_PIECES_RELEASE_FAMILY_ID,
    releaseDate: '2021-12-29',
    canonicalTitle: 'Pieces',
    releaseType: 'mini-album',
    acquisitionState: 'first-baseline-candidate',
    selectionMeaning: 'chronologically-previous-eligible-release-candidate; baseline-only-if-luminate-observation-is-comparable',
  }),
  Object.freeze({
    order: 2,
    role: 'baseline-candidate',
    fandexReleaseId: IU_RELEASE_IDS.lilac,
    fandexReleaseFamilyId: IU_RELEASE_FAMILY_IDS.lilac,
    releaseDate: '2021-03-25',
    canonicalTitle: 'LILAC',
    releaseType: 'full-album',
    acquisitionState: 'fallback-baseline-candidate',
    selectionMeaning: 'fallback-only-if-pieces-lacks-a-comparable-authorized-luminate-observation',
  }),
  Object.freeze({
    order: 3,
    role: 'baseline-candidate',
    fandexReleaseId: IU_RELEASE_IDS.lovePoem,
    fandexReleaseFamilyId: IU_RELEASE_FAMILY_IDS.lovePoem,
    releaseDate: '2019-11-18',
    canonicalTitle: 'Love poem',
    releaseType: 'mini-album',
    acquisitionState: 'fallback-baseline-candidate',
    selectionMeaning: 'bounded-fallback-only-if-newer-candidates-lack-comparable-authorized-luminate-observations',
  }),
]);

export const IU_LUMINATE_BASELINE_ACQUISITION_BOUNDARY_RESEARCH = Object.freeze({
  earlierThan: '2019-11-18' as const,
  state: 'identity-extension-required-before-earlier-search' as const,
  reason:
    'the current canonical reference set does not model every otherwise-eligible IU album/EP before Love poem, so Modern Times must not be selected merely because it is already modeled',
});

export function nextIuLuminateBaselineAcquisitionTarget(
  comparableObservationReleaseIds: readonly string[],
): IuLuminateBaselineAcquisitionTarget | null {
  const comparable = new Set(comparableObservationReleaseIds);
  const candidates = IU_LUMINATE_BASELINE_ACQUISITION_TARGETS_RESEARCH
    .filter((target) => target.role === 'baseline-candidate');
  return candidates.find((target) => !comparable.has(target.fandexReleaseId)) ?? null;
}
