import { sha256Canonical } from '../shared/canonicalDigest';
import type { AlternativeEvidence, AlternativeEvidenceOrigin } from './contracts';
import {
  createDefaultOffOnboarding,
  type SourceOnboardingRecord,
} from './onboarding';

export const DIRECT_ALBUM_PROVIDER_CONTRACT_VERSION = 'direct-album-provider-v1';
export const DIRECT_ALBUM_OBSERVATION_CONTRACT_VERSION = 'direct-album-observation-v1';

export type DirectAlbumObservationSemantic =
  | 'consumer-retail-sale'
  | 'retailer-panel-sale'
  | 'first-day-sale'
  | 'first-week-sale'
  | 'period-sale'
  | 'cumulative-sale'
  | 'preorder'
  | 'shipment'
  | 'chart-certified-unit'
  | 'rank'
  | 'index'
  | 'unknown';

export type DirectAlbumObservationUnit =
  | 'physical-units'
  | 'rank'
  | 'provider-index'
  | 'unknown';

export type CapabilityState = 'true' | 'false' | 'unknown';

export type ProviderCapability = Readonly<{
  state: CapabilityState;
  evidenceIds: readonly string[];
}>;

export type DirectAlbumProviderCapabilities = Readonly<{
  supportsNativePeriodSales: ProviderCapability;
  supportsFirstWeekSales: ProviderCapability;
  supportsCumulativeSales: ProviderCapability;
  supportsHistoricalQueries: ProviderCapability;
  supportsRevisions: ProviderCapability;
  supportsArtistIdentity: ProviderCapability;
  supportsReleaseIdentity: ProviderCapability;
  supportsEditionIdentity: ProviderCapability;
  supportsSkuIdentity: ProviderCapability;
  supportsFormatIdentity: ProviderCapability;
  supportsTerritorySegmentation: ProviderCapability;
}>;

export type DirectAlbumProviderDescriptor = Readonly<{
  contractVersion: typeof DIRECT_ALBUM_PROVIDER_CONTRACT_VERSION;
  providerId: string;
  providerName: string;
  sourceFamily: 'direct-album-provider';
  onboarding: SourceOnboardingRecord;
  capabilities: DirectAlbumProviderCapabilities;
  defaultOff: Readonly<{
    enabled: false;
    liveCallsAllowed: false;
    researchAllowed: false;
    productionAllowed: false;
  }>;
}>;

export type DirectAlbumProvider = Readonly<{
  descriptor: DirectAlbumProviderDescriptor;
  buildRequest?: (input: unknown) => unknown;
  decodeResponse?: (input: unknown) => readonly DirectAlbumObservation[];
  readFixture?: () => readonly DirectAlbumObservation[];
}>;

export type DirectAlbumObservation = Readonly<{
  contractVersion: typeof DIRECT_ALBUM_OBSERVATION_CONTRACT_VERSION;
  observationId: string;
  providerId: string;
  providerObservationId: string | null;
  providerArtistId: string | null;
  providerReleaseId: string | null;
  providerEditionId: string | null;
  providerSkuId: string | null;
  fandexArtistId: string | null;
  fandexReleaseId: string | null;
  fandexReleaseFamilyId: string | null;
  semantic: DirectAlbumObservationSemantic;
  value: number | null;
  unit: DirectAlbumObservationUnit;
  territory: string | null;
  format: string | null;
  providerPeriod: string | null;
  providerPublishedAt: string | null;
  observedAt: string;
  collectedAt: string;
  revisionId: string | null;
  revisionObservedAt: string | null;
  supersedesObservationId: string | null;
  knowledgeMode: 'as-known-at-collection' | 'current-research';
  scopeRole: 'standalone' | 'release-total' | 'child-sku' | 'format-child';
  parentObservationId: string | null;
  evidenceDigest: string;
  syntheticFixture: boolean;
}>;

export type DirectAlbumObservationDraft = Omit<DirectAlbumObservation, 'observationId' | 'evidenceDigest'> & {
  observationId?: string;
  evidenceDigest?: string;
};

const UNIT_BY_SEMANTIC: Readonly<Record<DirectAlbumObservationSemantic, readonly DirectAlbumObservationUnit[]>> = Object.freeze({
  'consumer-retail-sale': ['physical-units'],
  'retailer-panel-sale': ['physical-units'],
  'first-day-sale': ['physical-units'],
  'first-week-sale': ['physical-units'],
  'period-sale': ['physical-units'],
  'cumulative-sale': ['physical-units'],
  preorder: ['physical-units'],
  shipment: ['physical-units'],
  'chart-certified-unit': ['physical-units'],
  rank: ['rank'],
  index: ['provider-index'],
  unknown: ['unknown'],
});

export function unknownCapability(): ProviderCapability {
  return Object.freeze({ state: 'unknown', evidenceIds: Object.freeze([]) });
}

export function knownCapability(
  state: Exclude<CapabilityState, 'unknown'>,
  evidenceIds: readonly string[] = [],
): ProviderCapability {
  return Object.freeze({ state, evidenceIds: Object.freeze([...evidenceIds]) });
}

export function unknownAlbumProviderCapabilities(): DirectAlbumProviderCapabilities {
  return Object.freeze({
    supportsNativePeriodSales: unknownCapability(),
    supportsFirstWeekSales: unknownCapability(),
    supportsCumulativeSales: unknownCapability(),
    supportsHistoricalQueries: unknownCapability(),
    supportsRevisions: unknownCapability(),
    supportsArtistIdentity: unknownCapability(),
    supportsReleaseIdentity: unknownCapability(),
    supportsEditionIdentity: unknownCapability(),
    supportsSkuIdentity: unknownCapability(),
    supportsFormatIdentity: unknownCapability(),
    supportsTerritorySegmentation: unknownCapability(),
  });
}

export function createDefaultOffProviderDescriptor(input: Readonly<{
  providerId: string;
  providerName: string;
  capabilities?: Partial<DirectAlbumProviderCapabilities>;
  blockers?: readonly string[];
  evidenceIds?: readonly string[];
}>): DirectAlbumProviderDescriptor {
  return Object.freeze({
    contractVersion: DIRECT_ALBUM_PROVIDER_CONTRACT_VERSION,
    providerId: input.providerId,
    providerName: input.providerName,
    sourceFamily: 'direct-album-provider',
    onboarding: createDefaultOffOnboarding({
      sourceId: input.providerId,
      sourceName: input.providerName,
      blockers: input.blockers,
      evidenceIds: input.evidenceIds,
    }),
    capabilities: Object.freeze({
      ...unknownAlbumProviderCapabilities(),
      ...(input.capabilities ?? {}),
    }),
    defaultOff: Object.freeze({
      enabled: false,
      liveCallsAllowed: false,
      researchAllowed: false,
      productionAllowed: false,
    }),
  });
}

export const CIRCLE_PROVIDER_DESCRIPTOR = createDefaultOffProviderDescriptor({
  providerId: 'circle-chart',
  providerName: 'Circle Chart',
  blockers: ['official-product-schema-not-intaked', 'acquisition-rights-unresolved'],
});

export const HANTEO_PROVIDER_DESCRIPTOR = createDefaultOffProviderDescriptor({
  providerId: 'hanteo-chart',
  providerName: 'Hanteo Chart',
  blockers: ['official-product-schema-not-intaked', 'acquisition-rights-unresolved'],
});

export const DIRECT_ALBUM_PROVIDER_REGISTRY: Readonly<Record<string, DirectAlbumProviderDescriptor>> = Object.freeze({
  [CIRCLE_PROVIDER_DESCRIPTOR.providerId]: CIRCLE_PROVIDER_DESCRIPTOR,
  [HANTEO_PROVIDER_DESCRIPTOR.providerId]: HANTEO_PROVIDER_DESCRIPTOR,
});

export function buildDirectAlbumObservationId(input: Readonly<{
  providerId: string;
  providerObservationId: string | null;
  providerArtistId: string | null;
  providerReleaseId: string | null;
  providerEditionId: string | null;
  providerSkuId: string | null;
  semantic: DirectAlbumObservationSemantic;
  value: number | null;
  unit: DirectAlbumObservationUnit;
  territory: string | null;
  format: string | null;
  providerPeriod: string | null;
  revisionId: string | null;
}>): string {
  return sha256Canonical({
    contractVersion: DIRECT_ALBUM_OBSERVATION_CONTRACT_VERSION,
    providerId: input.providerId,
    providerObservationId: input.providerObservationId,
    providerArtistId: input.providerArtistId,
    providerReleaseId: input.providerReleaseId,
    providerEditionId: input.providerEditionId,
    providerSkuId: input.providerSkuId,
    semantic: input.semantic,
    value: input.value,
    unit: input.unit,
    territory: input.territory,
    format: input.format,
    providerPeriod: input.providerPeriod,
    revisionId: input.revisionId,
  });
}

export function buildDirectAlbumObservation(
  draft: DirectAlbumObservationDraft,
): DirectAlbumObservation {
  const observationId = draft.observationId ?? buildDirectAlbumObservationId(draft);
  const evidenceDigest = draft.evidenceDigest ?? sha256Canonical({
    contractVersion: DIRECT_ALBUM_OBSERVATION_CONTRACT_VERSION,
    observationId,
    providerId: draft.providerId,
    providerObservationId: draft.providerObservationId,
    semantic: draft.semantic,
    value: draft.value,
    unit: draft.unit,
    providerPeriod: draft.providerPeriod,
    revisionId: draft.revisionId,
  });
  return Object.freeze({ ...draft, observationId, evidenceDigest });
}

export type ObservationValidation = Readonly<{
  valid: boolean;
  issues: readonly string[];
}>;

export function validateDirectAlbumObservation(
  observation: DirectAlbumObservation,
  descriptor: DirectAlbumProviderDescriptor,
  options: Readonly<{ allowSyntheticUnknownCapabilities?: boolean }> = {},
): ObservationValidation {
  const issues: string[] = [];
  const allowedUnits = UNIT_BY_SEMANTIC[observation.semantic];
  if (!allowedUnits.includes(observation.unit)) issues.push('semantic-unit-mismatch');
  if (observation.semantic === 'rank' && observation.unit === 'physical-units') {
    issues.push('rank-cannot-be-physical-units');
  }
  if (observation.semantic === 'index' && observation.unit === 'physical-units') {
    issues.push('index-cannot-be-physical-units');
  }
  const capabilityKey = capabilityForSemantic(observation.semantic);
  if (capabilityKey) {
    const capability = descriptor.capabilities[capabilityKey];
    if (capability.state === 'false') issues.push(`capability-${capabilityKey}-unsupported`);
    if (capability.state === 'unknown'
      && !(options.allowSyntheticUnknownCapabilities && observation.syntheticFixture)) {
      issues.push(`capability-${capabilityKey}-unknown`);
    }
  }
  if (observation.supersedesObservationId && !observation.revisionId) {
    issues.push('supersession-requires-revision-id');
  }
  if (observation.providerId !== descriptor.providerId) issues.push('provider-descriptor-mismatch');
  if (observation.value === null && observation.unit !== 'unknown') issues.push('missing-value-unit-mismatch');
  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze(issues.sort()) });
}

function capabilityForSemantic(
  semantic: DirectAlbumObservationSemantic,
): keyof DirectAlbumProviderCapabilities | null {
  switch (semantic) {
    case 'period-sale':
    case 'consumer-retail-sale':
    case 'retailer-panel-sale':
      return 'supportsNativePeriodSales';
    case 'first-week-sale': return 'supportsFirstWeekSales';
    case 'cumulative-sale': return 'supportsCumulativeSales';
    default: return null;
  }
}

export function validateObservationSet(
  observations: readonly DirectAlbumObservation[],
): ObservationValidation {
  const issues: string[] = [];
  const providers = new Set(observations.map((observation) => observation.providerId));
  if (providers.size > 1) issues.push('raw-provider-sum-forbidden');

  const byScope = new Map<string, DirectAlbumObservation[]>();
  for (const observation of observations) {
    const scope = [
      observation.providerId,
      observation.providerReleaseId ?? observation.fandexReleaseId ?? 'unknown-release',
      observation.semantic,
      observation.providerPeriod ?? 'unknown-period',
      observation.territory ?? 'unknown-territory',
    ].join('|');
    const group = byScope.get(scope) ?? [];
    group.push(observation);
    byScope.set(scope, group);
  }
  for (const group of byScope.values()) {
    const hasParent = group.some((observation) => observation.scopeRole === 'release-total');
    const hasChild = group.some((observation) => observation.scopeRole === 'child-sku'
      || observation.scopeRole === 'format-child');
    if (hasParent && hasChild) issues.push('release-parent-child-additive-sum-forbidden');
  }

  const territories = new Set(observations.map((observation) => observation.territory).filter(Boolean));
  if (territories.has('Global') && territories.size > 1) {
    issues.push('overlapping-territory-scope-unknown');
  }
  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze([...new Set(issues)].sort()) });
}

export type DirectAlbumFeatureEvidence = Readonly<{
  kind: 'direct-provider-observation';
  observation: DirectAlbumObservation;
  evidence: AlternativeEvidence;
}>;

export function bridgeDirectAlbumObservation(
  observation: DirectAlbumObservation,
  evidence: AlternativeEvidence,
): DirectAlbumFeatureEvidence {
  const allowed: readonly AlternativeEvidenceOrigin[] = [
    'direct-licensed-provider',
    'authorized-public-api',
  ];
  if (!allowed.includes(evidence.origin)) {
    throw new Error('direct-observation-provenance-mismatch');
  }
  if (evidence.reportedProvider && evidence.reportedProvider !== observation.providerId) {
    throw new Error('direct-observation-reported-provider-mismatch');
  }
  return Object.freeze({ kind: 'direct-provider-observation', observation, evidence });
}

export type DirectAlbumAvailability =
  | 'available'
  | 'missing'
  | 'not-available'
  | 'proxy-fallback-candidate';

export function directAlbumUnavailableState(): DirectAlbumAvailability {
  return 'not-available';
}
