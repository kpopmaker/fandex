import 'server-only';

import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';

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
  createPostgresNaverNewsCanonicalJobEvidenceReadRepository,
} from '../../lib/server/ingestion/naverNewsCanonicalJobEvidence';
import {
  createPostgresNaverNewsLatestOfficialShadowSlotRepository,
  resolveLatestOfficialNaverNewsShadowThroughSlotStart,
} from '../../lib/server/ingestion/naverNewsLatestOfficialShadowSlot';
import {
  assembleOfficialNaverNewsShadowFirstSeenSeries,
  type NaverNewsShadowFirstSeenSeriesResult,
} from '../../lib/server/ingestion/naverNewsShadowFirstSeenSeries';
import {
  evaluateNaverNewsShadowFirstSeenActivity,
} from '../../lib/server/ingestion/naverNewsShadowFirstSeenActivity';
import {
  evaluateNaverNewsIssuePointFrozenMethodology,
} from '../../lib/server/ingestion/naverNewsIssuePointFrozenMethodology';
import {
  parseMomentumEvidenceConsensusHistory,
} from '../../lib/server/ingestion/momentumEvidenceConsensusRepository';
import {
  requireRuntimeDatabaseUrl,
} from '../../lib/server/persistence/contracts';
import type {
  NaverNewsIngestionPool,
} from '../../lib/server/ingestion/naverNewsRepository';

const HOUR_MS = 60 * 60 * 1_000;
const ANCHOR_HOURS = 8;

type RuntimePool = NaverNewsIngestionPool & { end(): Promise<void> };

function prefixSeries(
  full: NaverNewsShadowFirstSeenSeriesResult,
  throughSlotStart: string,
): NaverNewsShadowFirstSeenSeriesResult {
  const cutoff = Date.parse(throughSlotStart);
  const expectedSlots = full.expectedSlots.filter(
    (slot) => Date.parse(slot.slotStart) <= cutoff,
  );
  const snapshots = full.snapshots.filter(
    (snapshot) => Date.parse(snapshot.slotStart) <= cutoff,
  );
  const activity = evaluateNaverNewsShadowFirstSeenActivity({
    canonicalArtistId: full.canonicalArtistId,
    protocolStart: full.protocolStart,
    snapshots,
  });

  return Object.freeze({
    contractVersion: full.contractVersion,
    lifecycle: 'shadow' as const,
    directProductContributionEligible: false as const,
    canonicalArtistId: full.canonicalArtistId,
    schedulerVersion: full.schedulerVersion,
    protocolStart: full.protocolStart,
    throughSlotStart,
    expectedSlots: Object.freeze(expectedSlots),
    snapshots: Object.freeze(snapshots),
    status: activity.status,
    reason: activity.reason,
    missingSlotStart: null,
    missingJobId: null,
    activity,
  });
}

function classifyChange(input: Readonly<{
  previousCutoff: string;
  previousDirection: string;
  previousPersistence: string;
  currentCutoff: string | null;
  currentDirection: string;
  currentPersistence: string;
}>): string {
  if (input.currentCutoff === null) return 'evaluation-blocked';

  const previousMs = Date.parse(input.previousCutoff);
  const currentMs = Date.parse(input.currentCutoff);

  if (currentMs < previousMs) return 'alignment-regression-blocked';

  const directionChanged =
    input.currentDirection !== input.previousDirection;
  const persistenceChanged =
    input.currentPersistence !== input.previousPersistence;

  if (currentMs === previousMs) {
    if (!directionChanged && !persistenceChanged) {
      return 'attested-no-op-same-cutoff-same-state';
    }
    return 'same-observation-cutoff-revision-review-required';
  }

  if (directionChanged && persistenceChanged) {
    return 'new-carrier-direction-and-persistence-changed';
  }
  if (directionChanged) {
    return 'new-carrier-direction-state-changed';
  }
  if (persistenceChanged) {
    return 'new-carrier-persistence-state-changed';
  }
  return 'new-carrier-cutoff-advanced-same-state';
}

async function main(): Promise<void> {
  const connectionString = requireRuntimeDatabaseUrl(process.env);
  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 5_000,
    query_timeout: 60_000,
    statement_timeout: 60_000,
    ssl: { rejectUnauthorized: true },
  }) as unknown as RuntimePool;

  try {
    const latestRepository =
      createPostgresNaverNewsLatestOfficialShadowSlotRepository(pool);
    const latest =
      await resolveLatestOfficialNaverNewsShadowThroughSlotStart(
        latestRepository,
      );

    if (latest.status !== 'ok') {
      throw new Error('momentum_current_latest_naver_slot_unavailable');
    }

    const evidenceRepository =
      createPostgresNaverNewsCanonicalJobEvidenceReadRepository(pool);
    const fullSeries = await assembleOfficialNaverNewsShadowFirstSeenSeries(
      {
        canonicalArtistId: 'iu',
        throughSlotStart: latest.throughSlotStart,
      },
      evidenceRepository,
    );

    if (fullSeries.status !== 'available') {
      throw new Error(
        'momentum_current_naver_series_unavailable:' + fullSeries.reason,
      );
    }

    const startMs = Date.parse(fullSeries.protocolStart);
    const latestMs = Date.parse(latest.throughSlotStart);
    const anchorTimes: string[] = [];

    for (
      let timestamp = latestMs;
      timestamp >= startMs;
      timestamp -= ANCHOR_HOURS * HOUR_MS
    ) {
      anchorTimes.push(new Date(timestamp).toISOString());
    }
    anchorTimes.reverse();

    const frozenPoints = anchorTimes.map((throughSlotStart) =>
      evaluateNaverNewsIssuePointFrozenMethodology(
        prefixSeries(fullSeries, throughSlotStart),
      ),
    );

    const naverComponent =
      deriveFandexNaverMediaAttentionMomentumResearch(frozenPoints);

    const [lastfmHistoryCsv, carrierJsonl] = await Promise.all([
      readFile(
        new URL(
          '../../data/lastfm-cloud/lastfm_artist_interest_history_v1.csv',
          import.meta.url,
        ),
        'utf8',
      ),
      readFile(
        new URL(
          '../../data/momentum-product/iu_momentum_evidence_consensus_v147.jsonl',
          import.meta.url,
        ),
        'utf8',
      ),
    ]);

    const normalized =
      evaluateFandexMomentumTemporalNormalizationResearch({
        canonicalArtistId: 'iu',
        lastfmHistoryCsv,
        naverComponent,
      });

    const combined =
      evaluateFandexMomentumCrossFamilyCombinationResearch(normalized);

    const carrierHistory =
      parseMomentumEvidenceConsensusHistory(carrierJsonl);
    const previous = carrierHistory.at(-1);
    if (!previous) {
      throw new Error('momentum_current_previous_carrier_missing');
    }

    const decision = classifyChange({
      previousCutoff: previous.alignmentCutoffAt,
      previousDirection: previous.directionalConsensus,
      previousPersistence: previous.persistenceConsensus,
      currentCutoff: combined.alignmentCutoffAt,
      currentDirection: combined.directionalConsensus,
      currentPersistence: combined.persistenceConsensus,
    });

    const result = Object.freeze({
      contractVersion:
        'momentum-current-dual-source-categorical-evaluation-v1',
      canonicalArtistId: 'iu',
      latestNaverStoredEvidence: Object.freeze({
        throughSlotStart: latest.throughSlotStart,
        jobId: latest.jobId,
        collectionKey: latest.collectionKey,
        exactOfficialProtocol: true,
        seriesStatus: fullSeries.status,
        expectedSlotCount: fullSeries.expectedSlots.length,
        reproducedSnapshotCount: fullSeries.snapshots.length,
      }),
      naverComponent: Object.freeze({
        state: naverComponent.state,
        sourcePointCount: naverComponent.sourcePointCount,
        usableAvailablePointCount:
          naverComponent.usableAvailablePointCount,
        nonOverlappingAnchorCount:
          naverComponent.nonOverlappingAnchorCount,
        latestDirection: naverComponent.latestDirection,
        latestDirectionalRunTransitionCount:
          naverComponent.latestDirectionalRunTransitionCount,
        latestDirectionalRunDurationHours:
          naverComponent.latestDirectionalRunDurationHours,
        persistenceObserved: naverComponent.persistenceObserved,
        digest: naverComponent.digest,
      }),
      temporalNormalization: Object.freeze({
        state: normalized.state,
        alignmentCutoffAt: normalized.alignmentCutoffAt,
        componentCount: normalized.componentCount,
        normalizedComponentCount: normalized.normalizedComponentCount,
        components: Object.freeze(
          normalized.components.map((component) => Object.freeze({
            family: component.family,
            selectedKey: component.selectedKey,
            selectedComponentEndAt: component.selectedComponentEndAt,
            freshnessLagHours: component.freshnessLagHours,
            freshnessWithinNativeCadence:
              component.freshnessWithinNativeCadence,
            direction: component.direction,
            nativeDelta: component.nativeDelta,
            latestDirectionalRunTransitionCount:
              component.latestDirectionalRunTransitionCount,
            latestDirectionalRunDurationHours:
              component.latestDirectionalRunDurationHours,
            historicalStrictExceedanceShare:
              component.historicalStrictExceedanceShare,
          })),
        ),
        digest: normalized.digest,
      }),
      categoricalEvaluation: Object.freeze({
        state: combined.state,
        alignmentCutoffAt: combined.alignmentCutoffAt,
        directionalConsensus: combined.directionalConsensus,
        persistenceConsensus: combined.persistenceConsensus,
        qualitativeDirectionEvidenceUsable:
          combined.combinationDecision.qualitativeDirectionEvidenceUsable,
        productMomentumScore:
          combined.combinationDecision.productMomentumScore,
        digest: combined.digest,
      }),
      previousCarrier: Object.freeze({
        recordDigest: previous.recordDigest,
        alignmentCutoffAt: previous.alignmentCutoffAt,
        directionalConsensus: previous.directionalConsensus,
        persistenceConsensus: previous.persistenceConsensus,
        sourceV143Digest: previous.sourceV143Digest,
      }),
      decision: Object.freeze({
        classification: decision,
        currentDualSourceCategoricalEvaluationPerformed: true,
        currentNaverStoredEvidenceReproducedForReadiness: true,
        newHistoryObservationRequired:
          decision.startsWith('new-carrier-'),
        attestedNoOp:
          decision === 'attested-no-op-same-cutoff-same-state',
      }),
      safety: Object.freeze({
        databaseMode: 'read-only',
        databaseWrites: 0,
        productMetricReads: 0,
        productMetricWrites: 0,
        previewFallbackReads: 0,
        registryMutations: 0,
        productionActivations: 0,
      }),
    });

    process.stdout.write(
      'FANDEX_MOMENTUM_CURRENT_DUAL_SOURCE_EVALUATION='
        + JSON.stringify(result)
        + '\n',
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  const code =
    error instanceof Error
      ? error.message.replace(/[^a-zA-Z0-9:_-]/g, '_').slice(0, 160)
      : 'unknown';
  console.error(
    'FANDEX momentum current dual-source evaluation failed closed: ' + code,
  );
  process.exitCode = 1;
});
