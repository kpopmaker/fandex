import {
  buildLuminateNormalizationFreezeInputsFromAuthorization,
  evaluateLuminateFandexAuthorizationGrant,
  projectLuminateProductionEvidenceFromAuthorization,
} from './luminateAlbumAuthorizationResearch';
import {
  evaluateAlbumNormalizationFreezeReadiness,
} from './albumProductionReadinessResearch';
import {
  assessIuLuminateLicensedBootstrap,
  type IuLuminateLicensedBootstrapManifest,
} from './iuLuminateLicensedBootstrapResearch';
import type {
  IuLuminateStoredNormalizationRead,
} from './luminateAlbumObservationStoredReaderResearch';

export const IU_LUMINATE_PRODUCTION_REVIEW_GATE_RESEARCH_VERSION =
  'iu-luminate-production-review-gate-research-v1' as const;

export const IU_LUMINATE_PRODUCTION_REVIEW_GATE_RESEARCH_DESCRIPTOR = Object.freeze({
  contractVersion: IU_LUMINATE_PRODUCTION_REVIEW_GATE_RESEARCH_VERSION,
  lifecycle: 'research' as const,
  providerId: 'luminate-music' as const,
  construct: 'physical completed-purchase-class sales reaction' as const,
  outputState: 'production-review-readiness-only' as const,
  productActivationAllowedByThisGate: false as const,
  productPublicationAllowedByThisGate: false as const,
  methodologyFreezePerformedByThisGate: false as const,
  methodologyLockCreatedByThisGate: false as const,
  productionDatabaseWritePerformed: false as const,
  sameExecutedAgreementLineageRequiredForInitialGoldenPath: true as const,
  sameWriteGrantSnapshotRequiredForInitialGoldenPath: true as const,
});

export type IuLuminateProductionReviewGateResult = Readonly<{
  state: 'eligible-for-production-review' | 'blocked';
  territory: 'US' | 'CA';
  providerState: 'ready' | 'blocked';
  bootstrapState: 'ready' | 'blocked';
  normalizationDefinitionState: 'ready-for-freeze-review' | 'blocked';
  normalizationDataState: IuLuminateStoredNormalizationRead['resolution']['state'];
  authorizationLineageState: 'matched' | 'blocked';
  currentFeatureInputId: string | null;
  baselineFeatureInputId: string | null;
  relativeChange: number | null;
  blockers: readonly string[];
}>;

function exactlyOneEqual(values: readonly string[], expected: string | null): boolean {
  return expected !== null && values.length === 1 && values[0] === expected;
}

export function evaluateIuLuminateProductionReviewGate(input: Readonly<{
  manifest: IuLuminateLicensedBootstrapManifest;
  storedRead: IuLuminateStoredNormalizationRead;
}>): IuLuminateProductionReviewGateResult {
  const blockers: string[] = [];
  const manifest = input.manifest;
  const storedRead = input.storedRead;

  const authorization = evaluateLuminateFandexAuthorizationGrant(manifest.grant);
  const provider = projectLuminateProductionEvidenceFromAuthorization(authorization);
  const bootstrap = assessIuLuminateLicensedBootstrap(manifest);
  const normalizationInputs = buildLuminateNormalizationFreezeInputsFromAuthorization(authorization);
  const normalizationDefinition = evaluateAlbumNormalizationFreezeReadiness(normalizationInputs);

  if (authorization.state !== 'eligible-for-provider-onboarding-review' || !authorization.rightsResolved) {
    blockers.push('iu-luminate-review-authorization-unresolved');
    blockers.push(...authorization.blockers);
  }

  if (provider.acquisitionRights !== 'allowed'
      || provider.normalizedStorageRights !== 'allowed'
      || provider.derivedPublicationRights !== 'allowed'
      || !provider.directObservationAuthorized
      || provider.periodSemantics !== 'verified'
      || provider.revisionSemantics !== 'verified') {
    blockers.push('iu-luminate-review-provider-evidence-not-ready');
  }

  if (bootstrap.state !== 'ready-for-licensed-extraction-review') {
    blockers.push('iu-luminate-review-bootstrap-not-ready');
    blockers.push(...bootstrap.blockers);
  }

  if (normalizationDefinition.state !== 'ready-for-freeze-review') {
    blockers.push('iu-luminate-review-normalization-definition-not-ready');
    blockers.push(...normalizationDefinition.blockers);
  }

  if (storedRead.resolution.territory !== manifest.territory) {
    blockers.push('iu-luminate-review-stored-territory-mismatch');
  }

  const expectedAgreement = manifest.grant.agreementEvidenceId;
  const expectedPostTermination = manifest.grant.postTerminationPolicyEvidenceId;
  const lineage = storedRead.authorizationLineage;

  if (!exactlyOneEqual(lineage.agreementEvidenceIds, expectedAgreement)) {
    blockers.push('iu-luminate-review-agreement-lineage-mismatch');
  }
  if (!exactlyOneEqual(lineage.postTerminationPolicyEvidenceIds, expectedPostTermination)) {
    blockers.push('iu-luminate-review-post-termination-lineage-mismatch');
  }
  if (!exactlyOneEqual(lineage.publicOutputModes, manifest.grant.publicOutputMode)) {
    blockers.push('iu-luminate-review-public-output-mode-lineage-mismatch');
  }
  if (!lineage.authorizedTerritories.includes(manifest.territory)) {
    blockers.push('iu-luminate-review-stored-territory-not-in-authorization-lineage');
  }
  if (lineage.writeGrantDigests.length !== 1) {
    blockers.push('iu-luminate-review-multiple-write-grant-snapshots-require-explicit-review');
  }

  const resolution = storedRead.resolution;
  if (resolution.state !== 'available' || !resolution.reaction) {
    blockers.push('iu-luminate-review-normalization-data-unavailable');
    blockers.push(...resolution.blockers);
  } else {
    if (resolution.reaction.baselineFeatureInputId === null) {
      blockers.push('iu-luminate-review-baseline-feature-input-missing');
    }
    if (resolution.reaction.relativeChange === null
        || !Number.isFinite(resolution.reaction.relativeChange)) {
      blockers.push('iu-luminate-review-relative-change-unavailable');
    }
    if (resolution.reaction.currentPhysicalUnits === null
        || resolution.reaction.currentPhysicalUnits <= 0) {
      blockers.push('iu-luminate-review-current-physical-units-invalid');
    }
    if (resolution.reaction.baselinePhysicalUnits === null
        || resolution.reaction.baselinePhysicalUnits <= 0) {
      blockers.push('iu-luminate-review-baseline-physical-units-invalid');
    }
  }

  const uniqueBlockers = Object.freeze([...new Set(blockers)]);
  const lineageState = uniqueBlockers.some((blocker) =>
    blocker.includes('lineage')
      || blocker.includes('write-grant-snapshots'))
    ? 'blocked' as const
    : 'matched' as const;

  return Object.freeze({
    state: uniqueBlockers.length === 0
      ? 'eligible-for-production-review' as const
      : 'blocked' as const,
    territory: manifest.territory,
    providerState: provider.acquisitionRights === 'allowed'
      && provider.normalizedStorageRights === 'allowed'
      && provider.derivedPublicationRights === 'allowed'
      && provider.directObservationAuthorized
      && provider.periodSemantics === 'verified'
      && provider.revisionSemantics === 'verified'
      ? 'ready' as const
      : 'blocked' as const,
    bootstrapState: bootstrap.state === 'ready-for-licensed-extraction-review'
      ? 'ready' as const
      : 'blocked' as const,
    normalizationDefinitionState: normalizationDefinition.state,
    normalizationDataState: resolution.state,
    authorizationLineageState: lineageState,
    currentFeatureInputId: resolution.reaction?.currentFeatureInputId ?? null,
    baselineFeatureInputId: resolution.reaction?.baselineFeatureInputId ?? null,
    relativeChange: resolution.reaction?.relativeChange ?? null,
    blockers: uniqueBlockers,
  });
}
