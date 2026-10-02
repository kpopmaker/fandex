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
        // PR #373 remains open; creation/merge of this current-evaluation
        // surface must trigger the Risk inventory regression.
        future(
          'lib/intelligence/fandexMomentumCurrentEvaluationPipeline.ts',
        ),
      ]),
    }),
    Object.freeze({
      variableId: 'musicAlbumPoint' as const,
      issueNumber: 174,
      watchedPaths: Object.freeze([
        // PR #170 is still open and its research-only foundation is not on
        // main. These paths are intentionally watched as future creation
        // targets so a later merge cannot bypass Risk eligibility review.
        future(
          'lib/alternative-evidence/albumProductionReadinessResearch.ts',
        ),
        future(
          'lib/alternative-evidence/albumProviderAuthorizationResearch.ts',
        ),
        future(
          'lib/alternative-evidence/iuLuminateProductionReviewGateResearch.ts',
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
        // PR #421 is merged. The quota handoff exists on main, while the
        // checked-in owner template intentionally keeps real plan and
        // measurement evidence null.
        current(
          'lib/intelligence/snsFandomPointYoutubeQuotaOwnerHandoff.ts',
        ),
        current(
          'docs/research/sns-fandom-youtube-quota-owner-input-v1.json',
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
