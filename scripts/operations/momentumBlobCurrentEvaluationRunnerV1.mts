import fs from 'node:fs/promises';

import {
  evaluateFandexMomentumCurrentEvaluationPipeline,
} from '../../lib/intelligence/fandexMomentumCurrentEvaluationPipeline';
import {
  evaluateFandexMomentumCurrentReevaluationReadiness,
  type FandexMomentumCurrentLastfmStatus,
} from '../../lib/intelligence/fandexMomentumCurrentReevaluationReadiness';
import {
  evaluateFandexMomentumRecoveryContinuityFromRepository,
} from '../../lib/intelligence/fandexMomentumRecoveryContinuityGate';
import type {
  MomentumCarrierTail,
} from '../../lib/intelligence/fandexMomentumCarrierPersistenceDecision';
import {
  NAVER_NEWS_ISSUE_POINT_CONSTRUCT,
} from '../../lib/intelligence/naverNewsIssuePointConstruct';
import {
  readMomentumEvidenceConsensusStoredEvidenceFromJsonl,
} from '../../lib/server/ingestion/momentumEvidenceConsensusRepository';
import {
  bindCanonicalArtistToNaverNews,
} from '../../lib/server/ingestion/naverNewsArtistBinding';
import {
  createProductionNaverNewsBlobEvidenceReadStore,
} from '../../lib/server/ingestion/naverNewsBlobMirrorRuntime';
import {
  evaluateNaverNewsIssuePointFrozenMethodology,
} from '../../lib/server/ingestion/naverNewsIssuePointFrozenMethodology';
import {
  buildNaverNewsSchedulerPlan,
  NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
} from '../../lib/server/ingestion/naverNewsScheduler';
import {
  assembleNaverNewsShadowFirstSeenSeries,
} from '../../lib/server/ingestion/naverNewsShadowFirstSeenSeries';
import {
  createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository,
  createObjectStoreNaverNewsLatestOfficialShadowSlotRepository,
} from '../../lib/server/ingestion/naverNewsStoredEvidenceMirror';

const ARTIST_ID = 'iu';
const LASTFM_HISTORY_PATH =
  'data/lastfm-cloud/lastfm_artist_interest_history_v1.csv';
const LASTFM_STATUS_PATH =
  'data/lastfm-cloud/lastfm_cloud_status_latest.json';
const CARRIER_PATH =
  'data/momentum-product/iu_momentum_evidence_consensus_v147.jsonl';
const HOUR_MS = 60 * 60 * 1_000;
const ANCHOR_HOURS =
  NAVER_NEWS_ISSUE_POINT_CONSTRUCT.selectedWindowDurationHours;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error('required_environment_missing:' + name);
  return value;
}

function positiveIntegerEnv(name: string): number {
  const value = Number(required(name));
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('required_integer_environment_invalid:' + name);
  }
  return value;
}

function currentCarrier(jsonl: string): MomentumCarrierTail {
  const lines = jsonl
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const last = lines.at(-1);
  if (!last) throw new Error('momentum_current_evaluation_carrier_missing');

  let parsed: unknown;
  try {
    parsed = JSON.parse(last);
  } catch {
    throw new Error('momentum_current_evaluation_carrier_invalid');
  }
  if (
    parsed === null
    || typeof parsed !== 'object'
    || Array.isArray(parsed)
    || typeof (parsed as Record<string, unknown>).recordDigest !== 'string'
  ) {
    throw new Error('momentum_current_evaluation_carrier_invalid');
  }

  const carrierRecordId =
    (parsed as Record<string, unknown>).recordDigest as string;
  const read = readMomentumEvidenceConsensusStoredEvidenceFromJsonl({
    artistId: ARTIST_ID,
    carrierRecordId,
    jsonl,
  });
  if (read.status !== 'ok') {
    throw new Error('momentum_current_evaluation_carrier_invalid');
  }

  const model = read.model;
  const sourceLineage = model.sourceV143Digest !== null
    ? Object.freeze({
        kind: 'legacy-v143' as const,
        sourceContractVersion:
          'v143_fandex_momentum_output_form_eligibility_research_v1' as const,
        sourceDigest: model.sourceV143Digest,
      })
    : Object.freeze({
        kind: 'categorical-attestation' as const,
        sourceContractVersion:
          'momentum-categorical-output-attestation-v1' as const,
        sourceDigest: model.sourceAttestationDigest as string,
      });

  return Object.freeze({
    canonicalArtistId: model.canonicalArtistId,
    carrierRecordId: model.carrierRecordId,
    alignmentCutoffAt: model.alignmentCutoffAt,
    directionalConsensus: model.directionalConsensus,
    persistenceConsensus: model.persistenceConsensus,
    sourceLineage,
  });
}

function anchorSlots(
  protocolStart: string,
  throughSlotStart: string,
): readonly string[] {
  const start = Date.parse(protocolStart);
  const through = Date.parse(throughSlotStart);
  if (!Number.isFinite(start) || !Number.isFinite(through) || through < start) {
    return Object.freeze([]);
  }

  const slots: string[] = [];
  for (
    let timestamp = through;
    timestamp >= start;
    timestamp -= ANCHOR_HOURS * HOUR_MS
  ) {
    slots.push(new Date(timestamp).toISOString());
  }
  return Object.freeze(slots.reverse());
}

async function main() {
  const [lastfmHistoryCsv, lastfmStatusJson, carrierJsonl] =
    await Promise.all([
      fs.readFile(LASTFM_HISTORY_PATH, 'utf8'),
      fs.readFile(LASTFM_STATUS_PATH, 'utf8'),
      fs.readFile(CARRIER_PATH, 'utf8'),
    ]);
  const lastfmStatus =
    JSON.parse(lastfmStatusJson) as FandexMomentumCurrentLastfmStatus;

  const store = createProductionNaverNewsBlobEvidenceReadStore(process.env);
  const slotRepository =
    createObjectStoreNaverNewsLatestOfficialShadowSlotRepository(store);
  const continuity =
    await evaluateFandexMomentumRecoveryContinuityFromRepository(
      slotRepository,
    );

  let qualifiedSeries = null;
  if (
    continuity.state === 'continuity-qualified-candidate'
    && continuity.candidateProtocolStart !== null
    && continuity.latestSuccessfulSlotStart !== null
  ) {
    const evidenceRepository =
      createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository(store);
    qualifiedSeries = await assembleNaverNewsShadowFirstSeenSeries({
      canonicalArtistId: ARTIST_ID,
      protocolStart: continuity.candidateProtocolStart,
      throughSlotStart: continuity.latestSuccessfulSlotStart,
    }, evidenceRepository);
  }

  const readiness = evaluateFandexMomentumCurrentReevaluationReadiness({
    continuity,
    naverSeries: qualifiedSeries,
    lastfmStatus,
  });

  console.log(
    'MOMENTUM_BLOB_CURRENT_EVALUATION_READINESS=' + readiness.state,
  );

  if (readiness.state !== 'ready-for-current-categorical-reevaluation') {
    console.log(JSON.stringify({
      state: 'not-executed',
      readinessState: readiness.state,
      readinessReason: readiness.reason,
      contiguousSuccessfulSlotCount:
        readiness.continuity.contiguousSuccessfulSlotCount,
      requiredSeriesSlotCount: readiness.continuity.requiredSeriesSlotCount,
      databaseReads: 0,
      databaseWrites: 0,
      blobWrites: 0,
      historyWritePerformed: false,
      productMetricWrites: 0,
      productionActivations: 0,
      productPublications: 0,
    }));
    return;
  }

  if (
    qualifiedSeries === null
    || readiness.candidateProtocolStart === null
    || readiness.throughSlotStart === null
  ) {
    throw new Error('momentum_blob_current_evaluation_series_missing');
  }

  const evidenceRepository =
    createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository(store);
  const issuePoints = [];
  for (
    const throughSlotStart of anchorSlots(
      readiness.candidateProtocolStart,
      readiness.throughSlotStart,
    )
  ) {
    const series = await assembleNaverNewsShadowFirstSeenSeries({
      canonicalArtistId: ARTIST_ID,
      protocolStart: readiness.candidateProtocolStart,
      throughSlotStart,
    }, evidenceRepository);
    issuePoints.push(
      evaluateNaverNewsIssuePointFrozenMethodology(series),
    );
  }

  const latestExpected = qualifiedSeries.expectedSlots.at(-1);
  if (!latestExpected) {
    throw new Error('momentum_blob_current_evaluation_latest_slot_missing');
  }

  const binding = bindCanonicalArtistToNaverNews(ARTIST_ID);
  const latestPlan = buildNaverNewsSchedulerPlan({
    query: binding.query,
    at: qualifiedSeries.throughSlotStart,
    display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  });

  const result = evaluateFandexMomentumCurrentEvaluationPipeline({
    canonicalArtistId: ARTIST_ID,
    lastfmHistoryCsv,
    naverIssuePoints: Object.freeze(issuePoints),
    latestNaverStoredEvidence: Object.freeze({
      throughSlotStart: qualifiedSeries.throughSlotStart,
      jobId: latestExpected.jobId,
      collectionKey: latestPlan.collectionKey,
      exactOfficialProtocol: true,
      seriesStatus: qualifiedSeries.status,
      expectedSlotCount: qualifiedSeries.expectedSlots.length,
      reproducedSnapshotCount: qualifiedSeries.snapshots.length,
    }),
    currentCarrier: currentCarrier(carrierJsonl),
    identity: Object.freeze({
      evaluatedAgainstMain: required('MOMENTUM_EVALUATED_MAIN_SHA'),
      evaluationHead: required('MOMENTUM_EVALUATED_MAIN_SHA'),
      workflowRunId: positiveIntegerEnv('GITHUB_RUN_ID'),
      workflowJobId: positiveIntegerEnv('MOMENTUM_WORKFLOW_JOB_ID'),
      evaluatedAt: new Date().toISOString(),
    }),
  });

  console.log('MOMENTUM_BLOB_CURRENT_EVALUATION_STATE=' + result.state);

  if (result.state === 'not-ready' || result.state === 'blocked') {
    console.log(JSON.stringify({
      state: result.state,
      stage: result.stage,
      reason: result.reason,
      databaseReads: 0,
      databaseWrites: 0,
      blobWrites: 0,
      historyWritePerformed: false,
      productMetricWrites: 0,
      productionActivations: 0,
      productPublications: 0,
    }));
    return;
  }

  console.log(
    'MOMENTUM_BLOB_CURRENT_EVALUATION_EXECUTION=' + result.execution.state,
  );
  console.log(JSON.stringify({
    state: result.state,
    executionState: result.execution.state,
    alignmentCutoffAt: result.v142.alignmentCutoffAt,
    directionalConsensus: result.v142.directionalConsensus,
    persistenceConsensus: result.v142.persistenceConsensus,
    evaluationEvidenceDigest:
      result.execution.state === 'blocked'
        ? null
        : result.execution.attestation.attestationDigest,
    appendRequired:
      result.execution.state === 'append-v2-carrier-candidate',
    databaseReads: 0,
    databaseWrites: 0,
    blobWrites: 0,
    historyWritePerformed: false,
    productMetricWrites: 0,
    previewFallbackReads: 0,
    registryMutations: 0,
    productionActivations: 0,
    productPublications: 0,
  }));
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'momentum_blob_current_evaluation_runner_failed',
  );
  process.exitCode = 1;
});
