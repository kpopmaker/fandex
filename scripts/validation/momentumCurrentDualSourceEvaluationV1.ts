import 'server-only';

import { readFile } from 'node:fs/promises';

import {
  deriveFandexNaverMediaAttentionMomentumResearch,
} from '../../lib/intelligence/fandexNaverMediaAttentionMomentumResearch';
import {
  evaluateFandexMomentumTemporalNormalizationResearch,
} from '../../lib/intelligence/fandexMomentumTemporalNormalizationResearch';
import {
  evaluateFandexMomentumCrossFamilyCombinationResearch,
} from '../../lib/intelligence/fandexMomentumCrossFamilyCombinationResearch';
import {
  evaluateFandexMomentumOutputFormEligibilityResearch,
} from '../../lib/intelligence/fandexMomentumOutputFormEligibilityResearch';
import {
  assembleOfficialNaverNewsShadowFirstSeenSeries,
} from '../../lib/server/ingestion/naverNewsShadowFirstSeenSeries';
import {
  createPostgresNaverNewsCanonicalJobEvidenceReadRepository,
  type NaverNewsCanonicalJobEvidenceReadRepository,
} from '../../lib/server/ingestion/naverNewsCanonicalJobEvidence';
import {
  createPostgresNaverNewsLatestOfficialShadowSlotRepository,
  resolveLatestOfficialNaverNewsShadowThroughSlotStart,
} from '../../lib/server/ingestion/naverNewsLatestOfficialShadowSlot';
import {
  evaluateNaverNewsIssuePointFrozenMethodology,
  type NaverNewsIssuePointFrozenMethodologyResult,
} from '../../lib/server/ingestion/naverNewsIssuePointFrozenMethodology';
import { getRuntimeDatabasePool } from '../../lib/server/persistence/db';

const EIGHT_HOURS_MS = 8 * 60 * 60 * 1_000;
const LASTFM_HISTORY_URL = new URL(
  '../../data/lastfm-cloud/lastfm_artist_interest_history_v1.csv',
  import.meta.url,
);

const HISTORICAL_CARRIER = Object.freeze({
  carrierRecordId:
    '6bf29ed2e15a4c374f9985279e5d60e44eab404371fd807b62adad1bebf6cadd',
  alignmentCutoffAt: '2026-09-20T01:59:13.000Z',
  directionalConsensus: 'direction-conflicted',
  persistenceConsensus: 'persistence-not-applicable',
});

function buildEightHourAnchors(
  protocolStart: string,
  latestSlot: string,
): readonly string[] {
  const startMs = Date.parse(protocolStart);
  const latestMs = Date.parse(latestSlot);
  if (!Number.isFinite(startMs) || !Number.isFinite(latestMs) || latestMs < startMs) {
    throw new Error('momentum_current_evaluation_anchor_range_invalid');
  }

  const anchors: string[] = [];
  for (
    let timestamp = latestMs;
    timestamp >= startMs;
    timestamp -= EIGHT_HOURS_MS
  ) {
    anchors.push(new Date(timestamp).toISOString());
  }
  return Object.freeze(anchors.reverse());
}

function memoryRepository(
  storedByJobId: ReadonlyMap<string, Awaited<
    ReturnType<
      NonNullable<NaverNewsCanonicalJobEvidenceReadRepository['readJobEvidenceBatch']>
    >
  > extends ReadonlyMap<string, infer T> ? T : never>,
): NaverNewsCanonicalJobEvidenceReadRepository {
  return Object.freeze({
    async readJobEvidence(jobId: string) {
      return storedByJobId.get(jobId) ?? null;
    },
    async readJobEvidenceBatch(jobIds: readonly string[]) {
      const selected = new Map();
      for (const jobId of jobIds) {
        const stored = storedByJobId.get(jobId);
        if (stored) selected.set(jobId, stored);
      }
      return selected;
    },
  });
}

async function main(): Promise<void> {
  const pool = getRuntimeDatabasePool();
  try {
    const latestRepository =
    createPostgresNaverNewsLatestOfficialShadowSlotRepository(pool);
  const latest =
    await resolveLatestOfficialNaverNewsShadowThroughSlotStart(
      latestRepository,
    );

  if (latest.status !== 'ok') {
    throw new Error(
      'momentum_current_evaluation_latest_official_slot_unavailable',
    );
  }

  const evidenceRepository =
    createPostgresNaverNewsCanonicalJobEvidenceReadRepository(pool);

  const latestSeries = await assembleOfficialNaverNewsShadowFirstSeenSeries(
    {
      canonicalArtistId: 'iu',
      throughSlotStart: latest.throughSlotStart,
    },
    evidenceRepository,
  );

  if (
    latestSeries.status !== 'available'
    || latestSeries.activity?.status !== 'available'
    || !evidenceRepository.readJobEvidenceBatch
  ) {
    process.stdout.write(JSON.stringify({
      marker: 'FANDEX_MOMENTUM_CURRENT_DUAL_SOURCE_EVALUATION',
      state: 'blocked',
      latestOfficialSlot: latest.throughSlotStart,
      latestSeriesStatus: latestSeries.status,
      latestSeriesReason: latestSeries.reason,
      missingSlotStart: latestSeries.missingSlotStart,
      currentStoredEvidenceReproducedForReadiness: false,
      databaseWrites: 0,
      productMetricWrites: 0,
    }) + '\n');
    throw new Error(
      'momentum_current_evaluation_stored_evidence_not_reproduced',
    );
  }

  const allStoredEvidence = await evidenceRepository.readJobEvidenceBatch(
    latestSeries.expectedSlots.map((slot) => slot.jobId),
  );
  const repository = memoryRepository(allStoredEvidence);
  const anchors = buildEightHourAnchors(
    latest.protocolStart,
    latest.throughSlotStart,
  );

  const frozenPoints: NaverNewsIssuePointFrozenMethodologyResult[] = [];
  for (const throughSlotStart of anchors) {
    const series = await assembleOfficialNaverNewsShadowFirstSeenSeries(
      {
        canonicalArtistId: 'iu',
        throughSlotStart,
      },
      repository,
    );
    frozenPoints.push(evaluateNaverNewsIssuePointFrozenMethodology(series));
  }

  const naver =
    deriveFandexNaverMediaAttentionMomentumResearch(frozenPoints);
  const lastfmHistoryCsv = await readFile(LASTFM_HISTORY_URL, 'utf8');
  const normalized =
    evaluateFandexMomentumTemporalNormalizationResearch({
      canonicalArtistId: 'iu',
      lastfmHistoryCsv,
      naverComponent: naver,
    });
  const combination =
    evaluateFandexMomentumCrossFamilyCombinationResearch(normalized);
  const output =
    evaluateFandexMomentumOutputFormEligibilityResearch(combination);

  const current = output.currentResearchOutput;
  const evaluationChanged =
    output.alignmentCutoffAt !== HISTORICAL_CARRIER.alignmentCutoffAt
    || current.directionalConsensus
      !== HISTORICAL_CARRIER.directionalConsensus
    || current.persistenceConsensus
      !== HISTORICAL_CARRIER.persistenceConsensus;

  const result = Object.freeze({
    marker: 'FANDEX_MOMENTUM_CURRENT_DUAL_SOURCE_EVALUATION',
    state: output.state,
    canonicalArtistId: output.canonicalArtistId,
    latestOfficialSlot: latest.throughSlotStart,
    latestOfficialJobId: latest.jobId,
    protocolStart: latest.protocolStart,
    reproducedStoredEvidenceJobCount: allStoredEvidence.size,
    expectedStoredEvidenceJobCount: latestSeries.expectedSlots.length,
    currentStoredEvidenceReproducedForReadiness:
      allStoredEvidence.size === latestSeries.expectedSlots.length,
    evaluatedEightHourAnchorCount: frozenPoints.length,
    availableFrozenPointCount:
      frozenPoints.filter((point) => point.status === 'available').length,
    naver: Object.freeze({
      state: naver.state,
      sourcePointCount: naver.sourcePointCount,
      nonOverlappingAnchorCount: naver.nonOverlappingAnchorCount,
      latestDirection: naver.latestDirection,
      latestDirectionalRunTransitionCount:
        naver.latestDirectionalRunTransitionCount,
      latestDirectionalRunDurationHours:
        naver.latestDirectionalRunDurationHours,
      persistenceObserved: naver.persistenceObserved,
      componentScore: naver.componentScore,
    }),
    normalized: Object.freeze({
      state: normalized.state,
      alignmentCutoffAt: normalized.alignmentCutoffAt,
      componentCount: normalized.componentCount,
      normalizedComponentCount: normalized.normalizedComponentCount,
      components: normalized.components.map((component) => Object.freeze({
        family: component.family,
        selectedKey: component.selectedKey,
        selectedComponentEndAt: component.selectedComponentEndAt,
        freshnessLagHours: component.freshnessLagHours,
        freshnessWithinNativeCadence:
          component.freshnessWithinNativeCadence,
        direction: component.direction,
        latestDirectionalRunTransitionCount:
          component.latestDirectionalRunTransitionCount,
        latestDirectionalRunDurationHours:
          component.latestDirectionalRunDurationHours,
        historicalStrictExceedanceShare:
          component.historicalStrictExceedanceShare,
      })),
      componentWeights: normalized.componentWeights,
      compositeScore: normalized.compositeScore,
    }),
    combination: Object.freeze({
      state: combination.state,
      alignmentCutoffAt: combination.alignmentCutoffAt,
      directionalConsensus: combination.directionalConsensus,
      persistenceConsensus: combination.persistenceConsensus,
      qualitativeDirectionEvidenceUsable:
        combination.combinationDecision.qualitativeDirectionEvidenceUsable,
      productMomentumScore:
        combination.combinationDecision.productMomentumScore,
      digest: combination.digest,
    }),
    v143: Object.freeze({
      digest: output.digest,
      outputForm: current.outputForm,
      directionalConsensus: current.directionalConsensus,
      persistenceConsensus: current.persistenceConsensus,
      qualitativeDirectionEvidenceUsable:
        current.qualitativeDirectionEvidenceUsable,
      productMomentumScore: current.productMomentumScore,
    }),
    historicalCarrier: HISTORICAL_CARRIER,
    evaluationChanged,
    historyDecision:
      evaluationChanged
        ? 'new-carrier-observation-candidate'
        : 'attested-no-op-candidate',
    databaseReadMode: 'read-only',
    databaseWrites: 0,
    productMetricWrites: 0,
    previewFallbackUsedAsProductTruth: false,
  });

  if (!result.currentStoredEvidenceReproducedForReadiness) {
    throw new Error(
      'momentum_current_evaluation_stored_evidence_count_mismatch',
    );
  }
  if (output.state === 'blocked') {
    process.stdout.write(JSON.stringify(result) + '\n');
    throw new Error('momentum_current_evaluation_v143_blocked');
  }
  if (
    current.productMomentumScore !== null
    || combination.combinationDecision.productMomentumScore !== null
    || normalized.componentWeights !== null
    || normalized.compositeScore !== null
  ) {
    throw new Error('momentum_current_evaluation_numeric_boundary_violated');
  }

    process.stdout.write(JSON.stringify(result) + '\n');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'momentum_current_dual_source_evaluation_failed',
  );
  process.exitCode = 1;
});
