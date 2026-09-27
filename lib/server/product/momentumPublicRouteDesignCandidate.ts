import 'server-only';

import {
  createMomentumPublicRouteDesignCandidate,
  type MomentumPublicRouteDesignCandidate,
} from '../../product/readiness/momentumPublicRouteDesignCandidate';
import {
  getMomentumEvidenceConsensusShadowProductForIU,
} from './momentumEvidenceConsensusRealProductRead';
import {
  getMomentumLiveShadowProductReadinessForIU,
} from './momentumLiveShadowProductReadiness';

export async function getMomentumPublicRouteDesignCandidateForIU():
  Promise<MomentumPublicRouteDesignCandidate> {
  const [readiness, source] = await Promise.all([
    getMomentumLiveShadowProductReadinessForIU(),
    getMomentumEvidenceConsensusShadowProductForIU(),
  ]);

  return createMomentumPublicRouteDesignCandidate(
    readiness,
    source,
  );
}
