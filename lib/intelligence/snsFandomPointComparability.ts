import {
  SNS_FANDOM_PROVIDER_QUALIFICATIONS,
  isSnsFandomArtistEntitlementActiveFor,
  isSnsFandomProviderApprovalActiveFor,
  validateSnsFandomObservation,
  type SnsFandomArtistProviderEntitlement,
  type SnsFandomDimension,
  type SnsFandomObservation,
  type SnsFandomProviderApprovalEvidence,
  type SnsFandomProviderId,
  type SnsFandomProviderQualification,
} from './snsFandomPointContracts';

export const SNS_FANDOM_COMPARABILITY_CONTRACT_VERSION =
  'sns-fandom-comparability-contract-v1' as const;

export type SnsFandomComparabilityTemporalBasis =
  | 'provider-period'
  | 'observation-time';

export type SnsFandomComparableMember = Readonly<{
  canonicalArtistId: string;
  observationId: string;
  rawValue: number;
  normalizedValue: null;
}>;

export type SnsFandomComparableCohort = Readonly<{
  contractVersion: typeof SNS_FANDOM_COMPARABILITY_CONTRACT_VERSION;
  cohortId: string;
  state: 'comparable' | 'single-artist-only';
  providerId: SnsFandomProviderId;
  providerClientRef: string;
  providerEndpoints: readonly string[];
  dimension: SnsFandomDimension;
  metricId: string;
  unit: 'count';
  temporalBasis: SnsFandomComparabilityTemporalBasis;
  providerPeriodStart: string | null;
  providerPeriodEnd: string | null;
  observedAt: string | null;
  canonicalArtistIds: readonly string[];
  members: readonly SnsFandomComparableMember[];
  normalizationMethod: null;
  crossPlatformCombinationAllowed: false;
  crossMetricCombinationAllowed: false;
}>;

export type SnsFandomComparabilityResult = Readonly<{
  contractVersion: typeof SNS_FANDOM_COMPARABILITY_CONTRACT_VERSION;
  state:
    | 'no-comparable-evidence'
    | 'cohort-insufficient'
    | 'comparable-cohorts-ready';
  cohorts: readonly SnsFandomComparableCohort[];
  comparableCohortCount: number;
  excludedObservationCount: number;
  numericNormalizationReady: false;
  normalizedValuesProduced: false;
  crossPlatformRawAverageAllowed: false;
  blockers: readonly string[];
}>;

type EligibleObservation = Readonly<{
  observation: SnsFandomObservation;
  temporalBasis: SnsFandomComparabilityTemporalBasis;
  temporalKey: string;
}>;

function qualificationFor(
  qualifications: readonly SnsFandomProviderQualification[],
  observation: SnsFandomObservation,
): SnsFandomProviderQualification | null {
  return qualifications.find((item) => (
    item.providerId === observation.providerId
    && item.constructCoverage.includes(observation.variable.dimension)
  )) ?? null;
}

function rightsEligible(
  input: Readonly<{
    observation: SnsFandomObservation;
    qualification: SnsFandomProviderQualification;
    providerApprovals: readonly SnsFandomProviderApprovalEvidence[];
    artistEntitlements: readonly SnsFandomArtistProviderEntitlement[];
    evaluatedAt: string | null;
  }>,
): boolean {
  const {
    observation,
    qualification,
    providerApprovals,
    artistEntitlements,
    evaluatedAt,
  } = input;

  if (qualification.state === 'production-ready') return true;
  if (evaluatedAt === null) return false;

  if (qualification.state === 'conditional-approval-required') {
    return providerApprovals.some((approval) =>
      isSnsFandomProviderApprovalActiveFor(approval, {
        providerId: observation.providerId,
        providerClientRef: observation.evidence.providerClientRef,
        providerEndpoints: observation.evidence.providerEndpoints,
        dimension: observation.variable.dimension,
        metricId: observation.variable.metricId,
        evaluatedAt,
      })
    );
  }

  if (
    qualification.state === 'authorized-account-only'
    && observation.entity.providerArtistId !== null
  ) {
    return artistEntitlements.some((entitlement) =>
      isSnsFandomArtistEntitlementActiveFor(entitlement, {
        canonicalArtistId: observation.entity.canonicalArtistId,
        providerId: observation.providerId,
        providerClientRef: observation.evidence.providerClientRef,
        providerArtistId: observation.entity.providerArtistId!,
        dimension: observation.variable.dimension,
        evaluatedAt,
      })
    );
  }

  return false;
}

function eligibleObservation(
  input: Readonly<{
    observation: SnsFandomObservation;
    qualifications: readonly SnsFandomProviderQualification[];
    providerApprovals: readonly SnsFandomProviderApprovalEvidence[];
    artistEntitlements: readonly SnsFandomArtistProviderEntitlement[];
    evaluatedAt: string | null;
  }>,
): EligibleObservation | null {
  const { observation } = input;
  if (!validateSnsFandomObservation(observation).ok) return null;
  if (observation.value.missingState !== 'observed') return null;
  if (observation.value.rawValue === null) return null;
  if (observation.value.unit !== 'count') return null;
  if (observation.variable.metricRole !== 'construct-evidence') return null;

  // A video/content-level counter is not automatically an artist-level
  // comparable metric. A separately approved aggregation contract is required.
  if (observation.entity.providerContentId !== null) return null;

  const qualification = qualificationFor(input.qualifications, observation);
  if (qualification === null) return null;
  if (!rightsEligible({ ...input, qualification })) return null;

  const { providerPeriodStart, providerPeriodEnd, observedAt } =
    observation.time;

  if (providerPeriodStart !== null && providerPeriodEnd !== null) {
    return Object.freeze({
      observation,
      temporalBasis: 'provider-period' as const,
      temporalKey: [
        'provider-period',
        providerPeriodStart,
        providerPeriodEnd,
      ].join('|'),
    });
  }

  if (providerPeriodStart === null && providerPeriodEnd === null) {
    return Object.freeze({
      observation,
      temporalBasis: 'observation-time' as const,
      temporalKey: ['observation-time', observedAt].join('|'),
    });
  }

  return null;
}

function cohortKey(item: EligibleObservation): string {
  const { observation } = item;
  const endpoints = Array.from(
    new Set(observation.evidence.providerEndpoints),
  ).sort();

  return [
    observation.providerId,
    observation.evidence.providerClientRef,
    endpoints.join(','),
    observation.variable.dimension,
    observation.variable.metricId,
    observation.value.unit,
    item.temporalKey,
  ].join('|');
}

export function buildSnsFandomComparability(
  input: Readonly<{
    observations: readonly SnsFandomObservation[];
    providerQualifications?: readonly SnsFandomProviderQualification[];
    providerApprovals?: readonly SnsFandomProviderApprovalEvidence[];
    artistEntitlements?: readonly SnsFandomArtistProviderEntitlement[];
    evaluatedAt?: string;
  }>,
): SnsFandomComparabilityResult {
  const qualifications =
    input.providerQualifications ?? SNS_FANDOM_PROVIDER_QUALIFICATIONS;
  const providerApprovals = input.providerApprovals ?? [];
  const artistEntitlements = input.artistEntitlements ?? [];
  const evaluatedAt = input.evaluatedAt ?? null;

  const eligible: EligibleObservation[] = [];
  let excludedObservationCount = 0;
  let unaggregatedContentObservationCount = 0;

  for (const observation of input.observations) {
    if (
      observation.variable.metricRole === 'construct-evidence'
      && observation.value.missingState === 'observed'
      && observation.entity.providerContentId !== null
    ) {
      unaggregatedContentObservationCount += 1;
    }

    const candidate = eligibleObservation({
      observation,
      qualifications,
      providerApprovals,
      artistEntitlements,
      evaluatedAt,
    });

    if (candidate === null) {
      excludedObservationCount += 1;
      continue;
    }
    eligible.push(candidate);
  }

  const groups = new Map<string, EligibleObservation[]>();
  for (const item of eligible) {
    const key = cohortKey(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }

  const cohorts: SnsFandomComparableCohort[] = [];

  for (const [key, group] of groups) {
    const first = group[0];
    const observation = first.observation;
    const endpoints = Array.from(
      new Set(observation.evidence.providerEndpoints),
    ).sort();
    const canonicalArtistIds = Array.from(
      new Set(group.map((item) =>
        item.observation.entity.canonicalArtistId
      )),
    ).sort();

    const members = group
      .map((item) => Object.freeze({
        canonicalArtistId:
          item.observation.entity.canonicalArtistId,
        observationId: item.observation.observationId,
        rawValue: item.observation.value.rawValue as number,
        normalizedValue: null,
      }))
      .sort((a, b) => (
        a.canonicalArtistId.localeCompare(b.canonicalArtistId)
        || a.observationId.localeCompare(b.observationId)
      ));

    const periodBacked = first.temporalBasis === 'provider-period';

    cohorts.push(Object.freeze({
      contractVersion: SNS_FANDOM_COMPARABILITY_CONTRACT_VERSION,
      cohortId: key,
      state: canonicalArtistIds.length >= 2
        ? 'comparable' as const
        : 'single-artist-only' as const,
      providerId: observation.providerId,
      providerClientRef: observation.evidence.providerClientRef,
      providerEndpoints: Object.freeze(endpoints),
      dimension: observation.variable.dimension,
      metricId: observation.variable.metricId,
      unit: 'count' as const,
      temporalBasis: first.temporalBasis,
      providerPeriodStart: periodBacked
        ? observation.time.providerPeriodStart
        : null,
      providerPeriodEnd: periodBacked
        ? observation.time.providerPeriodEnd
        : null,
      observedAt: periodBacked ? null : observation.time.observedAt,
      canonicalArtistIds: Object.freeze(canonicalArtistIds),
      members: Object.freeze(members),
      normalizationMethod: null,
      crossPlatformCombinationAllowed: false as const,
      crossMetricCombinationAllowed: false as const,
    }));
  }

  cohorts.sort((a, b) => a.cohortId.localeCompare(b.cohortId));
  const comparableCohortCount = cohorts.filter(
    (cohort) => cohort.state === 'comparable',
  ).length;

  const blockers: string[] = [
    'numeric-normalization-methodology-not-approved',
    'cross-dimension-combination-methodology-not-approved',
  ];

  if (unaggregatedContentObservationCount > 0) {
    blockers.push('artist-level-content-aggregation-methodology-missing');
  }
  if (eligible.length === 0) {
    blockers.push('no-rights-qualified-artist-level-evidence');
  } else if (comparableCohortCount === 0) {
    blockers.push('multi-artist-comparison-evidence-insufficient');
  }

  const state =
    eligible.length === 0
      ? 'no-comparable-evidence' as const
      : comparableCohortCount === 0
        ? 'cohort-insufficient' as const
        : 'comparable-cohorts-ready' as const;

  return Object.freeze({
    contractVersion: SNS_FANDOM_COMPARABILITY_CONTRACT_VERSION,
    state,
    cohorts: Object.freeze(cohorts),
    comparableCohortCount,
    excludedObservationCount,
    numericNormalizationReady: false as const,
    normalizedValuesProduced: false as const,
    crossPlatformRawAverageAllowed: false as const,
    blockers: Object.freeze(blockers),
  });
}
