import type { FandexDataLifecycle } from './productionState';

export const FANDEX_OBSERVATION_CONTRACT_VERSION = 'fandex-observation-v1' as const;

export const FANDEX_OBSERVATION_MISSING_STATES = Object.freeze([
  'observed',
  'missing',
  'not-applicable',
  'insufficient',
  'blocked',
] as const);

export type FandexObservationMissingState = typeof FANDEX_OBSERVATION_MISSING_STATES[number];

export type FandexObservationV1 = Readonly<{
  observationId: string;
  providerId: string;
  entity: Readonly<{
    entityType: string;
    entityId: string | null;
    providerEntityId?: string | null;
    identityState: string;
  }>;
  variable: Readonly<{
    variableId: string;
    metricFamily: string;
    role?: string | null;
  }>;
  value: Readonly<{
    rawValue: number | string | boolean | null;
    normalizedValue?: number | null;
    unit: string | null;
    missingState: FandexObservationMissingState;
  }>;
  time: Readonly<{
    providerPeriodStart?: string | null;
    providerPeriodEnd?: string | null;
    observedAt?: string | null;
    collectedAt: string;
  }>;
  evidence: Readonly<{
    evidenceRef: string;
    revision?: string | number | null;
    conflictState?: string | null;
  }>;
  lifecycle: FandexDataLifecycle;
  contractVersion: typeof FANDEX_OBSERVATION_CONTRACT_VERSION;
}>;

export type FandexObservationDraft = Omit<FandexObservationV1, 'observationId'>;
