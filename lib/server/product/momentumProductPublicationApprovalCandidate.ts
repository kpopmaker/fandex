import 'server-only';

import {
  createMomentumProductPublicationApprovalCandidate,
} from '../../product/activation/momentumProductPublicationApprovalCandidate';
import {
  MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE,
} from '../../product/activation/momentumProductActivationApproval';
import {
  getMomentumProductActivationAuthorizationForIU,
} from './momentumProductActivationAuthorization';

export async function getMomentumProductPublicationApprovalCandidateForIU() {
  const activation =
    await getMomentumProductActivationAuthorizationForIU();

  if (
    activation.status === 'authorized-for-publication-review'
    && MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE
      .productionBindingCurrent === false
  ) {
    return Object.freeze({
      contractVersion:
        'momentum-product-publication-approval-candidate-v1' as const,
      status: 'blocked' as const,
      reason: 'activation-production-binding-stale' as const,
      activationAuthorized: true as const,
      productPublicationAuthorized: false as const,
      publicRouteActivated: false as const,
      publication: 'shadow' as const,
      productMomentumScore: null,
      numericProductEligible: false as const,
      legacyGrowthMomentumPointReuseAllowed: false as const,
      previewFallbackAllowed: false as const,
      directProductionContributionEligible: false as const,
    });
  }

  return createMomentumProductPublicationApprovalCandidate(activation);
}
