import 'server-only';

import {
  authorizeMomentumProductActivationWithApproval,
} from '../../product/activation/momentumProductActivationApproval';
import {
  getMomentumProductActivationReadinessForIU,
} from './momentumProductActivationReadiness';

export async function getMomentumProductActivationAuthorizationForIU() {
  return authorizeMomentumProductActivationWithApproval(
    await getMomentumProductActivationReadinessForIU(),
  );
}
