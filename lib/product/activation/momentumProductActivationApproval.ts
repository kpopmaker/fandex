import {
  authorizeMomentumProductActivation,
  type MomentumProductActivationApproval,
} from './momentumProductActivationAuthorization';
import type {
  MomentumProductActivationReadiness,
} from './momentumProductActivationReadiness';

export const MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE_VERSION =
  'momentum-product-activation-approval-evidence-v1' as const;

export const MOMENTUM_PRODUCT_ACTIVATION_APPROVAL =
  Object.freeze({
    contractVersion: 'momentum-product-activation-approval-v1' as const,
    action: 'authorize-momentum-product-activation' as const,
    authority: 'product-operations-owner' as const,
    activationAuthorizationId:
      'ops-activation-momentum-evidence-consensus-20260928t012306z-v1',
    authorizedAt: '2026-09-28T01:23:06.000Z',
    target: Object.freeze({
      artistId: 'iu' as const,
      legacyVariableId: 'growthMomentumPoint' as const,
      constructId: 'momentumEvidenceConsensus' as const,
    }),
    binding: Object.freeze({
      readinessContractVersion:
        'momentum-product-activation-readiness-v1' as const,
      routeDesignContractVersion:
        'momentum-public-route-design-candidate-v1' as const,
      productContractVersion:
        'product-momentum-evidence-consensus-v1' as const,
      sourcePublication: 'shadow' as const,
      claimScope:
        'structured-categorical-evidence-only-no-numeric-score' as const,
      carrierRecordId:
        '6bf29ed2e15a4c374f9985279e5d60e44eab404371fd807b62adad1bebf6cadd',
      alignmentCutoffAt: '2026-09-20T01:59:13.000Z',
      directionalConsensus: 'direction-conflicted',
      persistenceConsensus: 'persistence-not-applicable',
      currentNoOpEvaluationAttested: true as const,
      evaluatedAlignmentCutoffAt: '2026-09-27T02:10:05.000Z',
      currentEvaluationAttestationPath:
        'data/momentum-product/iu_momentum_current_dual_source_evaluation_attestation_v1.json' as const,
      currentEvaluationAttestationDigest:
        'b1f4262f07bc3727b089b2de248128637b36c78afae6d3a9b8207a05f9e19b93',
    }),
  }) satisfies MomentumProductActivationApproval;

export const MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE =
  Object.freeze({
    contractVersion:
      MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE_VERSION,
    approvedAt: MOMENTUM_PRODUCT_ACTIVATION_APPROVAL.authorizedAt,
    authority: 'product-operations-owner' as const,
    authorizationEvidenceCommentId: 5861676033 as const,
    authorizationEvidenceCommentUrl:
      'https://github.com/kpopmaker/fandex/pull/267#issuecomment-5861676033' as const,
    authorizedMain:
      '7b9899e3a85f82c4e82cde1d8383f97d62765d49' as const,
    operationsHandoffDigest:
      'dca053af60e05e22ea30d45e030c31f85cea2931d448ef7dc108942bcc309d76' as const,
    operationsHandoffProductionAttestationDigest:
      'eba9f0f299ad0f591e2d0a7cb931db1d203d29fd4bf6bf402263a81a74a1ecd9' as const,
    activationAuthorizationId:
      MOMENTUM_PRODUCT_ACTIVATION_APPROVAL.activationAuthorizationId,
    target: MOMENTUM_PRODUCT_ACTIVATION_APPROVAL.target,
    binding: MOMENTUM_PRODUCT_ACTIVATION_APPROVAL.binding,
    decision: Object.freeze({
      activationAuthorized: true as const,
      productPublicationAuthorized: false as const,
      publicRouteActivated: false as const,
      publication: 'shadow' as const,
      productMomentumScore: null,
      numericProductEligible: false as const,
      legacyGrowthMomentumPointReuseAllowed: false as const,
      previewFallbackAllowed: false as const,
      directProductionContributionEligible: false as const,
      requiredNextGate:
        'explicit-momentum-product-publication-authorization' as const,
    }),
  });

export function authorizeMomentumProductActivationWithApproval(
  readiness: MomentumProductActivationReadiness,
) {
  return authorizeMomentumProductActivation({
    readiness,
    approval: MOMENTUM_PRODUCT_ACTIVATION_APPROVAL,
  });
}
