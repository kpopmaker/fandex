import { sha256Canonical } from '../shared/canonicalDigest';
import type { AlternativeEvidence, AlternativeEvidenceOrigin } from './contracts';
import {
  createDefaultOffOnboarding,
  type SourceAuthorizationDimensions,
  type SourceOnboardingRecord,
} from './onboarding';

export const RETAIL_OBSERVATION_CONTRACT_VERSION = 'retail-observation-v1';

export type RetailObservationSemantic =
  | 'retail-rank'
  | 'retail-provider-index'
  | 'retail-product-observation'
  | 'unknown';

export type RetailChartType = 'realtime' | 'daily' | 'monthly' | 'unknown';
export type RetailMissingState = 'observed' | 'missing' | 'not-ranked' | 'unknown';
export type RetailProviderPeriodState = 'resolved' | 'unresolved';

export type RetailProductIdentity = Readonly<{
  retailerId: string;
  retailerProductId: string;
  identityState: 'candidate' | 'resolved' | 'unresolved';
}>;

export type RetailObservation = Readonly<{
  contractVersion: typeof RETAIL_OBSERVATION_CONTRACT_VERSION;
  observationId: string;
  retailerId: string;
  retailerProductId: string | null;
  productIdentity: RetailProductIdentity | null;
  fandexArtistId: string | null;
  fandexReleaseId: string | null;
  fandexReleaseFamilyId: string | null;
  retailerArtistText: string | null;
  retailerTitle: string | null;
  categoryFamily: 'music' | 'unknown';
  providerCategoryId: string | null;
  categoryResolutionState: 'resolved' | 'unresolved' | 'unknown';
  chartType: RetailChartType;
  semantic: RetailObservationSemantic;
  rank: number | null;
  movement: number | null;
  providerIndex: number | null;
  providerIndexName: string | null;
  providerPeriod: string | null;
  providerPeriodState: RetailProviderPeriodState;
  providerPublishedAt: string | null;
  observedAt: string;
  collectedAt: string;
  sourceType: 'yes24-official-api' | 'retailer-official-api' | 'synthetic-fixture' | 'unknown';
  missingState: RetailMissingState;
  evidenceDigest: string;
  syntheticFixture: boolean;
}>;

export type RetailObservationDraft = Omit<RetailObservation, 'observationId' | 'evidenceDigest'> & {
  observationId?: string;
  evidenceDigest?: string;
};

export type RetailObservationValidation = Readonly<{
  valid: boolean;
  issues: readonly string[];
}>;

export function buildRetailObservationId(input: Readonly<{
  retailerId: string;
  retailerProductId: string | null;
  chartType: RetailChartType;
  providerPeriod: string | null;
  semantic: RetailObservationSemantic;
  rank: number | null;
  providerIndex: number | null;
  providerPublishedAt: string | null;
  providerCategoryId: string | null;
}>): string {
  return sha256Canonical({ contractVersion: RETAIL_OBSERVATION_CONTRACT_VERSION, ...input });
}

export function buildRetailObservation(draft: RetailObservationDraft): RetailObservation {
  const observationId = draft.observationId ?? buildRetailObservationId(draft);
  const evidenceDigest = draft.evidenceDigest ?? sha256Canonical({
    contractVersion: RETAIL_OBSERVATION_CONTRACT_VERSION,
    observationId,
    retailerId: draft.retailerId,
    retailerProductId: draft.retailerProductId,
    semantic: draft.semantic,
    rank: draft.rank,
    providerIndex: draft.providerIndex,
    providerPeriod: draft.providerPeriod,
    providerPublishedAt: draft.providerPublishedAt,
  });
  return Object.freeze({ ...draft, observationId, evidenceDigest });
}

export function validateRetailObservation(
  observation: RetailObservation,
): RetailObservationValidation {
  const issues: string[] = [];
  if (observation.contractVersion !== RETAIL_OBSERVATION_CONTRACT_VERSION) {
    issues.push('contract-version-invalid');
  }
  if (observation.retailerId.trim() === '') issues.push('retailer-id-missing');
  if (observation.retailerProductId !== null && observation.retailerProductId.trim() === '') {
    issues.push('retailer-product-id-invalid');
  }
  if (observation.semantic === 'retail-rank') {
    if (!Number.isInteger(observation.rank) || (observation.rank ?? 0) <= 0) {
      issues.push('rank-must-be-positive-integer');
    }
    if (observation.providerIndex !== null) issues.push('rank-observation-cannot-carry-index');
  }
  if (observation.semantic === 'retail-provider-index') {
    if (observation.providerIndex === null || !Number.isFinite(observation.providerIndex)) {
      issues.push('provider-index-must-be-finite');
    }
    if (!observation.providerIndexName) issues.push('provider-index-name-missing');
  }
  if (observation.semantic === 'retail-product-observation'
    && observation.rank === null && observation.providerIndex === null
    && observation.missingState === 'observed') {
    issues.push('product-observation-without-observable-field');
  }
  if (observation.rank !== null && (!Number.isInteger(observation.rank) || observation.rank <= 0)) {
    issues.push('rank-invalid');
  }
  if (observation.movement !== null && !Number.isInteger(observation.movement)) {
    issues.push('movement-must-be-integer');
  }
  if (observation.providerIndex !== null && !Number.isFinite(observation.providerIndex)) {
    issues.push('provider-index-not-finite');
  }
  if (observation.missingState === 'observed' && observation.retailerProductId === null) {
    issues.push('observed-product-id-missing');
  }
  if (observation.providerPeriodState === 'resolved' && observation.providerPeriod === null) {
    issues.push('resolved-period-missing');
  }
  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze([...new Set(issues)].sort()) });
}

export type RetailFeatureEvidence = Readonly<{
  kind: 'retailer-observation';
  observation: RetailObservation;
  evidence: AlternativeEvidence;
}>;

export function bridgeRetailObservation(
  observation: RetailObservation,
  evidence: AlternativeEvidence,
): RetailFeatureEvidence {
  const allowedOrigins: readonly AlternativeEvidenceOrigin[] = ['authorized-public-api'];
  if (!allowedOrigins.includes(evidence.origin)) throw new Error('retail-observation-provenance-mismatch');
  if (evidence.reportedProvider && evidence.reportedProvider !== observation.retailerId) {
    throw new Error('retail-observation-provider-mismatch');
  }
  return Object.freeze({ kind: 'retailer-observation', observation, evidence });
}

export type RetailProviderRateLimitContract = Readonly<{
  basicDaily: 20000;
  basicPerSecond: 10;
  partnerDaily: 100000;
  partnerPerSecond: 20;
  enterpriseDaily: 500000;
  enterprisePerSecond: 50;
  accountingScope: 'unknown' | 'review-required';
}>;

export type RetailProviderDescriptor = Readonly<{
  contractVersion: 'retail-provider-descriptor-v1';
  providerId: string;
  providerName: string;
  sourceFamily: 'retailer';
  onboarding: SourceOnboardingRecord;
  authorization: SourceAuthorizationDimensions;
  defaultOff: Readonly<{
    enabled: false;
    liveCallsAllowed: false;
    researchAllowed: false;
    productionAllowed: false;
  }>;
  rateLimit: RetailProviderRateLimitContract;
}>;

export const YES24_RETAIL_DESCRIPTOR: RetailProviderDescriptor = Object.freeze({
  contractVersion: 'retail-provider-descriptor-v1',
  providerId: 'yes24',
  providerName: 'YES24',
  sourceFamily: 'retailer',
  onboarding: createDefaultOffOnboarding({
    sourceId: 'yes24',
    sourceName: 'YES24',
    stage: 'live-adapter-default-off',
    technicalReadiness: 'adapter-ready',
    authorization: {
      acquisitionState: 'allowed-with-conditions',
      automationState: 'review-required',
      rawStorageState: 'review-required',
      normalizedStorageState: 'review-required',
      retentionState: 'review-required',
      commercialUseState: 'contract-required',
      derivedPublicationState: 'review-required',
      rawRedistributionState: 'blocked',
    },
    blockers: ['live-calls-disabled-by-default', 'credentials-not-configured', 'rights-gates-not-cleared'],
  }),
  authorization: Object.freeze({
    acquisitionState: 'allowed-with-conditions',
    automationState: 'review-required',
    rawStorageState: 'review-required',
    normalizedStorageState: 'review-required',
    retentionState: 'review-required',
    commercialUseState: 'contract-required',
    derivedPublicationState: 'review-required',
    rawRedistributionState: 'blocked',
  }),
  defaultOff: Object.freeze({
    enabled: false,
    liveCallsAllowed: false,
    researchAllowed: false,
    productionAllowed: false,
  }),
  rateLimit: Object.freeze({
    basicDaily: 20000,
    basicPerSecond: 10,
    partnerDaily: 100000,
    partnerPerSecond: 20,
    enterpriseDaily: 500000,
    enterprisePerSecond: 50,
    accountingScope: 'unknown',
  }),
});
