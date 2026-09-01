export const FANDEX_DATA_LIFECYCLE_STATES = Object.freeze([
  'research',
  'shadow',
  'production-candidate',
  'production',
  'blocked',
] as const);

export type FandexDataLifecycleState = typeof FANDEX_DATA_LIFECYCLE_STATES[number];

export const FANDEX_DATA_MATERIAL_CLASSES = Object.freeze([
  'real',
  'fixture',
  'synthetic',
  'preview',
] as const);

export type FandexDataMaterialClass = typeof FANDEX_DATA_MATERIAL_CLASSES[number];

export type FandexDataLifecycle = Readonly<{
  state: FandexDataLifecycleState;
  materialClass: FandexDataMaterialClass;
  blockers: readonly string[];
}>;

export type FandexLifecycleMapping = Readonly<Record<string, FandexDataLifecycleState>>;

const NON_PRODUCTION_SOURCE_STATES = new Set([
  'research',
  'shadow',
  'production-candidate',
  'blocked',
  'ready',
  'readiness',
  'readiness-candidate',
  'eligible',
]);

const COMMON_SOURCE_STATE_PROJECTIONS: Readonly<Record<string, readonly FandexDataLifecycleState[]>> = Object.freeze({
  research: Object.freeze(['research', 'blocked'] as const),
  shadow: Object.freeze(['research', 'shadow', 'blocked'] as const),
  'production-candidate': Object.freeze(['research', 'shadow', 'production-candidate', 'blocked'] as const),
  blocked: Object.freeze(['blocked'] as const),
});

export function isFandexDataLifecycleState(value: unknown): value is FandexDataLifecycleState {
  return typeof value === 'string'
    && FANDEX_DATA_LIFECYCLE_STATES.includes(value as FandexDataLifecycleState);
}

export function isFandexDataMaterialClass(value: unknown): value is FandexDataMaterialClass {
  return typeof value === 'string'
    && FANDEX_DATA_MATERIAL_CLASSES.includes(value as FandexDataMaterialClass);
}

function orderedBlockers(blockers: readonly string[]): readonly string[] {
  if (blockers.some((blocker) => typeof blocker !== 'string' || blocker.trim() === '')) {
    throw new Error('fandex_lifecycle_blocker_invalid');
  }
  return Object.freeze([...new Set(blockers)].sort((left, right) => left.localeCompare(right)));
}

export function createFandexDataLifecycle(input: Readonly<{
  state: FandexDataLifecycleState;
  materialClass: FandexDataMaterialClass;
  blockers?: readonly string[];
}>): FandexDataLifecycle {
  if (!isFandexDataLifecycleState(input.state)) {
    throw new Error('fandex_lifecycle_state_invalid');
  }
  if (!isFandexDataMaterialClass(input.materialClass)) {
    throw new Error('fandex_material_class_invalid');
  }
  if (input.state === 'production' && input.materialClass !== 'real') {
    throw new Error('fandex_production_material_class_invalid');
  }
  return Object.freeze({
    state: input.state,
    materialClass: input.materialClass,
    blockers: orderedBlockers(input.blockers ?? []),
  });
}

export function mapFandexDataLifecycle(input: Readonly<{
  sourceState: unknown;
  materialClass: FandexDataMaterialClass;
  mapping: FandexLifecycleMapping;
  blockers?: readonly string[];
}>): FandexDataLifecycle {
  if (!isFandexDataMaterialClass(input.materialClass)) {
    throw new Error('fandex_material_class_invalid');
  }

  const baseBlockers = [...(input.blockers ?? [])];
  if (typeof input.sourceState !== 'string' || input.sourceState.trim() === '') {
    return createFandexDataLifecycle({
      state: 'blocked',
      materialClass: input.materialClass,
      blockers: [...baseBlockers, 'source-state-malformed'],
    });
  }

  if (!Object.prototype.hasOwnProperty.call(input.mapping, input.sourceState)) {
    return createFandexDataLifecycle({
      state: 'blocked',
      materialClass: input.materialClass,
      blockers: [...baseBlockers, 'source-state-unmapped'],
    });
  }

  const mappedState: unknown = input.mapping[input.sourceState];
  if (!isFandexDataLifecycleState(mappedState)) {
    return createFandexDataLifecycle({
      state: 'blocked',
      materialClass: input.materialClass,
      blockers: [...baseBlockers, 'lifecycle-mapping-invalid'],
    });
  }
  if (mappedState === 'production'
      && NON_PRODUCTION_SOURCE_STATES.has(input.sourceState.toLocaleLowerCase('en-US'))) {
    return createFandexDataLifecycle({
      state: 'blocked',
      materialClass: input.materialClass,
      blockers: [...baseBlockers, 'production-authorization-not-established'],
    });
  }
  const commonAllowedStates = COMMON_SOURCE_STATE_PROJECTIONS[input.sourceState];
  if (commonAllowedStates && !commonAllowedStates.includes(mappedState)) {
    return createFandexDataLifecycle({
      state: 'blocked',
      materialClass: input.materialClass,
      blockers: [...baseBlockers, 'source-state-promotion-invalid'],
    });
  }
  if (mappedState === 'production' && input.materialClass !== 'real') {
    return createFandexDataLifecycle({
      state: 'blocked',
      materialClass: input.materialClass,
      blockers: [...baseBlockers, 'production-material-incompatible'],
    });
  }
  return createFandexDataLifecycle({
    state: mappedState,
    materialClass: input.materialClass,
    blockers: baseBlockers,
  });
}
