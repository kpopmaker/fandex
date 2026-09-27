import 'server-only';

import {
  createMomentumProductActivationApprovalCandidate,
} from '../../product/activation/momentumProductActivationApprovalCandidate';
import {
  createMomentumProductActivationAuthorizationExecutionCandidate,
  type MomentumProductActivationAuthorizationExecutionCandidate,
} from '../../product/activation/momentumProductActivationAuthorizationExecutionCandidate';
import {
  getMomentumProductActivationReadinessForIU,
} from './momentumProductActivationReadiness';

export async function getMomentumProductActivationAuthorizationExecutionCandidateForIU():
  Promise<MomentumProductActivationAuthorizationExecutionCandidate> {
  const readiness = await getMomentumProductActivationReadinessForIU();
  const approvalCandidate =
    createMomentumProductActivationApprovalCandidate(readiness);

  return createMomentumProductActivationAuthorizationExecutionCandidate(
    readiness,
    approvalCandidate,
  );
}
