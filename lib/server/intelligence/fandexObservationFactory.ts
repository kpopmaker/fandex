import { sha256Canonical } from '../../shared/canonicalDigest';
import {
  FANDEX_OBSERVATION_CONTRACT_VERSION,
  FANDEX_OBSERVATION_MISSING_STATES,
  type FandexObservationDraft,
  type FandexObservationV1,
} from '../../intelligence/observationContracts';
import { createFandexDataLifecycle } from '../../intelligence/productionState';

function requiredText(value: unknown, error: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(error);
  return value;
}

function optionalText(value: unknown, error: string): string | null | undefined {
  if (value === null || value === undefined) return value;
  return requiredText(value, error);
}

function timestamp(value: unknown, error: string): string {
  const text = requiredText(value, error);
  if (!Number.isFinite(Date.parse(text))) throw new Error(error);
  return text;
}

function optionalTimestamp(value: unknown, error: string): string | null | undefined {
  if (value === null || value === undefined) return value;
  return timestamp(value, error);
}

function validateRevision(value: unknown): string | number | null | undefined {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string' && value.trim() !== '') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  throw new Error('fandex_observation_revision_invalid');
}

function identityTime(time: FandexObservationV1['time']) {
  const hasProviderOrObservationTime = [
    time.providerPeriodStart,
    time.providerPeriodEnd,
    time.observedAt,
  ].some((value) => value !== null && value !== undefined);
  return Object.freeze({
    providerPeriodStart: time.providerPeriodStart ?? null,
    providerPeriodEnd: time.providerPeriodEnd ?? null,
    observedAt: time.observedAt ?? null,
    collectedAtFallback: hasProviderOrObservationTime ? null : time.collectedAt,
  });
}

export function buildFandexObservationId(
  input: Pick<FandexObservationV1, 'providerId' | 'entity' | 'variable' | 'time' | 'evidence' | 'contractVersion'>,
): string {
  return sha256Canonical({
    contractVersion: input.contractVersion,
    providerId: input.providerId,
    entity: {
      entityType: input.entity.entityType,
      entityId: input.entity.entityId,
      providerEntityId: input.entity.providerEntityId ?? null,
    },
    variable: {
      variableId: input.variable.variableId,
      metricFamily: input.variable.metricFamily,
      role: input.variable.role ?? null,
    },
    time: identityTime(input.time),
    evidence: {
      evidenceRef: input.evidence.evidenceRef,
      revision: input.evidence.revision ?? null,
    },
  });
}

export function createFandexObservation(input: FandexObservationDraft): FandexObservationV1 {
  if (input.contractVersion !== FANDEX_OBSERVATION_CONTRACT_VERSION) {
    throw new Error('fandex_observation_contract_version_invalid');
  }

  const providerId = requiredText(input.providerId, 'fandex_observation_provider_id_invalid');
  const entity = Object.freeze({
    entityType: requiredText(input.entity?.entityType, 'fandex_observation_entity_type_invalid'),
    entityId: optionalText(input.entity?.entityId, 'fandex_observation_entity_id_invalid') ?? null,
    providerEntityId: optionalText(
      input.entity?.providerEntityId,
      'fandex_observation_provider_entity_id_invalid',
    ) ?? null,
    identityState: requiredText(
      input.entity?.identityState,
      'fandex_observation_identity_state_invalid',
    ),
  });
  const variable = Object.freeze({
    variableId: requiredText(input.variable?.variableId, 'fandex_observation_variable_id_invalid'),
    metricFamily: requiredText(input.variable?.metricFamily, 'fandex_observation_metric_family_invalid'),
    role: optionalText(input.variable?.role, 'fandex_observation_variable_role_invalid') ?? null,
  });

  if (!FANDEX_OBSERVATION_MISSING_STATES.includes(input.value?.missingState)) {
    throw new Error('fandex_observation_missing_state_invalid');
  }
  const rawValue = input.value?.rawValue;
  if (rawValue !== null && !['number', 'string', 'boolean'].includes(typeof rawValue)) {
    throw new Error('fandex_observation_raw_value_invalid');
  }
  if (typeof rawValue === 'number' && !Number.isFinite(rawValue)) {
    throw new Error('fandex_observation_raw_value_invalid');
  }
  const hasNormalizedValue = Object.prototype.hasOwnProperty.call(input.value, 'normalizedValue');
  const normalizedValue = input.value?.normalizedValue;
  if (hasNormalizedValue && normalizedValue !== null
      && (typeof normalizedValue !== 'number' || !Number.isFinite(normalizedValue))) {
    throw new Error('fandex_observation_normalized_value_invalid');
  }
  if (input.value.missingState === 'observed' && rawValue === null) {
    throw new Error('fandex_observation_observed_value_required');
  }
  if (input.value.missingState !== 'observed'
      && (rawValue !== null || normalizedValue !== null && normalizedValue !== undefined)) {
    throw new Error('fandex_observation_missing_value_must_be_null');
  }
  const unit = optionalText(input.value?.unit, 'fandex_observation_unit_invalid') ?? null;
  const value = Object.freeze({
    rawValue,
    ...(hasNormalizedValue ? { normalizedValue: normalizedValue ?? null } : {}),
    unit,
    missingState: input.value.missingState,
  });

  const time = Object.freeze({
    providerPeriodStart: optionalText(
      input.time?.providerPeriodStart,
      'fandex_observation_provider_period_start_invalid',
    ) ?? null,
    providerPeriodEnd: optionalText(
      input.time?.providerPeriodEnd,
      'fandex_observation_provider_period_end_invalid',
    ) ?? null,
    observedAt: optionalTimestamp(
      input.time?.observedAt,
      'fandex_observation_observed_at_invalid',
    ) ?? null,
    collectedAt: timestamp(input.time?.collectedAt, 'fandex_observation_collected_at_invalid'),
  });
  const evidence = Object.freeze({
    evidenceRef: requiredText(input.evidence?.evidenceRef, 'fandex_observation_evidence_ref_invalid'),
    revision: validateRevision(input.evidence?.revision) ?? null,
    conflictState: optionalText(
      input.evidence?.conflictState,
      'fandex_observation_conflict_state_invalid',
    ) ?? null,
  });
  const lifecycle = createFandexDataLifecycle(input.lifecycle);

  const observationId = buildFandexObservationId({
    providerId,
    entity,
    variable,
    time,
    evidence,
    contractVersion: FANDEX_OBSERVATION_CONTRACT_VERSION,
  });
  return Object.freeze({
    observationId,
    providerId,
    entity,
    variable,
    value,
    time,
    evidence,
    lifecycle,
    contractVersion: FANDEX_OBSERVATION_CONTRACT_VERSION,
  });
}
