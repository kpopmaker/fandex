import type { FandexConfidenceState } from './confidence';
import type { FandexDataLifecycleState } from './productionState';

export const FANDEX_RIGHTS_GATE_STATES = Object.freeze(['allow', 'restricted', 'deny', 'unknown'] as const);
export type FandexRightsGateState = typeof FANDEX_RIGHTS_GATE_STATES[number];
export const FANDEX_PUBLICATION_STATUSES = Object.freeze([
  'publishable', 'publishable-with-limitation', 'insufficient-evidence', 'blocked',
] as const);
export type FandexPublicationStatus = typeof FANDEX_PUBLICATION_STATUSES[number];

export type FandexPublicationDecisionV1 = Readonly<{
  status: FandexPublicationStatus;
  blockers: readonly string[];
  confidenceState: FandexConfidenceState;
  rightsState: FandexRightsGateState;
  lifecycleState: FandexDataLifecycleState;
  directProductionContributionEligible: boolean;
}>;

const isRightsState = (value: unknown): value is FandexRightsGateState =>
  typeof value === 'string' && FANDEX_RIGHTS_GATE_STATES.includes(value as FandexRightsGateState);

export function evaluateFandexPublication(input: Readonly<{
  confidenceState: FandexConfidenceState;
  rightsState: FandexRightsGateState;
  lifecycleState: FandexDataLifecycleState;
  directProductionContributionEligible: boolean;
}>): FandexPublicationDecisionV1 {
  const blockers: string[] = [];
  if (!isRightsState(input.rightsState)) throw new Error('fandex_rights_state_invalid');
  if (!['high', 'moderate', 'low', 'insufficient'].includes(input.confidenceState)) throw new Error('fandex_confidence_state_invalid');
  if (input.rightsState === 'deny') blockers.push('rights-denied');
  if (input.rightsState === 'unknown') blockers.push('rights-unknown');
  if (input.lifecycleState === 'blocked') blockers.push('lifecycle-blocked');
  if (input.lifecycleState !== 'production') blockers.push('lifecycle-not-production');
  if (!input.directProductionContributionEligible) blockers.push('variable-not-production-eligible');
  let status: FandexPublicationStatus;
  if (blockers.length > 0) status = 'blocked';
  else if (input.confidenceState === 'insufficient') status = 'insufficient-evidence';
  else if (input.rightsState === 'restricted' || input.confidenceState === 'low') status = 'publishable-with-limitation';
  else status = 'publishable';
  return Object.freeze({
    status,
    blockers: Object.freeze([...new Set(blockers)].sort((a, b) => a.localeCompare(b))),
    confidenceState: input.confidenceState,
    rightsState: input.rightsState,
    lifecycleState: input.lifecycleState,
    directProductionContributionEligible: input.directProductionContributionEligible,
  });
}
