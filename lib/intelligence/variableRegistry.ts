import type { FandexObservationV1 } from './observationContracts';

export const FANDEX_VARIABLE_REGISTRY_CONTRACT_VERSION = 'fandex-variable-registry-v1' as const;

export const FANDEX_VARIABLE_KINDS = Object.freeze([
  'canonical',
  'provider-intermediate',
] as const);
export type FandexVariableKind = typeof FANDEX_VARIABLE_KINDS[number];

export const FANDEX_VARIABLE_FAMILIES = Object.freeze([
  'music',
  'album',
  'video',
  'search',
  'media',
  'social',
  'fandom',
  'concert',
  'merchandise',
  'broadcast',
  'brand',
] as const);
export type FandexVariableFamily = typeof FANDEX_VARIABLE_FAMILIES[number];

export const FANDEX_VARIABLE_MEASURE_TYPES = Object.freeze([
  'count',
  'flow',
  'stock',
  'rate',
  'ratio',
  'rank',
  'index',
  'state',
] as const);
export type FandexVariableMeasureType = typeof FANDEX_VARIABLE_MEASURE_TYPES[number];

export const FANDEX_VARIABLE_ROLES = Object.freeze([
  'core',
  'primary',
  'secondary',
  'context',
  'leading',
  'diagnostic',
] as const);
export type FandexVariableRole = typeof FANDEX_VARIABLE_ROLES[number];

export const FANDEX_VARIABLE_LIFECYCLES = Object.freeze([
  'concept',
  'research',
  'shadow',
  'production-candidate',
  'production',
] as const);
export type FandexVariableLifecycle = typeof FANDEX_VARIABLE_LIFECYCLES[number];

export type FandexVariableDefinitionV1 = Readonly<{
  variableId: string;
  kind: FandexVariableKind;
  family: FandexVariableFamily;
  measureType: FandexVariableMeasureType;
  role: FandexVariableRole;
  lifecycle: FandexVariableLifecycle;
  construct: string;
  unit: string | null;
  supportedEntityTypes: readonly string[];
  temporalSemantics: Readonly<{
    providerPeriodRequired: boolean;
    observedAtRequired: boolean;
    collectionTimeRequired: boolean;
  }>;
  sourceProviderId?: string | null;
  directProductionContributionEligible: boolean;
  blockers: readonly string[];
  contractVersion: typeof FANDEX_VARIABLE_REGISTRY_CONTRACT_VERSION;
}>;

const isOneOf = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && values.includes(value as T);

const orderedUnique = (values: readonly string[], error: string): readonly string[] => {
  if (values.some((value) => typeof value !== 'string' || value.trim() === '')) throw new Error(error);
  return Object.freeze([...new Set(values)].sort((left, right) => left.localeCompare(right)));
};

export function validateFandexVariableDefinition(
  input: FandexVariableDefinitionV1,
): FandexVariableDefinitionV1 {
  if (typeof input.variableId !== 'string' || input.variableId.trim() === '') throw new Error('fandex_variable_id_invalid');
  if (!isOneOf(FANDEX_VARIABLE_KINDS, input.kind)) throw new Error('fandex_variable_kind_invalid');
  if (!isOneOf(FANDEX_VARIABLE_FAMILIES, input.family)) throw new Error('fandex_variable_family_invalid');
  if (!isOneOf(FANDEX_VARIABLE_MEASURE_TYPES, input.measureType)) throw new Error('fandex_variable_measure_type_invalid');
  if (!isOneOf(FANDEX_VARIABLE_ROLES, input.role)) throw new Error('fandex_variable_role_invalid');
  if (!isOneOf(FANDEX_VARIABLE_LIFECYCLES, input.lifecycle)) throw new Error('fandex_variable_lifecycle_invalid');
  if (typeof input.construct !== 'string' || input.construct.trim() === '') throw new Error('fandex_variable_construct_invalid');
  if (input.unit !== null && (typeof input.unit !== 'string' || input.unit.trim() === '')) throw new Error('fandex_variable_unit_invalid');
  if (!Array.isArray(input.supportedEntityTypes) || input.supportedEntityTypes.length === 0) throw new Error('fandex_variable_entity_types_empty');
  if (!input.temporalSemantics || typeof input.temporalSemantics !== 'object') throw new Error('fandex_variable_temporal_semantics_invalid');
  for (const key of ['providerPeriodRequired', 'observedAtRequired', 'collectionTimeRequired'] as const) {
    if (typeof input.temporalSemantics[key] !== 'boolean') throw new Error('fandex_variable_temporal_semantics_invalid');
  }
  if (input.sourceProviderId !== null && input.sourceProviderId !== undefined
      && (typeof input.sourceProviderId !== 'string' || input.sourceProviderId.trim() === '')) {
    throw new Error('fandex_variable_provider_invalid');
  }
  if (typeof input.directProductionContributionEligible !== 'boolean') throw new Error('fandex_variable_production_eligibility_invalid');
  if (input.kind === 'provider-intermediate' && input.directProductionContributionEligible) {
    throw new Error('fandex_provider_intermediate_production_forbidden');
  }
  if (input.contractVersion !== FANDEX_VARIABLE_REGISTRY_CONTRACT_VERSION) throw new Error('fandex_variable_contract_version_invalid');
  const supportedEntityTypes = orderedUnique(input.supportedEntityTypes, 'fandex_variable_entity_type_invalid');
  const blockers = orderedUnique(input.blockers, 'fandex_variable_blocker_invalid');
  return Object.freeze({
    ...input,
    sourceProviderId: input.sourceProviderId ?? null,
    supportedEntityTypes,
    temporalSemantics: Object.freeze({ ...input.temporalSemantics }),
    blockers,
  });
}

export type FandexVariableRegistryV1 = Readonly<{
  get: (variableId: string) => FandexVariableDefinitionV1 | null;
  has: (variableId: string) => boolean;
  list: () => readonly FandexVariableDefinitionV1[];
}>;

export function createFandexVariableRegistry(
  definitions: readonly FandexVariableDefinitionV1[],
): FandexVariableRegistryV1 {
  const normalized = definitions.map(validateFandexVariableDefinition)
    .sort((left, right) => left.variableId.localeCompare(right.variableId));
  if (new Set(normalized.map((definition) => definition.variableId)).size !== normalized.length) {
    throw new Error('fandex_variable_id_duplicate');
  }
  const entries = Object.freeze(normalized);
  const byId = new Map(entries.map((definition) => [definition.variableId, definition]));
  return Object.freeze({
    get: (variableId: string) => byId.get(variableId) ?? null,
    has: (variableId: string) => byId.has(variableId),
    list: () => entries,
  });
}

export const NAVER_NORMALIZED_RECORD_PRESENCE_VARIABLE: FandexVariableDefinitionV1 = validateFandexVariableDefinition({
  variableId: 'naver-news.normalized-record-presence',
  kind: 'provider-intermediate',
  family: 'media',
  measureType: 'state',
  role: 'diagnostic',
  lifecycle: 'research',
  construct: 'existence of a normalized NAVER News evidence record',
  unit: null,
  supportedEntityTypes: ['news_article'],
  temporalSemantics: {
    providerPeriodRequired: true,
    observedAtRequired: false,
    collectionTimeRequired: true,
  },
  sourceProviderId: 'naver-news',
  directProductionContributionEligible: false,
  blockers: ['provider-intermediate-not-direct-production'],
  contractVersion: FANDEX_VARIABLE_REGISTRY_CONTRACT_VERSION,
});

export const FANDEX_VARIABLE_REGISTRY = createFandexVariableRegistry([
  NAVER_NORMALIZED_RECORD_PRESENCE_VARIABLE,
]);

export function getFandexVariableDefinition(variableId: string): FandexVariableDefinitionV1 | null {
  return FANDEX_VARIABLE_REGISTRY.get(variableId);
}

export function hasFandexVariableDefinition(variableId: string): boolean {
  return FANDEX_VARIABLE_REGISTRY.has(variableId);
}

export function listFandexVariableDefinitions(): readonly FandexVariableDefinitionV1[] {
  return FANDEX_VARIABLE_REGISTRY.list();
}

export function validateObservationVariableBinding(
  observation: FandexObservationV1,
  definition: FandexVariableDefinitionV1,
): void {
  if (observation.variable.variableId !== definition.variableId) throw new Error('fandex_observation_variable_id_mismatch');
  if (!definition.supportedEntityTypes.includes(observation.entity.entityType)) throw new Error('fandex_observation_entity_type_unsupported');
  if (definition.unit !== null && observation.value.unit !== definition.unit) throw new Error('fandex_observation_unit_mismatch');
  if (definition.sourceProviderId !== null && definition.sourceProviderId !== undefined
      && observation.providerId !== definition.sourceProviderId) {
    throw new Error('fandex_observation_provider_mismatch');
  }
  if (definition.temporalSemantics.providerPeriodRequired
      && observation.time.providerPeriodStart == null && observation.time.providerPeriodEnd == null) {
    throw new Error('fandex_observation_provider_period_required');
  }
  if (definition.temporalSemantics.observedAtRequired && observation.time.observedAt == null) {
    throw new Error('fandex_observation_observed_at_required');
  }
  if (definition.temporalSemantics.collectionTimeRequired && observation.time.collectedAt == null) {
    throw new Error('fandex_observation_collection_time_required');
  }
}
