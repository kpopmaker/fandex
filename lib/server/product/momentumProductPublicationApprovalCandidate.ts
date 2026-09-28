import 'server-only';

import {
  createMomentumProductPublicationApprovalCandidate,
} from '../../product/activation/momentumProductPublicationApprovalCandidate';
import {
  getMomentumProductActivationAuthorizationForIU,
} from './momentumProductActivationAuthorization';

export async function getMomentumProductPublicationApprovalCandidateForIU() {
  return createMomentumProductPublicationApprovalCandidate(
    await getMomentumProductActivationAuthorizationForIU(),
  );
}
