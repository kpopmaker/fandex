import type {
  RiskAdjustmentUpstreamVariableId,
} from './riskAdjustmentPointConstruct';

export const RISK_ADJUSTMENT_UPSTREAM_READINESS_WATCH_VERSION =
  'risk-adjustment-upstream-readiness-watch-v1' as const;

export type RiskAdjustmentUpstreamReadinessWatchMode =
  | 'current-main'
  | 'future-merge-target';

export type RiskAdjustmentUpstreamReadinessWatchedPath = Readonly<{
  path: string;
  mode: RiskAdjustmentUpstreamReadinessWatchMode;
}>;

export type RiskAdjustmentUpstreamReadinessWatchEntry = Readonly<{
  variableId: RiskAdjustmentUpstreamVariableId;
  issueNumber: number | null;
  watchedPaths: readonly RiskAdjustmentUpstreamReadinessWatchedPath[];
}>;

const current = (
  path: string,
): RiskAdjustmentUpstreamReadinessWatchedPath =>
  Object.freeze({ path, mode: 'current-main' as const });

const future = (
  path: string,
): RiskAdjustmentUpstreamReadinessWatchedPath =>
  Object.freeze({ path, mode: 'future-merge-target' as const });

export const RISK_ADJUSTMENT_UPSTREAM_READINESS_WATCH =
  Object.freeze([
    Object.freeze({
      variableId: 'newsIssuePoint' as const,
      issueNumber: 410,
      watchedPaths: Object.freeze([
        current(
          'lib/product/adapters/newsIssuePointRiskQualityMetadata.ts',
        ),
      ]),
    }),
    Object.freeze({
      variableId: 'comebackActivityPoint' as const,
      issueNumber: 411,
      watchedPaths: Object.freeze([
        current(
          'lib/product/adapters/activityExposureRiskQualityMetadata.ts',
        ),
      ]),
    }),
    Object.freeze({
      variableId: 'growthMomentumPoint' as const,
      issueNumber: 413,
      watchedPaths: Object.freeze([
        current(
          'lib/intelligence/fandexMomentumRecoveryContinuityGate.ts',
        ),
        current(
          'lib/server/ingestion/naverNewsBlobCurrentEvidenceCoverage.ts',
        ),
        // PR #427 is merged. The Blob-authoritative current reevaluation
        // readiness surface is now part of current main.
        current(
          'lib/intelligence/fandexMomentumCurrentReevaluationReadiness.ts',
        ),
      ]),
    }),
    Object.freeze({
      variableId: 'musicAlbumPoint' as const,
      issueNumber: 174,
      watchedPaths: Object.freeze([
        // PR #348 is the current-main productionization candidate. Watch
        // its Product readiness / Production handoff / rights review surfaces
        // so a later merge cannot bypass Risk eligibility review.
        future(
          'lib/product/readiness/musicAlbumPointProductReadiness.ts',
        ),
        future(
          'lib/product/readiness/musicAlbumPointProductionHandoff.ts',
        ),
        future(
          'lib/product/readiness/albumProviderAuthorizationReview.ts',
        ),
      ]),
    }),
    Object.freeze({
      variableId: 'snsFandomPoint' as const,
      issueNumber: 391,
      watchedPaths: Object.freeze([
        current('lib/intelligence/snsFandomPointContracts.ts'),
        current(
          'lib/intelligence/snsFandomPointProviderGrantActivationManifest.ts',
        ),
        current(
          'lib/intelligence/snsFandomPointCollectorActivationTransition.ts',
        ),
        current(
          'lib/intelligence/snsFandomPointValidationDatasetEligibility.ts',
        ),
        current(
          'lib/intelligence/snsFandomPointReactionAggregationMethodology.ts',
        ),
        current(
          'docs/research/sns-fandom-youtube-audit-evidence-refs-v1.json',
        ),
        current(
          'docs/research/sns-fandom-youtube-api-audit-packet-v1.md',
        ),
        // PR #420 is merged. The handoff contract exists on main, but the
        // checked-in owner input still intentionally carries null real
        // provider/client evidence.
        current(
          'lib/intelligence/snsFandomPointYoutubeProviderClientOwnerHandoff.ts',
        ),
        current(
          'docs/research/sns-fandom-youtube-provider-client-owner-input-v1.json',
        ),
        // PR #428 merged the owner-approved Phase B measurement plan.
        current(
          'lib/intelligence/snsFandomPointYoutubeQuotaOwnerHandoff.ts',
        ),
        current(
          'docs/research/sns-fandom-youtube-quota-owner-input-v1.json',
        ),
        // PR #429 decoupled Phase C measurement preparation from provider
        // batch-limit evidence. Watch the current-main handoff so later
        // measured-evidence progress cannot bypass Risk eligibility review.
        current(
          'lib/intelligence/snsFandomPointYoutubeQuotaMeasurementHandoff.ts',
        ),
        // PR #433 is merged. The bounded one-shot Phase C measurement
        // execution contract is now a current-main readiness surface.
        current(
          'lib/intelligence/snsFandomPointYoutubeBoundedMeasurement.ts',
        ),
      ]),
    }),
    Object.freeze({
      variableId: 'brandFitPoint' as const,
      issueNumber: 367,
      watchedPaths: Object.freeze([
        current('lib/intelligence/brandFitPointConstruct.ts'),
        current(
          'lib/intelligence/brandFitProductionCollectionHandoff.ts',
        ),
        current(
          'lib/intelligence/brandFitProductionObservationReceipt.ts',
        ),
        current(
          'lib/intelligence/brandFitStoredEvidenceReview.ts',
        ),
        current(
          'lib/intelligence/brandFitYouTubeProductionExecutionAuthorization.ts',
        ),
      ]),
    }),
  ] as const satisfies readonly RiskAdjustmentUpstreamReadinessWatchEntry[]);

export const RISK_ADJUSTMENT_UPSTREAM_READINESS_WATCH_PATHS =
  Object.freeze(
    [
      ...new Set(
        RISK_ADJUSTMENT_UPSTREAM_READINESS_WATCH.flatMap(
          (entry) => entry.watchedPaths.map((watched) => watched.path),
        ),
      ),
    ].sort((left, right) => left.localeCompare(right)),
  );

export const RISK_ADJUSTMENT_CURRENT_MAIN_READINESS_WATCH_PATHS =
  Object.freeze(
    [
      ...new Set(
        RISK_ADJUSTMENT_UPSTREAM_READINESS_WATCH.flatMap(
          (entry) =>
            entry.watchedPaths
              .filter((watched) => watched.mode === 'current-main')
              .map((watched) => watched.path),
        ),
      ),
    ].sort((left, right) => left.localeCompare(right)),
  );

export const RISK_ADJUSTMENT_FUTURE_MERGE_TARGET_WATCH_PATHS =
  Object.freeze(
    [
      ...new Set(
        RISK_ADJUSTMENT_UPSTREAM_READINESS_WATCH.flatMap(
          (entry) =>
            entry.watchedPaths
              .filter(
                (watched) => watched.mode === 'future-merge-target',
              )
              .map((watched) => watched.path),
        ),
      ),
    ].sort((left, right) => left.localeCompare(right)),
  );
