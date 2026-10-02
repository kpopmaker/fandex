import {
  type SnsFandomReactionValidationConstruct,
  type SnsFandomReactionValidationMetricId,
} from './snsFandomPointReactionValidationDataset';
import {
  validateSnsFandomYoutubeContentManifest,
  type SnsFandomYoutubeContentManifest,
} from './snsFandomPointYoutubeContentSelection';

export const SNS_FANDOM_REACTION_COLLECTION_PLAN_VERSION =
  'sns-fandom-reaction-validation-collection-plan-v1' as const;

export type SnsFandomReactionCollectionPlanObjective =
  | 'primary-validation'
  | 'content-age-sensitivity'
  | 'release-volume-sensitivity';

export type SnsFandomReactionTargetAgePlan = Readonly<{
  datasetId: string;
  targetContentAgeMilliseconds: number;
  rationaleEvidenceRef: string;
}>;

export type SnsFandomReactionExistingCapture = Readonly<{
  datasetId: string;
  canonicalArtistId: string;
  videoId: string;
  metricId: SnsFandomReactionValidationMetricId;
  observedAt: string;
  evidenceRef: string;
}>;

export type SnsFandomReactionCollectionTask = Readonly<{
  taskId: string;
  datasetId: string;
  canonicalArtistId: string;
  youtubeChannelId: string;
  providerClientRef: string;
  videoId: string;
  metricId: SnsFandomReactionValidationMetricId;
  publishedAt: string;
  targetContentAgeMilliseconds: number;
  captureAt: string;
  state: 'pending-prospective-capture' | 'already-captured' | 'missed';
  contentSelectionEvidenceRef: string;
  existingCaptureEvidenceRef: string | null;
}>;

export type SnsFandomReactionValidationDatasetBlueprint = Readonly<{
  datasetId: string;
  construct: SnsFandomReactionValidationConstruct;
  metricId: SnsFandomReactionValidationMetricId;
  targetContentAgeMilliseconds: number;
  canonicalArtistIds: readonly string[];
  expectedObservationCount: number;
  taskIds: readonly string[];
  lineageRequired: true;
  revisionAuditRequired: true;
  aggregateValue: null;
  normalizedValue: null;
}>;

export type SnsFandomReactionCollectionPlanInput = Readonly<{
  planId: string;
  plannedAt: string;
  construct: SnsFandomReactionValidationConstruct;
  metricId: SnsFandomReactionValidationMetricId;
  objectives: readonly SnsFandomReactionCollectionPlanObjective[];
  targetAges: readonly SnsFandomReactionTargetAgePlan[];
  artistManifests: readonly SnsFandomYoutubeContentManifest[];
  existingCaptures: readonly SnsFandomReactionExistingCapture[];
}>;

export type SnsFandomReactionCollectionPlanResult = Readonly<{
  contractVersion: typeof SNS_FANDOM_REACTION_COLLECTION_PLAN_VERSION;
  planId: string;
  state: 'planning-ready' | 'blocked';
  plannedAt: string;
  construct: SnsFandomReactionValidationConstruct;
  metricId: SnsFandomReactionValidationMetricId;
  objectives: readonly SnsFandomReactionCollectionPlanObjective[];
  canonicalArtistIds: readonly string[];
  providerClientRef: string | null;
  distinctTargetContentAgeCount: number;
  distinctSelectedContentCount: number;
  tasks: readonly SnsFandomReactionCollectionTask[];
  datasetBlueprints: readonly SnsFandomReactionValidationDatasetBlueprint[];
  pendingTaskCount: number;
  alreadyCapturedTaskCount: number;
  missedTaskCount: number;
  providerGrantRequired: true;
  schedulerMutationAllowed: false;
  collectionExecutionAuthorized: false;
  arbitraryTargetAgeDefaultApplied: false;
  arbitraryContentCountEqualizationAllowed: false;
  blockers: readonly string[];
}>;

function validIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function uniqueSorted(values: readonly string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function captureKey(
  datasetId: string,
  canonicalArtistId: string,
  videoId: string,
  metricId: SnsFandomReactionValidationMetricId,
): string {
  return [
    datasetId,
    canonicalArtistId,
    videoId,
    metricId,
  ].join('|');
}

export function buildSnsFandomReactionValidationCollectionPlan(
  input: SnsFandomReactionCollectionPlanInput,
): SnsFandomReactionCollectionPlanResult {
  const blockers: string[] = [];

  if (input.planId.trim().length === 0) {
    blockers.push('reaction-collection-plan-id-empty');
  }
  if (!validIso(input.plannedAt)) {
    blockers.push('reaction-collection-plan-time-invalid');
  }

  const objectives = uniqueSorted(input.objectives);
  if (objectives.length === 0) {
    blockers.push('reaction-collection-plan-objective-missing');
  }
  if (objectives.length !== input.objectives.length) {
    blockers.push('reaction-collection-plan-objective-duplicate');
  }

  const datasetIds = input.targetAges.map((item) => item.datasetId);
  if (uniqueSorted(datasetIds).length !== datasetIds.length) {
    blockers.push('reaction-collection-plan-dataset-id-duplicate');
  }

  const targetAges = input.targetAges.map(
    (item) => item.targetContentAgeMilliseconds,
  );
  if (input.targetAges.length === 0) {
    blockers.push('reaction-collection-plan-target-age-missing');
  }
  if (
    uniqueSorted(targetAges.map(String)).length !== targetAges.length
  ) {
    blockers.push('reaction-collection-plan-target-age-duplicate');
  }

  for (const target of input.targetAges) {
    if (target.datasetId.trim().length === 0) {
      blockers.push('reaction-collection-plan-dataset-id-empty');
    }
    if (
      !Number.isSafeInteger(target.targetContentAgeMilliseconds)
      || target.targetContentAgeMilliseconds <= 0
    ) {
      blockers.push('reaction-collection-plan-target-age-invalid');
    }
    if (target.rationaleEvidenceRef.trim().length === 0) {
      blockers.push(
        'reaction-collection-plan-target-age-rationale-missing',
      );
    }
  }

  if (
    objectives.includes('content-age-sensitivity')
    && uniqueSorted(targetAges.map(String)).length < 2
  ) {
    blockers.push(
      'reaction-collection-plan-content-age-sensitivity-needs-multiple-ages',
    );
  }

  const canonicalArtistIds = uniqueSorted(
    input.artistManifests.map((manifest) => manifest.canonicalArtistId),
  );
  if (canonicalArtistIds.length < 2) {
    blockers.push(
      'reaction-collection-plan-multi-artist-evidence-insufficient',
    );
  }
  if (canonicalArtistIds.length !== input.artistManifests.length) {
    blockers.push('reaction-collection-plan-canonical-artist-duplicate');
  }

  const providerClientRefs = uniqueSorted(
    input.artistManifests.map((manifest) => manifest.providerClientRef),
  );
  if (providerClientRefs.length !== 1) {
    blockers.push('reaction-collection-plan-provider-client-mismatch');
  }

  const selectedContentCounts: number[] = [];
  for (const manifest of input.artistManifests) {
    const validation = validateSnsFandomYoutubeContentManifest(manifest);
    if (!validation.ok) {
      blockers.push('reaction-collection-plan-content-manifest-invalid');
      blockers.push(...validation.blockers);
    }
    if (validation.selectedVideoIds.length === 0) {
      blockers.push('reaction-collection-plan-content-manifest-empty');
    }
    selectedContentCounts.push(validation.selectedVideoIds.length);
  }

  const distinctSelectedContentCount =
    uniqueSorted(selectedContentCounts.map(String)).length;
  if (
    objectives.includes('release-volume-sensitivity')
    && distinctSelectedContentCount < 2
  ) {
    blockers.push(
      'reaction-collection-plan-release-volume-variation-absent',
    );
  }

  const capturesByKey = new Map<string, SnsFandomReactionExistingCapture>();
  for (const capture of input.existingCaptures) {
    const key = captureKey(
      capture.datasetId,
      capture.canonicalArtistId,
      capture.videoId,
      capture.metricId,
    );
    if (capturesByKey.has(key)) {
      blockers.push('reaction-collection-plan-existing-capture-duplicate');
      continue;
    }
    if (
      capture.evidenceRef.trim().length === 0
      || !validIso(capture.observedAt)
    ) {
      blockers.push('reaction-collection-plan-existing-capture-invalid');
    }
    capturesByKey.set(key, capture);
  }

  const tasks: SnsFandomReactionCollectionTask[] = [];
  const blueprintTasks = new Map<string, string[]>();

  for (const target of input.targetAges) {
    blueprintTasks.set(target.datasetId, []);

    for (const manifest of input.artistManifests) {
      for (const item of manifest.items) {
        const publishedAtMs = Date.parse(item.publishedAt);
        const captureAtMs =
          publishedAtMs + target.targetContentAgeMilliseconds;
        if (
          !Number.isSafeInteger(captureAtMs)
          || !Number.isFinite(captureAtMs)
        ) {
          blockers.push('reaction-collection-plan-capture-time-invalid');
          continue;
        }

        const captureAt = new Date(captureAtMs).toISOString();
        const key = captureKey(
          target.datasetId,
          manifest.canonicalArtistId,
          item.videoId,
          input.metricId,
        );
        const existing = capturesByKey.get(key);
        let state: SnsFandomReactionCollectionTask['state'];
        let existingCaptureEvidenceRef: string | null = null;

        if (existing !== undefined) {
          if (
            existing.observedAt !== captureAt
            || existing.metricId !== input.metricId
          ) {
            blockers.push(
              'reaction-collection-plan-existing-capture-time-mismatch',
            );
            state = 'missed';
          } else {
            state = 'already-captured';
            existingCaptureEvidenceRef = existing.evidenceRef;
          }
        } else if (
          validIso(input.plannedAt)
          && captureAtMs <= Date.parse(input.plannedAt)
        ) {
          blockers.push(
            'reaction-collection-plan-prospective-capture-window-missed',
          );
          state = 'missed';
        } else {
          state = 'pending-prospective-capture';
        }

        const taskId = [
          input.planId,
          target.datasetId,
          manifest.canonicalArtistId,
          item.videoId,
          input.metricId,
          String(target.targetContentAgeMilliseconds),
        ].join(':');

        tasks.push(Object.freeze({
          taskId,
          datasetId: target.datasetId,
          canonicalArtistId: manifest.canonicalArtistId,
          youtubeChannelId: manifest.youtubeChannelId,
          providerClientRef: manifest.providerClientRef,
          videoId: item.videoId,
          metricId: input.metricId,
          publishedAt: item.publishedAt,
          targetContentAgeMilliseconds:
            target.targetContentAgeMilliseconds,
          captureAt,
          state,
          contentSelectionEvidenceRef: manifest.evidenceRef,
          existingCaptureEvidenceRef,
        }));

        blueprintTasks.get(target.datasetId)?.push(taskId);
      }
    }
  }

  const taskIds = tasks.map((task) => task.taskId);
  if (uniqueSorted(taskIds).length !== taskIds.length) {
    blockers.push('reaction-collection-plan-task-id-duplicate');
  }

  const datasetBlueprints =
    input.targetAges.map((target) => {
      const ids = blueprintTasks.get(target.datasetId) ?? [];
      return Object.freeze({
        datasetId: target.datasetId,
        construct: input.construct,
        metricId: input.metricId,
        targetContentAgeMilliseconds:
          target.targetContentAgeMilliseconds,
        canonicalArtistIds: Object.freeze([...canonicalArtistIds]),
        expectedObservationCount: ids.length,
        taskIds: Object.freeze([...ids]),
        lineageRequired: true as const,
        revisionAuditRequired: true as const,
        aggregateValue: null,
        normalizedValue: null,
      });
    });

  const pendingTaskCount = tasks.filter(
    (task) => task.state === 'pending-prospective-capture',
  ).length;
  const alreadyCapturedTaskCount = tasks.filter(
    (task) => task.state === 'already-captured',
  ).length;
  const missedTaskCount = tasks.filter(
    (task) => task.state === 'missed',
  ).length;

  if (missedTaskCount > 0) {
    blockers.push('reaction-collection-plan-has-missed-captures');
  }

  const dedupedBlockers = uniqueSorted(blockers);

  return Object.freeze({
    contractVersion: SNS_FANDOM_REACTION_COLLECTION_PLAN_VERSION,
    planId: input.planId,
    state: dedupedBlockers.length === 0
      ? 'planning-ready' as const
      : 'blocked' as const,
    plannedAt: input.plannedAt,
    construct: input.construct,
    metricId: input.metricId,
    objectives: Object.freeze(
      objectives as SnsFandomReactionCollectionPlanObjective[],
    ),
    canonicalArtistIds: Object.freeze(canonicalArtistIds),
    providerClientRef: providerClientRefs.length === 1
      ? providerClientRefs[0]
      : null,
    distinctTargetContentAgeCount:
      uniqueSorted(targetAges.map(String)).length,
    distinctSelectedContentCount,
    tasks: Object.freeze(tasks),
    datasetBlueprints: Object.freeze(datasetBlueprints),
    pendingTaskCount,
    alreadyCapturedTaskCount,
    missedTaskCount,
    providerGrantRequired: true as const,
    schedulerMutationAllowed: false as const,
    collectionExecutionAuthorized: false as const,
    arbitraryTargetAgeDefaultApplied: false as const,
    arbitraryContentCountEqualizationAllowed: false as const,
    blockers: Object.freeze(dedupedBlockers),
  });
}
