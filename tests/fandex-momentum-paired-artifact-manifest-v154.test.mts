import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { sha256Canonical } from '../lib/shared/canonicalDigest';
import {
  buildFandexMomentumPairedArtifactManifestResearch,
  evaluateFandexMomentumPairedArtifactAcceptanceResearch,
  FANDEX_MOMENTUM_PAIRED_ARTIFACT_MANIFEST_RESEARCH_DESCRIPTOR,
  parseFandexMomentumPairedArtifactManifestJsonl,
  serializeFandexMomentumPairedArtifactManifestRecord,
  type FandexMomentumPairedArtifactManifestRecord,
} from '../lib/intelligence/fandexMomentumPairedArtifactManifestResearch';

const historyUrl = new URL(
  '../data/momentum-research/iu_cross_family_evidence_state_v147.jsonl',
  import.meta.url,
);
const watermarkUrl = new URL(
  '../data/momentum-research/iu_evaluation_watermark_v151.jsonl',
  import.meta.url,
);
const auditUrl = new URL(
  '../data/momentum-research/iu_current_real_v152_20260920T150000Z.json',
  import.meta.url,
);

function artifactDigest(value: string): string {
  return sha256Canonical({ artifactJsonl: value });
}

async function currentArtifacts() {
  const [historyJsonl, watermarkJsonl, auditRaw] = await Promise.all([
    readFile(historyUrl, 'utf8'),
    readFile(watermarkUrl, 'utf8'),
    readFile(auditUrl, 'utf8'),
  ]);
  return {
    historyJsonl,
    watermarkJsonl,
    audit: JSON.parse(auditRaw),
  };
}

function currentInitialCoordinator(audit: any) {
  return {
    contractVersion:
      'v152_fandex_momentum_dual_artifact_evaluation_coordinator_research_v1' as const,
    state: audit.initialV152Application.state,
    priorHistoryRecordCount:
      audit.initialV152Application.historyRecordCountBefore,
    resultingHistoryRecordCount:
      audit.initialV152Application.historyRecordCountAfter,
    priorWatermarkRecordCount:
      audit.initialV152Application.watermarkRecordCountBefore,
    resultingWatermarkRecordCount:
      audit.initialV152Application.watermarkRecordCountAfter,
    priorHistoryDigest: audit.initialV152Application.priorHistoryDigest,
    resultingHistoryDigest:
      audit.initialV152Application.resultingHistoryDigest,
    priorWatermarkDigest:
      audit.initialV152Application.priorWatermarkDigest,
    resultingWatermarkDigest:
      audit.initialV152Application.resultingWatermarkDigest,
    effects: audit.initialV152Application.effects,
    digest: audit.initialV152Application.coordinatorDigest,
  };
}

function currentReplayCoordinator(audit: any) {
  return {
    contractVersion:
      'v152_fandex_momentum_dual_artifact_evaluation_coordinator_research_v1' as const,
    state: audit.committedReplayValidation.state,
    priorHistoryRecordCount:
      audit.committedReplayValidation.historyRecordCountBefore,
    resultingHistoryRecordCount:
      audit.committedReplayValidation.historyRecordCountAfter,
    priorWatermarkRecordCount:
      audit.committedReplayValidation.watermarkRecordCountBefore,
    resultingWatermarkRecordCount:
      audit.committedReplayValidation.watermarkRecordCountAfter,
    priorHistoryDigest: audit.committedReplayValidation.historyDigest,
    resultingHistoryDigest: audit.committedReplayValidation.historyDigest,
    priorWatermarkDigest: audit.committedReplayValidation.watermarkDigest,
    resultingWatermarkDigest: audit.committedReplayValidation.watermarkDigest,
    effects: audit.committedReplayValidation.effects,
    digest: audit.committedReplayValidation.coordinatorDigest,
  };
}

test('v154 is a research-only paired persistence manifest boundary', () => {
  assert.equal(
    FANDEX_MOMENTUM_PAIRED_ARTIFACT_MANIFEST_RESEARCH_DESCRIPTOR
      .detectsPartialWrite,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_PAIRED_ARTIFACT_MANIFEST_RESEARCH_DESCRIPTOR
      .detectsStaleBase,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_PAIRED_ARTIFACT_MANIFEST_RESEARCH_DESCRIPTOR
      .detectsManifestReordering,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_PAIRED_ARTIFACT_MANIFEST_RESEARCH_DESCRIPTOR
      .databaseWriteAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_PAIRED_ARTIFACT_MANIFEST_RESEARCH_DESCRIPTOR
      .productionEligible,
    false,
  );
});

test('current-real watermark-only application binds the exact prior/result pair', async () => {
  const { historyJsonl, watermarkJsonl, audit } = await currentArtifacts();
  const coordinator = currentInitialCoordinator(audit);
  const manifest = buildFandexMomentumPairedArtifactManifestResearch({
    coordinator,
    sequence: 1,
    manifestedAt: '2026-09-20T15:10:00.000Z',
    previousManifest: null,
  });

  assert.equal(manifest.coordinatorState, 'watermark-only-appended');
  assert.deepEqual(manifest.expectedWrites, {
    historyWrites: 0,
    watermarkWrites: 1,
  });
  assert.equal(
    manifest.priorHistoryDigest,
    '265ce50cfbe64ba86c3aa21c4203ab21580e7d082df52a872d95a0eb983a2109',
  );
  assert.equal(manifest.priorHistoryDigest, manifest.resultingHistoryDigest);
  assert.equal(
    manifest.priorWatermarkDigest,
    'ba8a0660dcf8050f62f4d07a6b9212597f3bbfafecf015970da893214fb99de0',
  );
  assert.equal(
    manifest.resultingWatermarkDigest,
    'd89a21eddb2aad2284da0a5711ff702c225d2b272363b183e6a1690e22c0743f',
  );

  const priorWatermarkJsonl = watermarkJsonl.split(/\r?\n/)[0] + '\n';
  assert.equal(
    artifactDigest(priorWatermarkJsonl),
    manifest.priorWatermarkDigest,
  );
  assert.equal(artifactDigest(historyJsonl), manifest.resultingHistoryDigest);
  assert.equal(
    artifactDigest(watermarkJsonl),
    manifest.resultingWatermarkDigest,
  );

  const beforeWrite = evaluateFandexMomentumPairedArtifactAcceptanceResearch({
    manifest,
    observedHistoryJsonl: historyJsonl,
    observedWatermarkJsonl: priorWatermarkJsonl,
  });
  assert.equal(beforeWrite.state, 'writes-not-applied');
  assert.equal(beforeWrite.readyForNextEvaluation, false);

  const afterWrite = evaluateFandexMomentumPairedArtifactAcceptanceResearch({
    manifest,
    observedHistoryJsonl: historyJsonl,
    observedWatermarkJsonl: watermarkJsonl,
  });
  assert.equal(afterWrite.state, 'accepted-resulting-pair');
  assert.equal(afterWrite.readyForNextEvaluation, true);
  assert.deepEqual(afterWrite.blockers, []);
});

test('exact replay creates a chained no-write manifest accepted on unchanged pair', async () => {
  const { historyJsonl, watermarkJsonl, audit } = await currentArtifacts();
  const first = buildFandexMomentumPairedArtifactManifestResearch({
    coordinator: currentInitialCoordinator(audit),
    sequence: 1,
    manifestedAt: '2026-09-20T15:10:00.000Z',
    previousManifest: null,
  });
  const second = buildFandexMomentumPairedArtifactManifestResearch({
    coordinator: currentReplayCoordinator(audit),
    sequence: 2,
    manifestedAt: '2026-09-20T15:37:03.620Z',
    previousManifest: first,
  });

  assert.equal(second.coordinatorState, 'no-op');
  assert.deepEqual(second.expectedWrites, {
    historyWrites: 0,
    watermarkWrites: 0,
  });
  assert.equal(second.previousManifestDigest, first.manifestDigest);

  const accepted = evaluateFandexMomentumPairedArtifactAcceptanceResearch({
    manifest: second,
    observedHistoryJsonl: historyJsonl,
    observedWatermarkJsonl: watermarkJsonl,
  });
  assert.equal(accepted.state, 'expected-no-write-pair');
  assert.equal(accepted.readyForNextEvaluation, true);
});

test('synthetic dual-write manifest detects either one-sided physical write', async () => {
  const { historyJsonl, watermarkJsonl, audit } = await currentArtifacts();
  const first = buildFandexMomentumPairedArtifactManifestResearch({
    coordinator: currentInitialCoordinator(audit),
    sequence: 1,
    manifestedAt: '2026-09-20T15:10:00.000Z',
    previousManifest: null,
  });

  const resultingHistoryJsonl = historyJsonl + '{"future":"history"}\n';
  const resultingWatermarkJsonl =
    watermarkJsonl + '{"future":"watermark"}\n';
  const dualCoordinator = {
    contractVersion:
      'v152_fandex_momentum_dual_artifact_evaluation_coordinator_research_v1' as const,
    state: 'dual-appended' as const,
    priorHistoryRecordCount: 2,
    resultingHistoryRecordCount: 3,
    priorWatermarkRecordCount: 2,
    resultingWatermarkRecordCount: 3,
    priorHistoryDigest: artifactDigest(historyJsonl),
    resultingHistoryDigest: artifactDigest(resultingHistoryJsonl),
    priorWatermarkDigest: artifactDigest(watermarkJsonl),
    resultingWatermarkDigest: artifactDigest(resultingWatermarkJsonl),
    effects: {
      productMetricReads: 0 as const,
      productMetricWrites: 0 as const,
      previewFallbackReads: 0 as const,
      databaseWrites: 0 as const,
      historyWrites: 1 as const,
      watermarkWrites: 1 as const,
    },
    digest: 'd'.repeat(64),
  };
  const dual = buildFandexMomentumPairedArtifactManifestResearch({
    coordinator: dualCoordinator,
    sequence: 2,
    manifestedAt: '2026-09-21T02:05:00.000Z',
    previousManifest: first,
  });

  const none = evaluateFandexMomentumPairedArtifactAcceptanceResearch({
    manifest: dual,
    observedHistoryJsonl: historyJsonl,
    observedWatermarkJsonl: watermarkJsonl,
  });
  assert.equal(none.state, 'writes-not-applied');
  assert.equal(none.readyForNextEvaluation, false);

  const historyOnly = evaluateFandexMomentumPairedArtifactAcceptanceResearch({
    manifest: dual,
    observedHistoryJsonl: resultingHistoryJsonl,
    observedWatermarkJsonl: watermarkJsonl,
  });
  assert.equal(historyOnly.state, 'partial-history-only');
  assert.deepEqual(historyOnly.blockers, [
    'paired-artifact-watermark-write-missing',
  ]);

  const watermarkOnly = evaluateFandexMomentumPairedArtifactAcceptanceResearch({
    manifest: dual,
    observedHistoryJsonl: historyJsonl,
    observedWatermarkJsonl: resultingWatermarkJsonl,
  });
  assert.equal(watermarkOnly.state, 'partial-watermark-only');
  assert.deepEqual(watermarkOnly.blockers, [
    'paired-artifact-history-write-missing',
  ]);

  const both = evaluateFandexMomentumPairedArtifactAcceptanceResearch({
    manifest: dual,
    observedHistoryJsonl: resultingHistoryJsonl,
    observedWatermarkJsonl: resultingWatermarkJsonl,
  });
  assert.equal(both.state, 'accepted-resulting-pair');
  assert.equal(both.readyForNextEvaluation, true);
});

test('unexpected artifact bytes fail closed even when one artifact is correct', async () => {
  const { historyJsonl, watermarkJsonl, audit } = await currentArtifacts();
  const first = buildFandexMomentumPairedArtifactManifestResearch({
    coordinator: currentInitialCoordinator(audit),
    sequence: 1,
    manifestedAt: '2026-09-20T15:10:00.000Z',
    previousManifest: null,
  });

  const result = evaluateFandexMomentumPairedArtifactAcceptanceResearch({
    manifest: first,
    observedHistoryJsonl: historyJsonl + 'tampered\n',
    observedWatermarkJsonl: watermarkJsonl,
  });
  assert.equal(result.state, 'unexpected-artifact-state');
  assert.equal(result.readyForNextEvaluation, false);
  assert.deepEqual(result.blockers, ['paired-artifact-state-unexpected']);
});

test('next manifest rejects a stale base before persistence can be accepted', async () => {
  const { audit } = await currentArtifacts();
  const first = buildFandexMomentumPairedArtifactManifestResearch({
    coordinator: currentInitialCoordinator(audit),
    sequence: 1,
    manifestedAt: '2026-09-20T15:10:00.000Z',
    previousManifest: null,
  });
  const stale = {
    ...currentReplayCoordinator(audit),
    priorWatermarkDigest: '0'.repeat(64),
    resultingWatermarkDigest: '0'.repeat(64),
  };

  assert.throws(
    () => buildFandexMomentumPairedArtifactManifestResearch({
      coordinator: stale,
      sequence: 2,
      manifestedAt: '2026-09-20T15:37:03.620Z',
      previousManifest: first,
    }),
    /momentum_v154_stale_base/,
  );
});

test('manifest JSONL rejects reorder, deletion gap, and hash-link tampering', async () => {
  const { audit } = await currentArtifacts();
  const first = buildFandexMomentumPairedArtifactManifestResearch({
    coordinator: currentInitialCoordinator(audit),
    sequence: 1,
    manifestedAt: '2026-09-20T15:10:00.000Z',
    previousManifest: null,
  });
  const second = buildFandexMomentumPairedArtifactManifestResearch({
    coordinator: currentReplayCoordinator(audit),
    sequence: 2,
    manifestedAt: '2026-09-20T15:37:03.620Z',
    previousManifest: first,
  });
  const jsonl =
    serializeFandexMomentumPairedArtifactManifestRecord(first)
    + '\n'
    + serializeFandexMomentumPairedArtifactManifestRecord(second)
    + '\n';
  assert.equal(
    parseFandexMomentumPairedArtifactManifestJsonl(jsonl).length,
    2,
  );

  const reordered =
    serializeFandexMomentumPairedArtifactManifestRecord(second)
    + '\n'
    + serializeFandexMomentumPairedArtifactManifestRecord(first)
    + '\n';
  assert.throws(
    () => parseFandexMomentumPairedArtifactManifestJsonl(reordered),
    /momentum_v154_manifest_order_invalid|momentum_v154_first_manifest_link_invalid/,
  );

  assert.throws(
    () => parseFandexMomentumPairedArtifactManifestJsonl(
      serializeFandexMomentumPairedArtifactManifestRecord(second) + '\n',
    ),
    /momentum_v154_manifest_order_invalid|momentum_v154_first_manifest_link_invalid/,
  );

  const tampered = {
    ...second,
    previousManifestDigest: 'f'.repeat(64),
  } as FandexMomentumPairedArtifactManifestRecord;
  assert.throws(
    () => parseFandexMomentumPairedArtifactManifestJsonl(
      serializeFandexMomentumPairedArtifactManifestRecord(first)
      + '\n'
      + JSON.stringify(tampered)
      + '\n',
    ),
    /momentum_v154_manifest_digest_mismatch/,
  );
});
