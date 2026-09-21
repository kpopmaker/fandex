import { sha256Canonical } from '../shared/canonicalDigest';

export const FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_EVIDENCE_VERSION =
  'v164_fandex_momentum_verifier_configuration_evidence_closure_research_v1' as const;

export const FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_EVIDENCE_DESCRIPTOR =
  Object.freeze({
    contractVersion: FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_EVIDENCE_VERSION,
    lifecycle: 'research' as const,
    readinessOnly: true as const,
    environmentMutationPerformed: false as const,
    secretMutationPerformed: false as const,
    productionDeploymentPerformed: false as const,
    activationPerformed: false as const,
    databaseWriteAllowed: false as const,
    productMetricWriteAllowed: false as const,
    registryMutationAllowed: false as const,
    productionActivationAllowed: false as const,
    secretValueExposureAllowed: false as const,
    unknownConfigurationCountsAsReady: false as const,
  });

export type FandexMomentumVerifierConfigurationEvidence = Readonly<{
  projectId: string;
  projectName: 'fandex';
  teamId: string;
  environment: 'production';
  intendedDeploymentCommit: string;
  intendedRoutePath: '/api/internal/naver-news/momentum-verifier';
  intendedCommitPreviewDeploymentId: string;
  intendedCommitPreviewDeploymentReady: boolean;
  productionEnvironmentInventoryQueryable: boolean;
  enableFlag: Readonly<{
    key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED';
    present: boolean;
    productionTargeted: boolean;
    exactContractValueProven: boolean;
    expectedValue: 'approved-v162-research-read-only';
  }>;
  deploymentSelector: Readonly<{
    key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT';
    present: boolean;
    productionTargeted: boolean;
    exactContractValueProven: boolean;
    expectedValue: 'production';
  }>;
  dedicatedSecret: Readonly<{
    key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET';
    present: boolean;
    productionTargeted: boolean;
    valueExposed: false;
    secretContractSatisfiedWithoutExposure: boolean;
    distinctFromSchedulerCredentialProven: boolean;
  }>;
  previewCredentialInheritanceAbsent: boolean;
  evidenceBoundToProjectAndEnvironment: boolean;
}>;

export type FandexMomentumVerifierConfigurationEvidenceResult =
  Readonly<{
    contractVersion:
      typeof FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_EVIDENCE_VERSION;
    state: 'configuration-evidence-blocked' | 'configuration-evidence-ready';
    readyToReevaluateV163: boolean;
    blockers: readonly string[];
    evidence: FandexMomentumVerifierConfigurationEvidence;
    effects: Readonly<{
      environmentReads: 0;
      environmentMutations: 0;
      secretReads: 0;
      secretMutations: 0;
      productionDeployments: 0;
      activationWrites: 0;
      databaseWrites: 0;
      productMetricWrites: 0;
      registryMutations: 0;
    }>;
    digest: string;
  }>;

export function evaluateFandexMomentumVerifierConfigurationEvidence(
  evidence: FandexMomentumVerifierConfigurationEvidence,
): FandexMomentumVerifierConfigurationEvidenceResult {
  const blockers: string[] = [];

  if (!/^prj_[A-Za-z0-9]+$/.test(evidence.projectId)) {
    blockers.push('verifier-project-id-invalid');
  }
  if (!/^team_[A-Za-z0-9]+$/.test(evidence.teamId)) {
    blockers.push('verifier-team-id-invalid');
  }
  if (!/^[0-9a-f]{40}$/.test(evidence.intendedDeploymentCommit)) {
    blockers.push('intended-deployment-commit-invalid');
  }
  if (!/^dpl_[A-Za-z0-9]+$/.test(evidence.intendedCommitPreviewDeploymentId)) {
    blockers.push('intended-preview-deployment-id-invalid');
  }
  if (!evidence.intendedCommitPreviewDeploymentReady) {
    blockers.push('intended-preview-deployment-not-ready');
  }
  if (!evidence.evidenceBoundToProjectAndEnvironment) {
    blockers.push('configuration-evidence-not-bound-to-project-environment');
  }
  if (!evidence.productionEnvironmentInventoryQueryable) {
    blockers.push('production-environment-inventory-unavailable');
  }

  if (!evidence.enableFlag.present) {
    blockers.push('verifier-enable-flag-not-proven-present');
  }
  if (!evidence.enableFlag.productionTargeted) {
    blockers.push('verifier-enable-flag-production-target-not-proven');
  }
  if (!evidence.enableFlag.exactContractValueProven) {
    blockers.push('verifier-enable-flag-contract-value-not-proven');
  }

  if (!evidence.deploymentSelector.present) {
    blockers.push('verifier-deployment-selector-not-proven-present');
  }
  if (!evidence.deploymentSelector.productionTargeted) {
    blockers.push('verifier-deployment-selector-production-target-not-proven');
  }
  if (!evidence.deploymentSelector.exactContractValueProven) {
    blockers.push('verifier-deployment-selector-contract-value-not-proven');
  }

  if (!evidence.dedicatedSecret.present) {
    blockers.push('dedicated-verifier-secret-not-proven-present');
  }
  if (!evidence.dedicatedSecret.productionTargeted) {
    blockers.push('dedicated-verifier-secret-production-target-not-proven');
  }
  if (evidence.dedicatedSecret.valueExposed !== false) {
    blockers.push('dedicated-verifier-secret-value-exposure-forbidden');
  }
  if (!evidence.dedicatedSecret.secretContractSatisfiedWithoutExposure) {
    blockers.push('dedicated-verifier-secret-contract-not-proven');
  }
  if (!evidence.dedicatedSecret.distinctFromSchedulerCredentialProven) {
    blockers.push('dedicated-verifier-secret-separation-not-proven');
  }
  if (!evidence.previewCredentialInheritanceAbsent) {
    blockers.push('preview-credential-inheritance-not-excluded');
  }

  const uniqueBlockers = Object.freeze([...new Set(blockers)]);
  const readyToReevaluateV163 = uniqueBlockers.length === 0;
  const state = readyToReevaluateV163
    ? 'configuration-evidence-ready' as const
    : 'configuration-evidence-blocked' as const;

  const payload = {
    contractVersion: FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_EVIDENCE_VERSION,
    state,
    readyToReevaluateV163,
    blockers: uniqueBlockers,
    evidence,
  };

  return Object.freeze({
    ...payload,
    effects: Object.freeze({
      environmentReads: 0 as const,
      environmentMutations: 0 as const,
      secretReads: 0 as const,
      secretMutations: 0 as const,
      productionDeployments: 0 as const,
      activationWrites: 0 as const,
      databaseWrites: 0 as const,
      productMetricWrites: 0 as const,
      registryMutations: 0 as const,
    }),
    digest: sha256Canonical(payload),
  });
}
