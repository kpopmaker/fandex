import 'server-only';

import {
  createMomentumProductActivationApprovalCandidate,
  type MomentumProductActivationApprovalCandidate,
} from '../../product/activation/momentumProductActivationApprovalCandidate';
import {
  getMomentumProductActivationReadinessForIU,
} from './momentumProductActivationReadiness';

export async function getMomentumProductActivationApprovalCandidateForIU():
  Promise<MomentumProductActivationApprovalCandidate> {
  return createMomentumProductActivationApprovalCandidate(
    await getMomentumProductActivationReadinessForIU(),
  );
}
