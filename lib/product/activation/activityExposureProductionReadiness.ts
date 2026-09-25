import type {
  ProductActivityExposureReadModelResult,
} from '../contracts/productActivityExposure';
import { isSha256 } from '../../shared/canonicalDigest';

export const ACTIVITY_EXPOSURE_PRODUCTION_READINESS_CONTRACT_VERSION =
  'activity-exposure-production-readiness-v1' as const;

export type ActivityExposureProductionReadinessCheck =
  | 'target-identity'
  | 'observed-data-origin'
  | 'shadow-publication'
  | 'standard-presentation'
  | 'provider-coverage'
  | 'provider-availability'
  | 'stored-evidence-trace'
  | 'non-numeric-contract';

export type ActivityExposureProductionReadiness = Readonly<{
  contractVersion:
    typeof ACTIVITY_EXPOSURE_PRODUCTION_READINESS_CONTRACT_VERSION;
  target: Readonly<{
    artistId: 'iu';
    legacyVariableId: 'comebackActivityPoint';
    constructId: 'activityExposure';
  }>;
  status: 'ready-for-activation-authorization' | 'blocked';
  checks: Readonly<Record<ActivityExposureProductionReadinessCheck, boolean>>;
  eventCount: number | null;
  providerCount: number | null;
}>;

function noNumericContract(model: object) {
  return !('fact' in model) && !('score' in model) && !('value' in model);
}

export function evaluateActivityExposureProductionReadiness(
  result: ProductActivityExposureReadModelResult,
): ActivityExposureProductionReadiness {
  const blockedChecks: Record<ActivityExposureProductionReadinessCheck, boolean> = {
    'target-identity': false,
    'observed-data-origin': false,
    'shadow-publication': false,
    'standard-presentation': false,
    'provider-coverage': false,
    'provider-availability': false,
    'stored-evidence-trace': false,
    'non-numeric-contract': false,
  };

  if (result.status !== 'ok') {
    return Object.freeze({
      contractVersion: ACTIVITY_EXPOSURE_PRODUCTION_READINESS_CONTRACT_VERSION,
      target: Object.freeze({
        artistId: 'iu' as const,
        legacyVariableId: 'comebackActivityPoint' as const,
        constructId: 'activityExposure' as const,
      }),
      status: 'blocked' as const,
      checks: Object.freeze(blockedChecks),
      eventCount: null,
      providerCount: null,
    });
  }

  const { model } = result;
  const providers = new Map(
    model.providerCoverage.map((coverage) => [coverage.provider, coverage]),
  );
  const requiredProvidersPresent =
    providers.size === 2
    && providers.has('musicbrainz')
    && providers.has('youtube');
  const providersUsable = [...providers.values()].every(
    (coverage) =>
      coverage.collectionStatus !== 'credential_blocked'
      && coverage.collectionStatus !== 'provider_unavailable'
      && coverage.collectionStatus !== 'invalid'
      && coverage.coverageState !== 'provider_unavailable'
      && coverage.coverageState !== 'invalid',
  );
  const storedEvidenceTraceValid = model.events.every((event) => {
    const trace = event.storedEvidenceTrace;
    return (
      trace !== undefined
      && isSha256(trace.eventRecordId)
      && isSha256(trace.sourceObservationId)
    );
  });

  const checks: Record<ActivityExposureProductionReadinessCheck, boolean> = {
    'target-identity':
      model.identity.sourceArtistId === 'iu'
      && model.identity.constructId === 'activityExposure'
      && model.construct === 'Activity Exposure Event Stream',
    'observed-data-origin': model.dataOrigin === 'observed',
    'shadow-publication': model.publication === 'shadow',
    'standard-presentation': model.presentation === 'standard',
    'provider-coverage': requiredProvidersPresent,
    'provider-availability': requiredProvidersPresent && providersUsable,
    'stored-evidence-trace': storedEvidenceTraceValid,
    'non-numeric-contract': noNumericContract(model),
  };

  return Object.freeze({
    contractVersion: ACTIVITY_EXPOSURE_PRODUCTION_READINESS_CONTRACT_VERSION,
    target: Object.freeze({
      artistId: 'iu' as const,
      legacyVariableId: 'comebackActivityPoint' as const,
      constructId: 'activityExposure' as const,
    }),
    status: Object.values(checks).every(Boolean)
      ? 'ready-for-activation-authorization' as const
      : 'blocked' as const,
    checks: Object.freeze(checks),
    eventCount: model.events.length,
    providerCount: model.providerCoverage.length,
  });
}
