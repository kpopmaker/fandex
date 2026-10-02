import {
  type SnsFandomReactionValidationConstruct,
  type SnsFandomReactionValidationMetricId,
} from './snsFandomPointReactionValidationDataset';
import {
  validateSnsFandomYoutubeContentManifest,
  type SnsFandomYoutubeContentManifest,
} from './snsFandomPointYoutubeContentSelection';

export const SNS_FANDOM_REACTION_PROSPECTIVE_ENROLLMENT_VERSION =
  'sns-fandom-reaction-prospective-content-enrollment-v1' as const;

export const SNS_FANDOM_REACTION_PROSPECTIVE_OPS_PACKET_VERSION =
  'sns-fandom-reaction-prospective-content-enrollment-ops-packet-v1' as const;

export type SnsFandomProspectiveTargetAge = Readonly<{
  datasetId: string;
  targetContentAgeMilliseconds: number;
  rationaleEvidenceRef: string;
}>;

export type SnsFandomProspectiveDiscoverySnapshotItem = Readonly<{
  videoId: string;
  publishedAt: string;
  evidenceRef: string;
}>;

export type SnsFandomProspectiveDiscoverySnapshot = Readonly<{
  observedAt: string;
  pageCount: number;
  terminalNextPageToken: null;
  terminalPageEvidenceRef: string;
  evidenceRef: string;
  items: readonly SnsFandomProspectiveDiscoverySnapshotItem[];
}>;

export type SnsFandomProspectiveEnrollmentTask = Readonly<{
  taskId: string;
  datasetId: string;
  canonicalArtistId: string;
  youtubeChannelId: string;
  providerClientRef: string;
  videoId: string;
  metricId: SnsFandomReactionValidationMetricId;
  publishedAt: string;
  firstSeenAt: string;
  targetContentAgeMilliseconds: number;
  captureAt: string;
  state: 'pending-prospective-capture' | 'missed-before-enrollment';
  discoveryEvidenceRef: string;
}>;

export type SnsFandomProspectiveEnrollmentOpsPacket = Readonly<{
  contractVersion:
    typeof SNS_FANDOM_REACTION_PROSPECTIVE_OPS_PACKET_VERSION;
  state: 'blocked' | 'ops-review-ready';
  enrollmentId: string;
  providerId: 'youtube-data-api';
  providerClientRef: string;
  pendingTasks: readonly SnsFandomProspectiveEnrollmentTask[];
  providerGrantRequired: true;
  providerApprovalValidated: false;
  executionTimeRevalidationRequired: true;
  schedulerMutationAllowed: false;
  activationMutationAllowed: false;
  collectionExecutionAuthorized: false;
  deploymentAuthorized: false;
}>;

export type SnsFandomProspectiveEnrollmentInput = Readonly<{
  enrollmentId: string;
  evaluatedAt: string;
  construct: SnsFandomReactionValidationConstruct;
  metricId: SnsFandomReactionValidationMetricId;
  canonicalArtistId: string;
  youtubeChannelId: string;
  providerClientRef: string;
  selectionRule: 'official-channel-all-uploads-in-published-window';
  windowStart: string;
  windowEnd: string;
  uploadsPlaylistId: string;
  providerEndpoints: readonly [
    'youtube.channels.list',
    'youtube.playlistItems.list',
  ];
  targetAges: readonly SnsFandomProspectiveTargetAge[];
  discoverySnapshots: readonly SnsFandomProspectiveDiscoverySnapshot[];
}>;

export type SnsFandomProspectiveEnrollmentResult = Readonly<{
  contractVersion: typeof SNS_FANDOM_REACTION_PROSPECTIVE_ENROLLMENT_VERSION;
  enrollmentId: string;
  state: 'enrollment-active' | 'blocked';
  evaluatedAt: string;
  construct: SnsFandomReactionValidationConstruct;
  metricId: SnsFandomReactionValidationMetricId;
  canonicalArtistId: string;
  youtubeChannelId: string;
  providerClientRef: string;
  uploadsPlaylistId: string;
  windowStart: string;
  windowEnd: string;
  provisionalVideoIds: readonly string[];
  tasks: readonly SnsFandomProspectiveEnrollmentTask[];
  pendingTaskCount: number;
  missedTaskCount: number;
  contentUniverseComplete: false;
  finalManifestReconciliationRequired: true;
  discoveryCadenceMilliseconds: null;
  arbitraryDiscoveryCadenceApplied: false;
  arbitraryTargetAgeDefaultApplied: false;
  automaticBackfillAllowed: false;
  opsPacket: SnsFandomProspectiveEnrollmentOpsPacket;
  blockers: readonly string[];
}>;

export type SnsFandomProspectiveEnrollmentReconciliationResult = Readonly<{
  contractVersion: typeof SNS_FANDOM_REACTION_PROSPECTIVE_ENROLLMENT_VERSION;
  enrollmentId: string;
  state: 'reconciliation-ready' | 'blocked';
  reconciledAt: string;
  provisionalVideoIds: readonly string[];
  finalManifestVideoIds: readonly string[];
  missingFromEnrollmentVideoIds: readonly string[];
  absentFromFinalManifestVideoIds: readonly string[];
  publishedAtMismatchVideoIds: readonly string[];
  contentUniverseReconciled: boolean;
  prospectiveContentUniverseEligibleForDatasetAssembly: boolean;
  validationDatasetUseAllowed: false;
  automaticBackfillAllowed: false;
  blockers: readonly string[];
}>;

function validIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function uniqueSorted(values: readonly string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function exactStringSetDifference(
  left: readonly string[],
  right: readonly string[],
): string[] {
  const rightSet = new Set(right);
  return uniqueSorted(left.filter((value) => !rightSet.has(value)));
}

export function buildSnsFandomProspectiveContentEnrollment(
  input: SnsFandomProspectiveEnrollmentInput,
): SnsFandomProspectiveEnrollmentResult {
  const blockers: string[] = [];

  if (input.enrollmentId.trim().length === 0) {
    blockers.push('prospective-enrollment-id-empty');
  }
  if (!validIso(input.evaluatedAt)) {
    blockers.push('prospective-enrollment-evaluated-at-invalid');
  }
  if (!validIso(input.windowStart) || !validIso(input.windowEnd)) {
    blockers.push('prospective-enrollment-window-invalid');
  } else if (Date.parse(input.windowStart) >= Date.parse(input.windowEnd)) {
    blockers.push('prospective-enrollment-window-order-invalid');
  } else if (
    validIso(input.evaluatedAt)
    && (
      Date.parse(input.evaluatedAt) < Date.parse(input.windowStart)
      || Date.parse(input.evaluatedAt) >= Date.parse(input.windowEnd)
    )
  ) {
    blockers.push('prospective-enrollment-window-not-open-at-evaluation');
  }

  if (
    input.canonicalArtistId.trim().length === 0
    || input.youtubeChannelId.trim().length === 0
    || input.providerClientRef.trim().length === 0
    || input.uploadsPlaylistId.trim().length === 0
  ) {
    blockers.push('prospective-enrollment-source-identity-incomplete');
  }
  if (
    input.selectionRule
      !== 'official-channel-all-uploads-in-published-window'
  ) {
    blockers.push('prospective-enrollment-selection-rule-invalid');
  }
  if (
    input.providerEndpoints.length !== 2
    || input.providerEndpoints[0] !== 'youtube.channels.list'
    || input.providerEndpoints[1] !== 'youtube.playlistItems.list'
  ) {
    blockers.push('prospective-enrollment-endpoint-chain-invalid');
  }

  if (input.targetAges.length === 0) {
    blockers.push('prospective-enrollment-target-age-missing');
  }
  const datasetIds = input.targetAges.map((target) => target.datasetId);
  if (uniqueSorted(datasetIds).length !== datasetIds.length) {
    blockers.push('prospective-enrollment-dataset-id-duplicate');
  }
  const targetAgeKeys = input.targetAges.map(
    (target) => String(target.targetContentAgeMilliseconds),
  );
  if (uniqueSorted(targetAgeKeys).length !== targetAgeKeys.length) {
    blockers.push('prospective-enrollment-target-age-duplicate');
  }
  for (const target of input.targetAges) {
    if (target.datasetId.trim().length === 0) {
      blockers.push('prospective-enrollment-dataset-id-empty');
    }
    if (
      !Number.isSafeInteger(target.targetContentAgeMilliseconds)
      || target.targetContentAgeMilliseconds <= 0
    ) {
      blockers.push('prospective-enrollment-target-age-invalid');
    }
    if (target.rationaleEvidenceRef.trim().length === 0) {
      blockers.push('prospective-enrollment-target-age-rationale-missing');
    }
  }

  if (input.discoverySnapshots.length === 0) {
    blockers.push('prospective-enrollment-discovery-snapshot-missing');
  }

  const sortedSnapshots = [...input.discoverySnapshots].sort(
    (a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt),
  );
  const observedAtValues = sortedSnapshots.map((snapshot) => snapshot.observedAt);
  const latestDiscoveryObservedAt =
    sortedSnapshots.at(-1)?.observedAt ?? null;
  if (
    latestDiscoveryObservedAt !== null
    && validIso(input.evaluatedAt)
    && latestDiscoveryObservedAt !== input.evaluatedAt
  ) {
    blockers.push('prospective-enrollment-evaluation-not-latest-discovery');
  }
  if (uniqueSorted(observedAtValues).length !== observedAtValues.length) {
    blockers.push('prospective-enrollment-discovery-snapshot-time-duplicate');
  }

  const enrolled = new Map<
    string,
    {
      publishedAt: string;
      firstSeenAt: string;
      evidenceRef: string;
    }
  >();

  for (const snapshot of sortedSnapshots) {
    if (!validIso(snapshot.observedAt)) {
      blockers.push('prospective-enrollment-discovery-time-invalid');
      continue;
    }
    if (
      validIso(input.windowStart)
      && validIso(input.windowEnd)
      && (
        Date.parse(snapshot.observedAt) < Date.parse(input.windowStart)
        || Date.parse(snapshot.observedAt) >= Date.parse(input.windowEnd)
      )
    ) {
      blockers.push('prospective-enrollment-discovery-outside-open-window');
    }
    if (!Number.isSafeInteger(snapshot.pageCount) || snapshot.pageCount < 1) {
      blockers.push('prospective-enrollment-pagination-page-count-invalid');
    }
    if (snapshot.terminalNextPageToken !== null) {
      blockers.push('prospective-enrollment-pagination-not-terminal');
    }
    if (
      snapshot.terminalPageEvidenceRef.trim().length === 0
      || snapshot.evidenceRef.trim().length === 0
    ) {
      blockers.push('prospective-enrollment-discovery-evidence-missing');
    }

    const snapshotVideoIds = snapshot.items.map((item) => item.videoId);
    if (uniqueSorted(snapshotVideoIds).length !== snapshotVideoIds.length) {
      blockers.push('prospective-enrollment-snapshot-video-id-duplicate');
    }

    for (const item of snapshot.items) {
      if (item.videoId.trim().length === 0) {
        blockers.push('prospective-enrollment-video-id-empty');
        continue;
      }
      if (!validIso(item.publishedAt)) {
        blockers.push('prospective-enrollment-published-at-invalid');
        continue;
      }
      if (item.evidenceRef.trim().length === 0) {
        blockers.push('prospective-enrollment-item-evidence-missing');
      }
      if (
        validIso(input.windowStart)
        && validIso(input.windowEnd)
        && (
          Date.parse(item.publishedAt) < Date.parse(input.windowStart)
          || Date.parse(item.publishedAt) > Date.parse(input.windowEnd)
        )
      ) {
        blockers.push('prospective-enrollment-item-outside-window');
      }
      if (Date.parse(item.publishedAt) > Date.parse(snapshot.observedAt)) {
        blockers.push('prospective-enrollment-item-published-after-discovery');
      }

      const existing = enrolled.get(item.videoId);
      if (existing === undefined) {
        enrolled.set(item.videoId, {
          publishedAt: item.publishedAt,
          firstSeenAt: snapshot.observedAt,
          evidenceRef: item.evidenceRef,
        });
      } else if (existing.publishedAt !== item.publishedAt) {
        blockers.push(
          'prospective-enrollment-video-publication-time-inconsistent',
        );
      }
    }
  }

  const tasks: SnsFandomProspectiveEnrollmentTask[] = [];
  for (const [videoId, item] of [...enrolled.entries()].sort(
    ([a], [b]) => a.localeCompare(b),
  )) {
    for (const target of input.targetAges) {
      const captureAtMs =
        Date.parse(item.publishedAt) + target.targetContentAgeMilliseconds;
      if (!Number.isSafeInteger(captureAtMs) || !Number.isFinite(captureAtMs)) {
        blockers.push('prospective-enrollment-capture-time-invalid');
        continue;
      }
      const captureAt = new Date(captureAtMs).toISOString();
      const missedBeforeEnrollment =
        captureAtMs <= Date.parse(item.firstSeenAt);

      if (missedBeforeEnrollment) {
        blockers.push('prospective-enrollment-target-age-missed-before-enrollment');
      }

      tasks.push(Object.freeze({
        taskId: [
          input.enrollmentId,
          target.datasetId,
          input.canonicalArtistId,
          videoId,
          input.metricId,
          String(target.targetContentAgeMilliseconds),
        ].join(':'),
        datasetId: target.datasetId,
        canonicalArtistId: input.canonicalArtistId,
        youtubeChannelId: input.youtubeChannelId,
        providerClientRef: input.providerClientRef,
        videoId,
        metricId: input.metricId,
        publishedAt: item.publishedAt,
        firstSeenAt: item.firstSeenAt,
        targetContentAgeMilliseconds: target.targetContentAgeMilliseconds,
        captureAt,
        state: missedBeforeEnrollment
          ? 'missed-before-enrollment' as const
          : 'pending-prospective-capture' as const,
        discoveryEvidenceRef: item.evidenceRef,
      }));
    }
  }

  const taskIds = tasks.map((task) => task.taskId);
  if (uniqueSorted(taskIds).length !== taskIds.length) {
    blockers.push('prospective-enrollment-task-id-duplicate');
  }

  const missedTaskCount = tasks.filter(
    (task) => task.state === 'missed-before-enrollment',
  ).length;
  const pendingTasks = tasks.filter(
    (task) =>
      task.state === 'pending-prospective-capture'
      && task.firstSeenAt === input.evaluatedAt
      && Date.parse(task.captureAt) > Date.parse(input.evaluatedAt),
  );
  const dedupedBlockers = uniqueSorted(blockers);
  const state = dedupedBlockers.length === 0
    ? 'enrollment-active' as const
    : 'blocked' as const;

  const opsPacket: SnsFandomProspectiveEnrollmentOpsPacket = Object.freeze({
    contractVersion: SNS_FANDOM_REACTION_PROSPECTIVE_OPS_PACKET_VERSION,
    state: state === 'enrollment-active'
      ? 'ops-review-ready' as const
      : 'blocked' as const,
    enrollmentId: input.enrollmentId,
    providerId: 'youtube-data-api' as const,
    providerClientRef: input.providerClientRef,
    pendingTasks: Object.freeze([...pendingTasks]),
    providerGrantRequired: true as const,
    providerApprovalValidated: false as const,
    executionTimeRevalidationRequired: true as const,
    schedulerMutationAllowed: false as const,
    activationMutationAllowed: false as const,
    collectionExecutionAuthorized: false as const,
    deploymentAuthorized: false as const,
  });

  return Object.freeze({
    contractVersion: SNS_FANDOM_REACTION_PROSPECTIVE_ENROLLMENT_VERSION,
    enrollmentId: input.enrollmentId,
    state,
    evaluatedAt: input.evaluatedAt,
    construct: input.construct,
    metricId: input.metricId,
    canonicalArtistId: input.canonicalArtistId,
    youtubeChannelId: input.youtubeChannelId,
    providerClientRef: input.providerClientRef,
    uploadsPlaylistId: input.uploadsPlaylistId,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    provisionalVideoIds: Object.freeze(uniqueSorted([...enrolled.keys()])),
    tasks: Object.freeze(tasks),
    pendingTaskCount: pendingTasks.length,
    missedTaskCount,
    contentUniverseComplete: false as const,
    finalManifestReconciliationRequired: true as const,
    discoveryCadenceMilliseconds: null,
    arbitraryDiscoveryCadenceApplied: false as const,
    arbitraryTargetAgeDefaultApplied: false as const,
    automaticBackfillAllowed: false as const,
    opsPacket,
    blockers: Object.freeze(dedupedBlockers),
  });
}

export function reconcileSnsFandomProspectiveEnrollmentWithFinalManifest(
  input: Readonly<{
    enrollment: SnsFandomProspectiveEnrollmentResult;
    finalManifest: SnsFandomYoutubeContentManifest;
    reconciledAt: string;
  }>,
): SnsFandomProspectiveEnrollmentReconciliationResult {
  const blockers: string[] = [];
  const manifestValidation =
    validateSnsFandomYoutubeContentManifest(input.finalManifest);

  if (input.enrollment.state !== 'enrollment-active') {
    blockers.push('prospective-enrollment-reconciliation-enrollment-not-active');
  }
  if (input.enrollment.missedTaskCount > 0) {
    blockers.push('prospective-enrollment-reconciliation-has-missed-captures');
  }
  if (!validIso(input.reconciledAt)) {
    blockers.push('prospective-enrollment-reconciliation-time-invalid');
  }
  if (!manifestValidation.ok) {
    blockers.push('prospective-enrollment-final-manifest-invalid');
    blockers.push(...manifestValidation.blockers);
  }

  if (
    input.finalManifest.canonicalArtistId !== input.enrollment.canonicalArtistId
    || input.finalManifest.youtubeChannelId !== input.enrollment.youtubeChannelId
    || input.finalManifest.providerClientRef !== input.enrollment.providerClientRef
    || input.finalManifest.uploadsPlaylistId !== input.enrollment.uploadsPlaylistId
    || input.finalManifest.windowStart !== input.enrollment.windowStart
    || input.finalManifest.windowEnd !== input.enrollment.windowEnd
  ) {
    blockers.push('prospective-enrollment-final-manifest-scope-mismatch');
  }

  if (
    validIso(input.reconciledAt)
    && validIso(input.finalManifest.windowEnd)
    && Date.parse(input.reconciledAt) < Date.parse(input.finalManifest.windowEnd)
  ) {
    blockers.push('prospective-enrollment-final-manifest-window-not-finalized');
  }

  const provisionalVideoIds = uniqueSorted(
    input.enrollment.provisionalVideoIds,
  );
  const finalManifestVideoIds = uniqueSorted(
    manifestValidation.selectedVideoIds,
  );
  const missingFromEnrollmentVideoIds = exactStringSetDifference(
    finalManifestVideoIds,
    provisionalVideoIds,
  );
  const absentFromFinalManifestVideoIds = exactStringSetDifference(
    provisionalVideoIds,
    finalManifestVideoIds,
  );

  if (
    missingFromEnrollmentVideoIds.length > 0
    || absentFromFinalManifestVideoIds.length > 0
  ) {
    blockers.push('prospective-enrollment-final-manifest-set-mismatch');
  }

  const enrolledPublishedAt = new Map(
    input.enrollment.tasks.map((task) => [task.videoId, task.publishedAt]),
  );
  const publishedAtMismatchVideoIds = uniqueSorted(
    input.finalManifest.items
      .filter((item) => {
        const enrolled = enrolledPublishedAt.get(item.videoId);
        return enrolled !== undefined && enrolled !== item.publishedAt;
      })
      .map((item) => item.videoId),
  );
  if (publishedAtMismatchVideoIds.length > 0) {
    blockers.push('prospective-enrollment-final-manifest-published-at-mismatch');
  }

  const dedupedBlockers = uniqueSorted(blockers);
  const contentUniverseReconciled = dedupedBlockers.length === 0;

  return Object.freeze({
    contractVersion: SNS_FANDOM_REACTION_PROSPECTIVE_ENROLLMENT_VERSION,
    enrollmentId: input.enrollment.enrollmentId,
    state: contentUniverseReconciled
      ? 'reconciliation-ready' as const
      : 'blocked' as const,
    reconciledAt: input.reconciledAt,
    provisionalVideoIds: Object.freeze(provisionalVideoIds),
    finalManifestVideoIds: Object.freeze(finalManifestVideoIds),
    missingFromEnrollmentVideoIds:
      Object.freeze(missingFromEnrollmentVideoIds),
    absentFromFinalManifestVideoIds:
      Object.freeze(absentFromFinalManifestVideoIds),
    publishedAtMismatchVideoIds:
      Object.freeze(publishedAtMismatchVideoIds),
    contentUniverseReconciled,
    prospectiveContentUniverseEligibleForDatasetAssembly:
      contentUniverseReconciled,
    validationDatasetUseAllowed: false as const,
    automaticBackfillAllowed: false as const,
    blockers: Object.freeze(dedupedBlockers),
  });
}
