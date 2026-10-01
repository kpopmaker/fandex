import fs from 'node:fs/promises';
import { Pool } from 'pg';

import {
  evaluateFandexMomentumCurrentEvaluationPipeline,
} from '../../lib/intelligence/fandexMomentumCurrentEvaluationPipeline';
import type {
  MomentumCarrierTail,
} from '../../lib/intelligence/fandexMomentumCarrierPersistenceDecision';
import {
  readMomentumEvidenceConsensusStoredEvidenceFromJsonl,
} from '../../lib/server/ingestion/momentumEvidenceConsensusRepository';
import {
  createPostgresNaverNewsCanonicalJobEvidenceReadRepository,
} from '../../lib/server/ingestion/naverNewsCanonicalJobEvidence';
import {
  assembleOfficialNaverNewsShadowFirstSeenSeries,
} from '../../lib/server/ingestion/naverNewsShadowFirstSeenSeries';
import {
  evaluateNaverNewsIssuePointFrozenMethodology,
} from '../../lib/server/ingestion/naverNewsIssuePointFrozenMethodology';
import {
  getOfficialNaverNewsShadowEpoch,
} from '../../lib/server/ingestion/naverNewsShadowEpoch';
import {
  bindCanonicalArtistToNaverNews,
} from '../../lib/server/ingestion/naverNewsArtistBinding';
import {
  buildNaverNewsSchedulerPlan,
  NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
} from '../../lib/server/ingestion/naverNewsScheduler';
import {
  requireRuntimeDatabaseUrl,
} from '../../lib/server/persistence/contracts';
import { parseCsvRows } from '../../lib/lastfm-signal/csv';

const ARTIST_ID = 'iu';
const ARTIST_LABEL = '아이유';
const HISTORY_PATH = 'data/lastfm-cloud/lastfm_artist_interest_history_v1.csv';
const CARRIER_PATH = 'data/momentum-product/iu_momentum_evidence_consensus_v147.jsonl';
const HOUR_MS = 60 * 60 * 1_000;
const ANCHOR_HOURS = 8;

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

function latestLastfmComponentEndAt(historyCsv: string): string {
  const rows = parseCsvRows(historyCsv)
    .filter((row) =>
      row.artist.normalize('NFC').trim() === ARTIST_LABEL
      && row.status === 'ok')
    .sort((left, right) => left.snapshotDate.localeCompare(right.snapshotDate));
  const latest = rows.at(-1);
  if (!latest) throw new Error('momentum_current_evaluation_lastfm_missing');
  const timestamp = Date.parse(latest.collectedAt);
  if (!Number.isFinite(timestamp)) {
    throw new Error('momentum_current_evaluation_lastfm_time_invalid');
  }
  return new Date(timestamp).toISOString();
}

function currentCarrier(jsonl: string): MomentumCarrierTail {
  const lines = jsonl.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
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
  const [lastfmHistoryCsv, carrierJsonl] = await Promise.all([
    fs.readFile(HISTORY_PATH, 'utf8'),
    fs.readFile(CARRIER_PATH, 'utf8'),
  ]);

  const lastfmComponentEndAt =
    latestLastfmComponentEndAt(lastfmHistoryCsv);
  const epoch = getOfficialNaverNewsShadowEpoch(ARTIST_ID);
  const binding = bindCanonicalArtistToNaverNews(ARTIST_ID);
  const selectedPlan = buildNaverNewsSchedulerPlan({
    query: binding.query,
    at: lastfmComponentEndAt,
    display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  });

  const pool = new Pool({
    connectionString: requireRuntimeDatabaseUrl(process.env),
    max: 1,
    connectionTimeoutMillis: 5_000,
    query_timeout: 30_000,
    statement_timeout: 30_000,
    ssl: { rejectUnauthorized: true },
  });

  try {
    const repository =
      createPostgresNaverNewsCanonicalJobEvidenceReadRepository(pool);

    const anchors = anchorSlots(epoch.protocolStart, selectedPlan.slotStart);
    const issuePoints = [];
    let latestSeries = null;

    for (const throughSlotStart of anchors) {
      const series = await assembleOfficialNaverNewsShadowFirstSeenSeries({
        canonicalArtistId: ARTIST_ID,
        throughSlotStart,
      }, repository);
      latestSeries = series;
      issuePoints.push(
        evaluateNaverNewsIssuePointFrozenMethodology(series),
      );
    }

    if (latestSeries === null) {
      console.log('MOMENTUM_CURRENT_EVALUATION_STATE=not-ready');
      console.log('MOMENTUM_CURRENT_EVALUATION_REASON=no-post-epoch-anchor');
      return;
    }

    const latestExpected = latestSeries.expectedSlots.at(-1);
    if (!latestExpected) {
      throw new Error('momentum_current_evaluation_latest_slot_missing');
    }

    const latestPlan = buildNaverNewsSchedulerPlan({
      query: binding.query,
      at: latestSeries.throughSlotStart,
      display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
    });

    const result = evaluateFandexMomentumCurrentEvaluationPipeline({
      canonicalArtistId: ARTIST_ID,
      lastfmHistoryCsv,
      naverIssuePoints: Object.freeze(issuePoints),
      latestNaverStoredEvidence: Object.freeze({
        throughSlotStart: latestSeries.throughSlotStart,
        jobId: latestExpected.jobId,
        collectionKey: latestPlan.collectionKey,
        exactOfficialProtocol: true,
        seriesStatus: latestSeries.status,
        expectedSlotCount: latestSeries.expectedSlots.length,
        reproducedSnapshotCount: latestSeries.snapshots.length,
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

    console.log('MOMENTUM_CURRENT_EVALUATION_STATE=' + result.state);
    if (result.state === 'not-ready' || result.state === 'blocked') {
      console.log('MOMENTUM_CURRENT_EVALUATION_STAGE=' + result.stage);
      console.log('MOMENTUM_CURRENT_EVALUATION_REASON=' + result.reason);
      console.log(JSON.stringify({
        state: result.state,
        stage: result.stage,
        reason: result.reason,
        officialProtocolStart: epoch.protocolStart,
        lastfmComponentEndAt,
        selectedNaverThroughSlotStart: selectedPlan.slotStart,
        databaseWrites: 0,
        historyWritePerformed: false,
        productMetricWrites: 0,
      }));
      return;
    }

    console.log(
      'MOMENTUM_CURRENT_EVALUATION_EXECUTION=' + result.execution.state,
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
      databaseWrites: 0,
      historyWritePerformed: false,
      productMetricWrites: 0,
      previewFallbackReads: 0,
    }));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'momentum_current_evaluation_runner_failed',
  );
  process.exitCode = 1;
});
