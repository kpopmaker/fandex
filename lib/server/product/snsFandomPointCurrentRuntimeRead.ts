import 'server-only';

import {
  evaluateSnsFandomPointReadiness,
  type SnsFandomPointReadinessResult,
} from '../../intelligence/snsFandomPointContracts';

export const SNS_FANDOM_POINT_CURRENT_RUNTIME_READ_VERSION =
  'sns-fandom-point-current-runtime-read-v1' as const;

export type SnsFandomPointCurrentRuntimeReadResult = Readonly<{
  status: 'ok';
  contractVersion:
    typeof SNS_FANDOM_POINT_CURRENT_RUNTIME_READ_VERSION;
  readiness: SnsFandomPointReadinessResult;
  evidence: Readonly<{
    sourceKind: 'canonical-provider-qualification-state';
    connectedObservationCount: 0;
    connectedProviderApprovalCount: 0;
    connectedArtistEntitlementCount: 0;
  }>;
}>;

export async function getSnsFandomPointCurrentRuntimeForIU():
  Promise<SnsFandomPointCurrentRuntimeReadResult> {
  const readiness = evaluateSnsFandomPointReadiness({
    canonicalArtistId: 'iu',
    observations: [],
    providerApprovals: [],
    artistEntitlements: [],
  });

  return Object.freeze({
    status: 'ok' as const,
    contractVersion: SNS_FANDOM_POINT_CURRENT_RUNTIME_READ_VERSION,
    readiness,
    evidence: Object.freeze({
      sourceKind: 'canonical-provider-qualification-state' as const,
      connectedObservationCount: 0 as const,
      connectedProviderApprovalCount: 0 as const,
      connectedArtistEntitlementCount: 0 as const,
    }),
  });
}
