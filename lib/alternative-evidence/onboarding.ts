export const SOURCE_ONBOARDING_CONTRACT_VERSION = 'source-onboarding-v1';

export type SourceOnboardingStage =
  | 'contract-only'
  | 'fixture-validated'
  | 'official-docs-verified'
  | 'live-adapter-default-off'
  | 'bounded-research'
  | 'shadow'
  | 'production-candidate'
  | 'production-default-off'
  | 'active'
  | 'suspended';

export type SourceAuthorizationState =
  | 'unknown'
  | 'review-required'
  | 'contract-required'
  | 'allowed'
  | 'allowed-with-conditions'
  | 'blocked';

export type SourceAuthorizationDimensions = Readonly<{
  acquisitionState: SourceAuthorizationState;
  automationState: SourceAuthorizationState;
  rawStorageState: SourceAuthorizationState;
  normalizedStorageState: SourceAuthorizationState;
  retentionState: SourceAuthorizationState;
  commercialUseState: SourceAuthorizationState;
  derivedPublicationState: SourceAuthorizationState;
  rawRedistributionState: SourceAuthorizationState;
}>;

export type SourceTechnicalReadiness =
  | 'not-ready'
  | 'contract-ready'
  | 'fixture-ready'
  | 'adapter-ready';

export type SourceOnboardingRecord = Readonly<{
  contractVersion: typeof SOURCE_ONBOARDING_CONTRACT_VERSION;
  sourceId: string;
  sourceName: string;
  currentStage: SourceOnboardingStage;
  technicalReadiness: SourceTechnicalReadiness;
  authorization: SourceAuthorizationDimensions;
  enabled: boolean;
  liveCallsAllowed: boolean;
  researchAllowed: boolean;
  productionAllowed: boolean;
  evidenceIds: readonly string[];
  blockers: readonly string[];
}>;

const STAGE_ORDER: Readonly<Record<SourceOnboardingStage, number>> = Object.freeze({
  'contract-only': 0,
  'fixture-validated': 1,
  'official-docs-verified': 2,
  'live-adapter-default-off': 3,
  'bounded-research': 4,
  shadow: 5,
  'production-candidate': 6,
  'production-default-off': 7,
  active: 8,
  suspended: -1,
});

const AUTHORIZATION_KEYS: readonly (keyof SourceAuthorizationDimensions)[] = [
  'acquisitionState',
  'automationState',
  'rawStorageState',
  'normalizedStorageState',
  'retentionState',
  'commercialUseState',
  'derivedPublicationState',
  'rawRedistributionState',
];

export function createDefaultOffAuthorization(): SourceAuthorizationDimensions {
  return Object.freeze({
    acquisitionState: 'unknown',
    automationState: 'unknown',
    rawStorageState: 'unknown',
    normalizedStorageState: 'unknown',
    retentionState: 'unknown',
    commercialUseState: 'unknown',
    derivedPublicationState: 'unknown',
    rawRedistributionState: 'unknown',
  });
}

export function createDefaultOffOnboarding(input: Readonly<{
  sourceId: string;
  sourceName: string;
  stage?: SourceOnboardingStage;
  technicalReadiness?: SourceTechnicalReadiness;
  authorization?: Partial<SourceAuthorizationDimensions>;
  evidenceIds?: readonly string[];
  blockers?: readonly string[];
}>): SourceOnboardingRecord {
  const authorization = {
    ...createDefaultOffAuthorization(),
    ...(input.authorization ?? {}),
  };
  return Object.freeze({
    contractVersion: SOURCE_ONBOARDING_CONTRACT_VERSION,
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    currentStage: input.stage ?? 'contract-only',
    technicalReadiness: input.technicalReadiness ?? 'contract-ready',
    authorization: Object.freeze(authorization),
    enabled: false,
    liveCallsAllowed: false,
    researchAllowed: false,
    productionAllowed: false,
    evidenceIds: Object.freeze([...(input.evidenceIds ?? [])]),
    blockers: Object.freeze([...(input.blockers ?? [])]),
  });
}

export function validateSourceOnboarding(record: SourceOnboardingRecord): Readonly<{
  valid: boolean;
  issues: readonly string[];
}> {
  const issues: string[] = [];
  if (record.contractVersion !== SOURCE_ONBOARDING_CONTRACT_VERSION) {
    issues.push('contract-version-invalid');
  }
  if (record.sourceId.trim() === '' || record.sourceName.trim() === '') {
    issues.push('source-identity-missing');
  }
  if (record.currentStage !== 'suspended'
    && record.currentStage !== 'contract-only'
    && record.technicalReadiness === 'not-ready') {
    issues.push('stage-technical-readiness-mismatch');
  }
  if (record.currentStage === 'active') {
    for (const key of AUTHORIZATION_KEYS) {
      const state = record.authorization[key];
      if (state !== 'allowed' && state !== 'allowed-with-conditions') {
        issues.push(`active-${key}-not-authorized`);
      }
    }
    if (!record.enabled || !record.liveCallsAllowed || !record.productionAllowed) {
      issues.push('active-flags-invalid');
    }
  }
  if (record.enabled && !record.liveCallsAllowed) {
    issues.push('enabled-live-calls-disabled');
  }
  if (record.productionAllowed && !record.enabled) {
    issues.push('production-enabled-mismatch');
  }
  if (record.currentStage === 'production-default-off'
    && (record.enabled || record.productionAllowed)) {
    issues.push('production-default-off-flags-invalid');
  }
  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze(issues.sort()) });
}

export function canAdvanceSourceOnboarding(
  from: SourceOnboardingStage,
  to: SourceOnboardingStage,
): boolean {
  if (from === 'suspended' || to === 'suspended') return false;
  return STAGE_ORDER[to] >= STAGE_ORDER[from];
}

export function isAuthorizationGranted(state: SourceAuthorizationState): boolean {
  return state === 'allowed' || state === 'allowed-with-conditions';
}
