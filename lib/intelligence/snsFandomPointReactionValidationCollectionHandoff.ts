import {
  isSnsFandomProviderApprovalActiveFor,
  type SnsFandomProviderApprovalEvidence,
} from './snsFandomPointContracts';
import {
  type SnsFandomCollectorActivationDecision,
} from './snsFandomPointCollectorActivationTransition';
import {
  type SnsFandomReactionCollectionPlanResult,
  type SnsFandomReactionCollectionTask,
} from './snsFandomPointReactionValidationCollectionPlan';

export const SNS_FANDOM_REACTION_COLLECTION_HANDOFF_VERSION =
  'sns-fandom-reaction-validation-collection-handoff-v1' as const;

export type SnsFandomReactionCollectionHandoffTask = Readonly<{
  taskId: string;
  datasetId: string;
  canonicalArtistId: string;
  youtubeChannelId: string;
  providerClientRef: string;
  videoId: string;
  metricId:
    | 'youtube.video.view-count'
    | 'youtube.video.like-count'
    | 'youtube.video.comment-count';
  captureAt: string;
  contentSelectionEvidenceRef: string;
  state: 'awaiting-production-ops';
}>;

export type SnsFandomReactionCollectionHandoffResult = Readonly<{
  contractVersion:
    typeof SNS_FANDOM_REACTION_COLLECTION_HANDOFF_VERSION;
  state:
    | 'blocked'
    | 'collection-not-required'
    | 'production-ops-handoff-ready';
  planId: string;
  evaluatedAt: string;
  providerId: 'youtube-data-api';
  providerClientRef: string | null;
  approvalEvidenceRef: string | null;
  pendingTasks: readonly SnsFandomReactionCollectionHandoffTask[];
  alreadyCapturedTaskCount: number;
  productionOpsHandoffReady: boolean;
  providerGrantValidated: boolean;
  collectorApprovedReady: boolean;
  executionTimeRevalidationRequired: true;
  schedulerMutationAllowed: false;
  activationMutationAllowed: false;
  collectionExecutionAuthorized: false;
  deploymentAuthorized: false;
  blockers: readonly string[];
}>;

function validIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

function taskApprovalActive(
  approval: SnsFandomProviderApprovalEvidence,
  task: SnsFandomReactionCollectionTask,
): boolean {
  return isSnsFandomProviderApprovalActiveFor(approval, {
    providerId: 'youtube-data-api',
    providerClientRef: task.providerClientRef,
    providerEndpoints: [
      'youtube.channels.list',
      'youtube.playlistItems.list',
      'youtube.videos.list',
    ],
    dimension: 'public-reaction-diffusion',
    metricId: task.metricId,
    evaluatedAt: task.captureAt,
  });
}

export function buildSnsFandomReactionCollectionHandoff(
  input: Readonly<{
    plan: SnsFandomReactionCollectionPlanResult;
    providerApproval: SnsFandomProviderApprovalEvidence | null;
    collectorActivation: SnsFandomCollectorActivationDecision;
    evaluatedAt: string;
  }>,
): SnsFandomReactionCollectionHandoffResult {
  const blockers: string[] = [];
  const { plan, providerApproval, collectorActivation } = input;

  if (!validIso(input.evaluatedAt)) {
    blockers.push('reaction-collection-handoff-evaluated-at-invalid');
  }

  if (plan.state !== 'planning-ready') {
    blockers.push('reaction-collection-handoff-plan-not-ready');
  }
  if (plan.missedTaskCount > 0) {
    blockers.push('reaction-collection-handoff-plan-has-missed-captures');
  }
  if (plan.providerClientRef === null) {
    blockers.push('reaction-collection-handoff-provider-client-missing');
  }
  if (plan.collectionExecutionAuthorized) {
    blockers.push(
      'reaction-collection-handoff-plan-illegally-authorizes-execution',
    );
  }
  if (plan.schedulerMutationAllowed) {
    blockers.push(
      'reaction-collection-handoff-plan-illegally-allows-scheduler-mutation',
    );
  }

  const pendingPlanTasks = plan.tasks.filter(
    (task) => task.state === 'pending-prospective-capture',
  );

  const collectionRequired = pendingPlanTasks.length > 0;

  const approvalActiveAtHandoff =
    collectionRequired
    && providerApproval !== null
    && plan.providerClientRef !== null
    && isSnsFandomProviderApprovalActiveFor(providerApproval, {
      providerId: 'youtube-data-api',
      providerClientRef: plan.providerClientRef,
      providerEndpoints: [
        'youtube.channels.list',
        'youtube.playlistItems.list',
        'youtube.videos.list',
      ],
      dimension: 'public-reaction-diffusion',
      metricId: plan.metricId,
      evaluatedAt: input.evaluatedAt,
    });

  const providerGrantValidated =
    collectionRequired
    && approvalActiveAtHandoff
    && providerApproval !== null
    && pendingPlanTasks.every((task) =>
      taskApprovalActive(providerApproval, task)
    );

  if (collectionRequired && providerApproval === null) {
    blockers.push('reaction-collection-handoff-provider-approval-missing');
  } else if (collectionRequired && providerApproval !== null) {
    if (providerApproval.providerId !== 'youtube-data-api') {
      blockers.push(
        'reaction-collection-handoff-provider-approval-provider-mismatch',
      );
    }
    if (
      plan.providerClientRef !== null
      && providerApproval.providerClientRef !== plan.providerClientRef
    ) {
      blockers.push(
        'reaction-collection-handoff-provider-client-mismatch',
      );
    }
    if (providerApproval.state !== 'approved') {
      blockers.push(
        'reaction-collection-handoff-provider-approval-not-approved',
      );
    }
    if (!approvalActiveAtHandoff) {
      blockers.push(
        'reaction-collection-handoff-provider-approval-not-active-at-handoff',
      );
    }

    for (const task of pendingPlanTasks) {
      if (!taskApprovalActive(providerApproval, task)) {
        blockers.push(
          'reaction-collection-handoff-provider-approval-not-active-for-capture',
        );
        break;
      }
    }
  }

  const collectorApprovedReady =
    collectorActivation.providerId === 'youtube-data-api'
    && collectorActivation.state === 'approved-ready'
    && collectorActivation.collectionAuthorized === false
    && collectorActivation.blockers.length === 0;

  if (collectionRequired && !collectorApprovedReady) {
    blockers.push(
      'reaction-collection-handoff-collector-not-approved-ready',
    );
  }

  const pendingTasks: SnsFandomReactionCollectionHandoffTask[] = [];
  for (const task of pendingPlanTasks) {
    if (
      validIso(input.evaluatedAt)
      && Date.parse(task.captureAt) <= Date.parse(input.evaluatedAt)
    ) {
      blockers.push(
        'reaction-collection-handoff-capture-window-missed',
      );
      continue;
    }

    pendingTasks.push(Object.freeze({
      taskId: task.taskId,
      datasetId: task.datasetId,
      canonicalArtistId: task.canonicalArtistId,
      youtubeChannelId: task.youtubeChannelId,
      providerClientRef: task.providerClientRef,
      videoId: task.videoId,
      metricId: task.metricId,
      captureAt: task.captureAt,
      contentSelectionEvidenceRef:
        task.contentSelectionEvidenceRef,
      state: 'awaiting-production-ops' as const,
    }));
  }

  if (pendingTasks.length !== pendingPlanTasks.length) {
    blockers.push(
      'reaction-collection-handoff-pending-task-construction-incomplete',
    );
  }

  const alreadyCapturedTaskCount = plan.tasks.filter(
    (task) => task.state === 'already-captured',
  ).length;

  const dedupedBlockers = unique(blockers);

  let state: SnsFandomReactionCollectionHandoffResult['state'];
  let productionOpsHandoffReady = false;

  if (dedupedBlockers.length > 0) {
    state = 'blocked';
  } else if (pendingTasks.length === 0) {
    state = 'collection-not-required';
  } else {
    state = 'production-ops-handoff-ready';
    productionOpsHandoffReady = true;
  }

  return Object.freeze({
    contractVersion:
      SNS_FANDOM_REACTION_COLLECTION_HANDOFF_VERSION,
    state,
    planId: plan.planId,
    evaluatedAt: input.evaluatedAt,
    providerId: 'youtube-data-api' as const,
    providerClientRef: plan.providerClientRef,
    approvalEvidenceRef: providerApproval?.evidenceRef ?? null,
    pendingTasks: Object.freeze(pendingTasks),
    alreadyCapturedTaskCount,
    productionOpsHandoffReady,
    providerGrantValidated,
    collectorApprovedReady,
    executionTimeRevalidationRequired: true as const,
    schedulerMutationAllowed: false as const,
    activationMutationAllowed: false as const,
    collectionExecutionAuthorized: false as const,
    deploymentAuthorized: false as const,
    blockers: Object.freeze(dedupedBlockers),
  });
}
