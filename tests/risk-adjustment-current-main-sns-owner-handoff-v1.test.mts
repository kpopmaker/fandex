import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  evaluateSnsFandomYoutubeProviderClientOwnerHandoff,
} from '../lib/intelligence/snsFandomPointYoutubeProviderClientOwnerHandoff';
import {
  evaluateSnsFandomYoutubeQuotaOwnerHandoff,
} from '../lib/intelligence/snsFandomPointYoutubeQuotaOwnerHandoff';
import {
  RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY,
} from '../lib/intelligence/riskAdjustmentCurrentUpstreamEligibility';

type OwnerInput = Readonly<{
  providerClientRef: string | null;
  googleCloudProjectNumber: string | null;
  googleCloudProjectId: string | null;
  credentialLocatorRef: string | null;
  cloudProjectEvidenceRef: string | null;
  verifiedAt: string | null;
  providerApprovalGranted: boolean;
  productionCollectionAuthorized: boolean;
  providerSubmissionAuthorized: boolean;
}>;

const ownerInput = JSON.parse(
  readFileSync(
    'docs/research/sns-fandom-youtube-provider-client-owner-input-v1.json',
    'utf8',
  ),
) as OwnerInput;

type QuotaOwnerInput = Readonly<{
  measurementWindowStart: string | null;
  measurementWindowEnd: string | null;
  reactionSnapshotRunsPerDay: number | null;
  cadenceEvidenceRef: string | null;
  measurementWindowComplete: boolean;
  observedThrough: string | null;
  measurementWindowCompletionEvidenceRef: string | null;
  measuredAt: string | null;
  uploadManifestPageCountPerReactionRun: number | null;
  videoCountPerReactionRun: number | null;
  measuredUsageEvidenceRef: string | null;
  requestBatchingStrategy: string | null;
  channelIdsPerCall: number | null;
  videoIdsPerCall: number | null;
  requestBatchingEvidenceRef: string | null;
  maxChannelIdsPerCall: number | null;
  maxVideoIdsPerCall: number | null;
  providerBatchLimitEvidenceRef: string | null;
  automaticProviderCallAllowed: boolean;
  collectionExecutionAuthorized: boolean;
  schedulerMutationAllowed: boolean;
  deploymentAuthorized: boolean;
  providerSubmissionAuthorized: boolean;
}>;

const quotaOwnerInput = JSON.parse(
  readFileSync(
    'docs/research/sns-fandom-youtube-quota-owner-input-v1.json',
    'utf8',
  ),
) as QuotaOwnerInput;

test('merged snsFandom owner handoff resolves provider-client identity without authorizing provider use', () => {
  const result =
    evaluateSnsFandomYoutubeProviderClientOwnerHandoff({
      providerClientRef: ownerInput.providerClientRef,
      googleCloudProjectNumber: ownerInput.googleCloudProjectNumber,
      googleCloudProjectId: ownerInput.googleCloudProjectId,
      credentialLocatorRef: ownerInput.credentialLocatorRef,
      cloudProjectEvidenceRef: ownerInput.cloudProjectEvidenceRef,
      verifiedAt: ownerInput.verifiedAt,
    });

  assert.equal(result.state, 'provider-client-identity-ready');
  assert.deepEqual(result.missingOwnerFields, []);
  assert.deepEqual(result.blockers, []);
  assert.equal(
    result.providerClientIdentity?.googleCloudProjectNumber,
    '385464276768',
  );
  assert.equal(
    result.providerClientIdentity?.googleCloudProjectId,
    'fandex-509708',
  );
  assert.equal(result.secretMaterialStored, false);
  assert.equal(result.providerApprovalGranted, false);
  assert.equal(result.productionCollectionAuthorized, false);
  assert.equal(result.providerSubmissionAuthorized, false);
});

test('checked-in owner template does not claim provider authorization', () => {
  assert.equal(ownerInput.providerApprovalGranted, false);
  assert.equal(ownerInput.productionCollectionAuthorized, false);
  assert.equal(ownerInput.providerSubmissionAuthorized, false);
});

test('merged owner-handoff contract alone does not make snsFandom a current Real Risk input', () => {
  const eligibility =
    RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY.find(
      (entry) => entry.variableId === 'snsFandomPoint',
    );

  assert.ok(eligibility);
  assert.equal(eligibility.acceptedForRiskConsumption, false);
  assert.equal(
    eligibility.exclusionReason,
    'sns-fandom-provider-and-product-gates-open',
  );
});


test('merged snsFandom quota owner handoff resolves Phase B measurement plan while Phase C remains unresolved', () => {
  const result = evaluateSnsFandomYoutubeQuotaOwnerHandoff({
    measurementWindowStart: quotaOwnerInput.measurementWindowStart,
    measurementWindowEnd: quotaOwnerInput.measurementWindowEnd,
    reactionSnapshotRunsPerDay: quotaOwnerInput.reactionSnapshotRunsPerDay,
    cadenceEvidenceRef: quotaOwnerInput.cadenceEvidenceRef,
    measurementWindowComplete:
      quotaOwnerInput.measurementWindowComplete,
    observedThrough: quotaOwnerInput.observedThrough,
    measurementWindowCompletionEvidenceRef:
      quotaOwnerInput.measurementWindowCompletionEvidenceRef,
    measuredAt: quotaOwnerInput.measuredAt,
    uploadManifestPageCountPerReactionRun:
      quotaOwnerInput.uploadManifestPageCountPerReactionRun,
    videoCountPerReactionRun: quotaOwnerInput.videoCountPerReactionRun,
    measuredUsageEvidenceRef: quotaOwnerInput.measuredUsageEvidenceRef,
    requestBatchingStrategy:
      quotaOwnerInput.requestBatchingStrategy as
        | 'singleton-only-until-provider-batch-limit-evidence'
        | 'provider-limit-evidenced'
        | null,
    channelIdsPerCall: quotaOwnerInput.channelIdsPerCall,
    videoIdsPerCall: quotaOwnerInput.videoIdsPerCall,
    requestBatchingEvidenceRef: quotaOwnerInput.requestBatchingEvidenceRef,
    maxChannelIdsPerCall: quotaOwnerInput.maxChannelIdsPerCall,
    maxVideoIdsPerCall: quotaOwnerInput.maxVideoIdsPerCall,
    providerBatchLimitEvidenceRef:
      quotaOwnerInput.providerBatchLimitEvidenceRef,
  });

  assert.equal(result.state, 'measurement-plan-ready');
  assert.deepEqual(result.missingPlanFields, []);
  assert.equal(
    result.measurementWindowStart,
    '2026-10-03T15:00:00.000Z',
  );
  assert.equal(
    result.measurementWindowEnd,
    '2027-10-04T15:00:00.000Z',
  );
  assert.equal(result.reactionSnapshotRunsPerDay, 24);
  assert.equal(
    result.cadenceEvidenceRef,
    'github-issue://kpopmaker/fandex/issues/424#issuecomment-5967962631',
  );
  assert.deepEqual(result.missingMeasurementFields, [
    'measuredAt',
    'measuredUsageEvidenceRef',
    'measurementWindowCompletionEvidenceRef',
    'observedThrough',
    'uploadManifestPageCountPerReactionRun',
    'videoCountPerReactionRun',
  ]);
  assert.deepEqual(
    result.completionBlockers,
    ['measurement-window-incomplete'],
  );
  assert.equal(result.measurementWindowComplete, false);
  assert.equal(result.observedThrough, null);
  assert.equal(result.measurementWindowCompletionEvidenceRef, null);
  assert.equal(
    result.requestBatchingStrategy,
    'singleton-only-until-provider-batch-limit-evidence',
  );
  assert.equal(result.channelIdsPerCall, 1);
  assert.equal(result.videoIdsPerCall, 1);
  assert.equal(
    result.requestBatchingEvidenceRef,
    'repo://lib/intelligence/snsFandomPointYoutubeQuotaMeasurementHandoff.ts#singleton-only-until-provider-batch-limit-evidence',
  );
  assert.equal(result.maxChannelIdsPerCall, null);
  assert.equal(result.maxVideoIdsPerCall, null);
  assert.equal(result.providerBatchLimitEvidenceRef, null);
  assert.deepEqual(result.invalidFields, []);
  assert.equal(result.automaticProviderCallAllowed, false);
  assert.equal(result.collectionExecutionAuthorized, false);
  assert.equal(result.schedulerMutationAllowed, false);
  assert.equal(result.deploymentAuthorized, false);
  assert.equal(result.providerSubmissionAuthorized, false);
});

test('checked-in quota owner template does not authorize provider or collection actions', () => {
  assert.equal(quotaOwnerInput.automaticProviderCallAllowed, false);
  assert.equal(quotaOwnerInput.collectionExecutionAuthorized, false);
  assert.equal(quotaOwnerInput.schedulerMutationAllowed, false);
  assert.equal(quotaOwnerInput.deploymentAuthorized, false);
  assert.equal(quotaOwnerInput.providerSubmissionAuthorized, false);
});

test('merged provider-client and quota owner handoffs still do not make snsFandom a current Real Risk input', () => {
  const eligibility =
    RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY.find(
      (entry) => entry.variableId === 'snsFandomPoint',
    );

  assert.ok(eligibility);
  assert.equal(eligibility.acceptedForRiskConsumption, false);
  assert.equal(
    eligibility.exclusionReason,
    'sns-fandom-provider-and-product-gates-open',
  );
});
