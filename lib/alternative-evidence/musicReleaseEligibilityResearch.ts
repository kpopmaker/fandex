import type { MusicBrainzReleaseGroupResearchObservation } from './musicbrainzAlbumCatalogResearch';

export const MUSIC_RELEASE_ELIGIBILITY_RESEARCH_CONTRACT_VERSION =
  'music-release-eligibility-research-v1';

export const MUSIC_RELEASE_ELIGIBILITY_RESEARCH_DESCRIPTOR = Object.freeze({
  contractVersion: MUSIC_RELEASE_ELIGIBILITY_RESEARCH_CONTRACT_VERSION,
  lifecycle: 'research' as const,
  directProductContributionEligible: false as const,
  productScorePublished: false as const,
  productMethodologyFrozen: false as const,
  productionRuleSelected: false as const,
  semantics: 'parallel-release-eligibility-scenario-evaluation' as const,
});

export type MusicReleaseEligibilityResearchScenarioId =
  | 'primary-album-only'
  | 'primary-album-or-ep'
  | 'album-or-ep-non-compilation'
  | 'album-or-ep-non-compilation-sole-credit';

export type MusicReleaseEligibilityResearchDecision = Readonly<{
  scenarioId: MusicReleaseEligibilityResearchScenarioId;
  included: boolean;
  reasons: readonly string[];
}>;

export type MusicReleaseEligibilityResearchRow = Readonly<{
  providerReleaseGroupId: string;
  title: string;
  firstReleaseDate: string | null;
  primaryType: string | null;
  secondaryTypes: readonly string[];
  canonicalArtistCreditState: MusicBrainzReleaseGroupResearchObservation['canonicalArtistCreditState'];
  exactNormalizedTitleKey: string;
  exactNormalizedTitleCollisionCount: number;
  decisions: readonly MusicReleaseEligibilityResearchDecision[];
}>;

export type MusicReleaseEligibilityResearchScenarioSummary = Readonly<{
  scenarioId: MusicReleaseEligibilityResearchScenarioId;
  includedCount: number;
  excludedCount: number;
}>;

export type MusicReleaseEligibilityResearchCollisionGroup = Readonly<{
  exactNormalizedTitleKey: string;
  providerReleaseGroupIds: readonly string[];
  titles: readonly string[];
  primaryTypes: readonly (string | null)[];
}>;

export type MusicReleaseEligibilityResearchReport = Readonly<{
  contractVersion: typeof MUSIC_RELEASE_ELIGIBILITY_RESEARCH_CONTRACT_VERSION;
  lifecycle: 'research';
  directProductContributionEligible: false;
  productScorePublished: false;
  productMethodologyFrozen: false;
  productionRuleSelected: false;
  totalObservedReleaseGroups: number;
  primaryTypeCounts: Readonly<Record<string, number>>;
  secondaryTypeCounts: Readonly<Record<string, number>>;
  creditStateCounts: Readonly<Record<string, number>>;
  scenarioSummaries: readonly MusicReleaseEligibilityResearchScenarioSummary[];
  exactNormalizedTitleCollisionGroups: readonly MusicReleaseEligibilityResearchCollisionGroup[];
  unresolvedBlockers: readonly string[];
  rows: readonly MusicReleaseEligibilityResearchRow[];
}>;

const RESEARCH_SCENARIOS: readonly MusicReleaseEligibilityResearchScenarioId[] = Object.freeze([
  'primary-album-only',
  'primary-album-or-ep',
  'album-or-ep-non-compilation',
  'album-or-ep-non-compilation-sole-credit',
]);

const UNRESOLVED_BLOCKERS = Object.freeze([
  'primary-type-scope-not-frozen',
  'secondary-type-treatment-not-frozen',
  'artist-credit-ownership-not-frozen',
  'release-family-deduplication-not-defined',
  'market-scope-not-observed-at-release-group-level',
  'provider-catalog-completeness-not-proven',
  'provider-date-vs-collection-time-semantics-must-remain-distinct',
  'canonical-release-to-musicAlbumPoint-transform-not-defined',
] as const);

function normalizeExactTitleKey(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

function countValues(values: readonly string[]): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return Object.freeze({ ...counts });
}

function isAlbum(primaryType: string | null): boolean {
  return primaryType === 'Album';
}

function isAlbumOrEp(primaryType: string | null): boolean {
  return primaryType === 'Album' || primaryType === 'EP';
}

function hasSecondaryType(
  observation: MusicBrainzReleaseGroupResearchObservation,
  secondaryType: string,
): boolean {
  return observation.secondaryTypes.includes(secondaryType);
}

function evaluateScenario(
  observation: MusicBrainzReleaseGroupResearchObservation,
  scenarioId: MusicReleaseEligibilityResearchScenarioId,
): MusicReleaseEligibilityResearchDecision {
  const reasons: string[] = [];
  let included = false;

  if (scenarioId === 'primary-album-only') {
    included = isAlbum(observation.primaryType);
    reasons.push(included ? 'primary-type-album' : 'primary-type-not-album');
  } else if (scenarioId === 'primary-album-or-ep') {
    included = isAlbumOrEp(observation.primaryType);
    reasons.push(included ? 'primary-type-album-or-ep' : 'primary-type-not-album-or-ep');
  } else if (scenarioId === 'album-or-ep-non-compilation') {
    const primaryEligible = isAlbumOrEp(observation.primaryType);
    const compilation = hasSecondaryType(observation, 'Compilation');
    included = primaryEligible && !compilation;
    reasons.push(primaryEligible ? 'primary-type-album-or-ep' : 'primary-type-not-album-or-ep');
    reasons.push(compilation ? 'secondary-type-compilation' : 'secondary-type-not-compilation');
  } else {
    const primaryEligible = isAlbumOrEp(observation.primaryType);
    const compilation = hasSecondaryType(observation, 'Compilation');
    const soleCredit = observation.canonicalArtistCreditState === 'sole-credit';
    included = primaryEligible && !compilation && soleCredit;
    reasons.push(primaryEligible ? 'primary-type-album-or-ep' : 'primary-type-not-album-or-ep');
    reasons.push(compilation ? 'secondary-type-compilation' : 'secondary-type-not-compilation');
    reasons.push(soleCredit ? 'canonical-artist-sole-credit' : `canonical-artist-credit-${observation.canonicalArtistCreditState}`);
  }

  return Object.freeze({
    scenarioId,
    included,
    reasons: Object.freeze(reasons),
  });
}

export function evaluateMusicReleaseEligibilityResearch(
  observations: readonly MusicBrainzReleaseGroupResearchObservation[],
): MusicReleaseEligibilityResearchReport {
  const titleGroups = new Map<string, MusicBrainzReleaseGroupResearchObservation[]>();
  for (const observation of observations) {
    const key = normalizeExactTitleKey(observation.title);
    const group = titleGroups.get(key) ?? [];
    group.push(observation);
    titleGroups.set(key, group);
  }

  const rows = Object.freeze(observations.map((observation) => {
    const exactNormalizedTitleKey = normalizeExactTitleKey(observation.title);
    const collisionCount = titleGroups.get(exactNormalizedTitleKey)?.length ?? 1;
    return Object.freeze({
      providerReleaseGroupId: observation.providerReleaseGroupId,
      title: observation.title,
      firstReleaseDate: observation.firstReleaseDate,
      primaryType: observation.primaryType,
      secondaryTypes: observation.secondaryTypes,
      canonicalArtistCreditState: observation.canonicalArtistCreditState,
      exactNormalizedTitleKey,
      exactNormalizedTitleCollisionCount: collisionCount,
      decisions: Object.freeze(RESEARCH_SCENARIOS.map((scenarioId) => evaluateScenario(observation, scenarioId))),
    });
  }));

  const scenarioSummaries = Object.freeze(RESEARCH_SCENARIOS.map((scenarioId) => {
    const includedCount = rows.filter((row) => row.decisions.some(
      (decision) => decision.scenarioId === scenarioId && decision.included,
    )).length;
    return Object.freeze({
      scenarioId,
      includedCount,
      excludedCount: rows.length - includedCount,
    });
  }));

  const collisionGroups = Object.freeze([...titleGroups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([exactNormalizedTitleKey, group]) => Object.freeze({
      exactNormalizedTitleKey,
      providerReleaseGroupIds: Object.freeze(group.map((item) => item.providerReleaseGroupId)),
      titles: Object.freeze(group.map((item) => item.title)),
      primaryTypes: Object.freeze(group.map((item) => item.primaryType)),
    })));

  return Object.freeze({
    contractVersion: MUSIC_RELEASE_ELIGIBILITY_RESEARCH_CONTRACT_VERSION,
    lifecycle: 'research',
    directProductContributionEligible: false,
    productScorePublished: false,
    productMethodologyFrozen: false,
    productionRuleSelected: false,
    totalObservedReleaseGroups: observations.length,
    primaryTypeCounts: countValues(observations.map((item) => item.primaryType ?? 'null')),
    secondaryTypeCounts: countValues(observations.flatMap((item) => item.secondaryTypes)),
    creditStateCounts: countValues(observations.map((item) => item.canonicalArtistCreditState)),
    scenarioSummaries,
    exactNormalizedTitleCollisionGroups: collisionGroups,
    unresolvedBlockers: UNRESOLVED_BLOCKERS,
    rows,
  });
}
