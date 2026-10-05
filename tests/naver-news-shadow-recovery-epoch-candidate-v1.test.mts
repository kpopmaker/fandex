import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateFandexMomentumRecoveryContinuityGate,
  FANDEX_MOMENTUM_RECOVERY_REQUIRED_ANALYSIS_SLOT_COUNT,
  FANDEX_MOMENTUM_RECOVERY_REQUIRED_SERIES_SLOT_COUNT,
} from '../lib/intelligence/fandexMomentumRecoveryContinuityGate';
import {
  getOfficialNaverNewsShadowEpoch,
  NAVER_NEWS_IU_QSTASH_PRIMARY_PROTOCOL_START,
} from '../lib/server/ingestion/naverNewsShadowEpoch';

type Candidate = Readonly<{
  contractVersion: string;
  canonicalArtistId: string;
  state: string;
  candidateProtocolStart: string;
  qualifiedThroughSlotStart: string;
  contiguousSuccessfulSlotCount: number;
  requiredAnalysisSlotCount: number;
  requiredSeriesSlotCount: number;
  evidenceSource: string;
  sourceWorkflowRunId: number;
  sourceCollectionWorkflowRunId: number;
  latestCollectionJobId: string;
  missingSlotsSynthesized: boolean;
  backfillAuthorized: boolean;
  activationAllowed: boolean;
  activationApproved: boolean;
  active: boolean;
  productionOperationsApprovalRequired: boolean;
  currentOfficialEpochUnchanged: boolean;
}>;

async function readCandidate(): Promise<Candidate> {
  return JSON.parse(
    await readFile(
      new URL(
        '../data/momentum-product/iu_naver_news_shadow_recovery_epoch_candidate_v1.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as Candidate;
}

function hourlyInclusive(start: string, through: string): string[] {
  const startMs = Date.parse(start);
  const throughMs = Date.parse(through);
  assert.equal(Number.isFinite(startMs), true);
  assert.equal(Number.isFinite(throughMs), true);
  assert.equal(throughMs >= startMs, true);

  const values: string[] = [];
  for (
    let timestamp = startMs;
    timestamp <= throughMs;
    timestamp += 60 * 60 * 1_000
  ) {
    values.push(new Date(timestamp).toISOString());
  }
  return values;
}

test('recorded recovery epoch candidate reproduces the qualified continuity gate', async () => {
  const candidate = await readCandidate();
  const slots = hourlyInclusive(
    candidate.candidateProtocolStart,
    candidate.qualifiedThroughSlotStart,
  );
  const gate = evaluateFandexMomentumRecoveryContinuityGate(slots);

  assert.equal(
    candidate.contractVersion,
    'naver-news-shadow-recovery-epoch-candidate-v1',
  );
  assert.equal(candidate.canonicalArtistId, 'iu');
  assert.equal(gate.state, 'continuity-qualified-candidate');
  assert.equal(candidate.state, gate.state);
  assert.equal(candidate.candidateProtocolStart, gate.candidateProtocolStart);
  assert.equal(
    candidate.qualifiedThroughSlotStart,
    gate.latestSuccessfulSlotStart,
  );
  assert.equal(
    candidate.contiguousSuccessfulSlotCount,
    gate.contiguousSuccessfulSlotCount,
  );
  assert.equal(candidate.contiguousSuccessfulSlotCount, 60);
  assert.equal(
    candidate.requiredAnalysisSlotCount,
    FANDEX_MOMENTUM_RECOVERY_REQUIRED_ANALYSIS_SLOT_COUNT,
  );
  assert.equal(
    candidate.requiredSeriesSlotCount,
    FANDEX_MOMENTUM_RECOVERY_REQUIRED_SERIES_SLOT_COUNT,
  );
  assert.equal(
    candidate.contiguousSuccessfulSlotCount
      >= candidate.requiredSeriesSlotCount,
    true,
  );
  assert.equal(candidate.missingSlotsSynthesized, false);
  assert.equal(candidate.backfillAuthorized, false);
  assert.equal(candidate.activationAllowed, false);
  assert.equal(candidate.activationApproved, false);
  assert.equal(candidate.active, false);
  assert.equal(candidate.productionOperationsApprovalRequired, true);
  assert.equal(candidate.currentOfficialEpochUnchanged, true);
});

test('candidate artifact does not modify the active official NAVER News epoch', async () => {
  const candidate = await readCandidate();
  const official = getOfficialNaverNewsShadowEpoch('iu');

  assert.equal(
    NAVER_NEWS_IU_QSTASH_PRIMARY_PROTOCOL_START,
    '2026-09-15T16:00:00.000Z',
  );
  assert.equal(
    official.protocolStart,
    NAVER_NEWS_IU_QSTASH_PRIMARY_PROTOCOL_START,
  );
  assert.notEqual(
    candidate.candidateProtocolStart,
    official.protocolStart,
  );
  assert.equal(official.directProductContributionEligible, false);
  assert.equal(official.backfillAllowed, false);
});

test('candidate evidence provenance is fixed to the observed qualified runs', async () => {
  const candidate = await readCandidate();

  assert.equal(candidate.evidenceSource, 'immutable-blob-official-scheduler-manifest');
  assert.equal(candidate.sourceWorkflowRunId, 37308530454);
  assert.equal(candidate.sourceCollectionWorkflowRunId, 37308464300);
  assert.match(candidate.latestCollectionJobId, /^[0-9a-f]{64}$/);
});
