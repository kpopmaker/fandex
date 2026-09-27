import 'server-only';

import {
  evaluateMomentumProductActivationReadiness,
  type MomentumProductActivationReadiness,
} from '../../product/activation/momentumProductActivationReadiness';
import {
  createMomentumPublicRouteDesignCandidate,
} from '../../product/readiness/momentumPublicRouteDesignCandidate';
import {
  getMomentumEvidenceConsensusShadowProductForIU,
} from './momentumEvidenceConsensusRealProductRead';
import {
  getMomentumLiveShadowProductReadinessForIU,
} from './momentumLiveShadowProductReadiness';

export async function getMomentumProductActivationReadinessForIU():
  Promise<MomentumProductActivationReadiness> {
  const [liveReadiness, source] = await Promise.all([
    getMomentumLiveShadowProductReadinessForIU(),
    getMomentumEvidenceConsensusShadowProductForIU(),
  ]);

  const routeDesign = createMomentumPublicRouteDesignCandidate(
    liveReadiness,
    source,
  );

  return evaluateMomentumProductActivationReadiness({
    routeDesign,
    liveReadiness,
    source,
  });
}
