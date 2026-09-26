import 'server-only';

import {
  createActivityExposureProductionActivationApprovalCandidate,
} from '../../product/activation/activityExposureProductionActivationApprovalCandidate';
import {
  authorizeActivityExposureProductionActivationWithApproval,
} from '../../product/activation/activityExposureProductionActivationApproval';
import {
  createActivityExposurePublicRouteCutoverCandidate,
} from '../../product/activation/activityExposurePublicRouteCutoverCandidate';
import {
  evaluateActivityExposureProductionReadiness,
} from '../../product/activation/activityExposureProductionReadiness';
import {
  readActivityExposureShadowProduct,
  readActivityExposureStoredEvidence,
} from '../ingestion/activityExposureRepository';
import { getRuntimeDatabasePool } from '../persistence/db';

export async function getActivityExposureShadowProductForIU() {
  return readActivityExposureShadowProduct(
    'iu',
    getRuntimeDatabasePool(),
  );
}

export async function getActivityExposureStoredEvidenceForIU(
  eventRecordId: string,
) {
  return readActivityExposureStoredEvidence(
    {
      artistId: 'iu',
      eventRecordId,
    },
    getRuntimeDatabasePool(),
  );
}

export async function getActivityExposureProductionReadinessForIU() {
  return evaluateActivityExposureProductionReadiness(
    await getActivityExposureShadowProductForIU(),
  );
}


export async function getActivityExposureProductionActivationApprovalCandidateForIU() {
  return createActivityExposureProductionActivationApprovalCandidate(
    await getActivityExposureProductionReadinessForIU(),
  );
}


export async function getActivityExposureProductionActivationAuthorizationForIU() {
  return authorizeActivityExposureProductionActivationWithApproval(
    await getActivityExposureProductionReadinessForIU(),
  );
}

export async function getActivityExposurePublicRouteCutoverCandidateForIU() {
  return createActivityExposurePublicRouteCutoverCandidate(
    await getActivityExposureProductionReadinessForIU(),
  );
}
