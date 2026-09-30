import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type {
  ProductMomentumEvidenceConsensusReadModelResult,
} from '../lib/product/contracts/productMomentumEvidenceConsensus';
import {
  createMomentumPublicRouteDesignCandidate,
} from '../lib/product/readiness/momentumPublicRouteDesignCandidate';
import {
  parseMomentumEvidenceConsensusHistory,
  readMomentumEvidenceConsensusShadowProductFromJsonl,
  readMomentumEvidenceConsensusStoredEvidenceFromJsonl,
} from '../lib/server/ingestion/momentumEvidenceConsensusRepository';
import {
  getMomentumEvidenceConsensusShadowProductForIU,
} from '../lib/server/product/momentumEvidenceConsensusRealProductRead';
import type {
  MomentumLiveShadowProductReadinessResult,
} from '../lib/product/readiness/momentumLiveShadowProductReadiness';
import {
  sha256Canonical,
} from '../lib/shared/canonicalDigest';

const ARTIFACT_URL = new URL(
  '../data/momentum-product/iu_momentum_evidence_consensus_v147.jsonl',
  import.meta.url,
);

const PREVIOUS_RECORD_DIGEST =
  '6bf29ed2e15a4c374f9985279e5d60e44eab404371fd807b62adad1bebf6cadd';
const PREVIOUS_SOURCE_DIGEST =
  '87edf2884c2f35a3a5819349ebb374012926f103fdeb3d41af10da59ca68de7a';
const SOURCE_ATTESTATION_DIGEST =
  '03888fbf16462320cb4fcd70c2f237f62a7f18e80f0f964d956fb75732af4582';
const SOURCE_ATTESTATION_CONTRACT =
  'momentum-categorical-output-attestation-v1';

function buildV2Record(
  overrides: Readonly<Record<string, unknown>> = {},
): Record<string, unknown> {
  const observation = {
    observationId:
      'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    providerId: 'fandex-derived',
    entity: {
      entityType: 'artist',
      entityId: 'iu',
      providerEntityId: null,
      identityState: 'canonical',
    },
    variable: {
      variableId: 'momentum.cross-family-evidence-state.research',
      metricFamily: 'momentum',
      role: 'diagnostic',
    },
    value: {
      rawValue: 'direction-conflicted',
      unit: null,
      missingState: 'observed',
    },
    time: {
      providerPeriodStart: null,
      providerPeriodEnd: '2026-09-27T02:10:05.000Z',
      observedAt: '2026-09-27T02:10:05.000Z',
      collectedAt: '2026-09-27T03:20:00.000Z',
    },
    evidence: {
      evidenceRef:
        'fandex:momentum:attestation:'
        + SOURCE_ATTESTATION_CONTRACT
        + ':'
        + SOURCE_ATTESTATION_DIGEST,
      revision: null,
      conflictState: 'cross-family-direction-conflict',
    },
    lifecycle: {
      state: 'research',
      materialClass: 'real',
      blockers: [],
    },
    contractVersion: 'fandex-observation-v1',
  };

  const payload: Record<string, unknown> = {
    contractVersion: 'v147_fandex_momentum_unified_history_research_v2',
    sequence: 3,
    recordedAt: '2026-09-27T03:20:00.000Z',
    canonicalArtistId: 'iu',
    alignmentCutoffAt: '2026-09-27T02:10:05.000Z',
    directionalConsensus: 'direction-conflicted',
    persistenceConsensus: 'persistence-not-applicable',
    sourceContractVersion: SOURCE_ATTESTATION_CONTRACT,
    sourceV143Digest: null,
    sourceAttestationContractVersion: SOURCE_ATTESTATION_CONTRACT,
    sourceAttestationDigest: SOURCE_ATTESTATION_DIGEST,
    changeKind: 'cutoff-advanced-same-state',
    previousSourceDigest: PREVIOUS_SOURCE_DIGEST,
    previousRecordDigest: PREVIOUS_RECORD_DIGEST,
    observation,
    isolation: {
      productMetricReads: 0,
      productMetricWrites: 0,
      previewFallbackReads: 0,
      databaseWrites: 0,
    },
    ...overrides,
  };

  return {
    ...payload,
    recordDigest: sha256Canonical(payload),
  };
}

async function historyWith(record: Record<string, unknown>): Promise<string> {
  const existing = (await readFile(ARTIFACT_URL, 'utf8')).trimEnd();
  return existing + '\n' + JSON.stringify(record) + '\n';
}

test('existing v147 v1 carrier history remains valid and byte-compatible', async () => {
  const jsonl = await readFile(ARTIFACT_URL, 'utf8');
  const parsed = parseMomentumEvidenceConsensusHistory(jsonl);

  assert.equal(parsed.length, 2);
  assert.equal(
    parsed[1].recordDigest,
    PREVIOUS_RECORD_DIGEST,
  );

  const result = readMomentumEvidenceConsensusShadowProductFromJsonl({
    artistId: 'iu',
    jsonl,
  });
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(
    result.model.storedEvidenceTrace.sourceV143Digest,
    PREVIOUS_SOURCE_DIGEST,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      result.model.storedEvidenceTrace,
      'sourceAttestationDigest',
    ),
    false,
  );
});

test('v2 carrier may chain from legacy v1 through preview-independent attestation', async () => {
  const record = buildV2Record();
  const jsonl = await historyWith(record);

  const parsed = parseMomentumEvidenceConsensusHistory(jsonl);
  assert.equal(parsed.length, 3);

  const product = readMomentumEvidenceConsensusShadowProductFromJsonl({
    artistId: 'iu',
    jsonl,
  });
  assert.equal(product.status, 'ok');
  if (product.status !== 'ok') return;

  assert.equal(
    product.model.evidence.alignmentCutoffAt,
    '2026-09-27T02:10:05.000Z',
  );
  assert.equal(
    product.model.evidence.directionalConsensus,
    'direction-conflicted',
  );
  assert.equal(
    product.model.evidence.persistenceConsensus,
    'persistence-not-applicable',
  );
  assert.equal(product.model.storedEvidenceTrace.sourceV143Digest, null);
  if (product.model.storedEvidenceTrace.sourceV143Digest !== null) return;

  assert.equal(
    product.model.storedEvidenceTrace.sourceAttestationContractVersion,
    SOURCE_ATTESTATION_CONTRACT,
  );
  assert.equal(
    product.model.storedEvidenceTrace.sourceAttestationDigest,
    SOURCE_ATTESTATION_DIGEST,
  );

  const serialized = JSON.stringify(product.model);
  assert.doesNotMatch(serialized, /"productMomentumScore"/);
  assert.doesNotMatch(serialized, /"normalizedValue"/);
});

test('exact v2 Stored Evidence lookup exposes attestation lineage without v143 reuse', async () => {
  const record = buildV2Record();
  const recordDigest = record.recordDigest as string;
  const jsonl = await historyWith(record);

  const result = readMomentumEvidenceConsensusStoredEvidenceFromJsonl({
    artistId: 'iu',
    carrierRecordId: recordDigest,
    jsonl,
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(
    result.model.historyContractVersion,
    'v147_fandex_momentum_unified_history_research_v2',
  );
  assert.equal(result.model.sourceV143Digest, null);
  assert.equal(
    result.model.sourceAttestationContractVersion,
    SOURCE_ATTESTATION_CONTRACT,
  );
  assert.equal(
    result.model.sourceAttestationDigest,
    SOURCE_ATTESTATION_DIGEST,
  );
  assert.equal(result.model.sourceDigest, SOURCE_ATTESTATION_DIGEST);
  assert.equal(result.model.previousSourceV143Digest, null);
  assert.equal(
    result.model.previousSourceDigest,
    PREVIOUS_SOURCE_DIGEST,
  );
});

test('v2 carrier fails closed if v142 attestation is mislabeled as sourceV143Digest', async () => {
  const record = buildV2Record({
    sourceV143Digest:
      'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  });
  const jsonl = await historyWith(record);

  const result = readMomentumEvidenceConsensusShadowProductFromJsonl({
    artistId: 'iu',
    jsonl,
  });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.equal(result.previewFallbackUsed, false);
  assert.equal(result.productMetricReadPerformed, false);
});

test('v2 carrier fails closed when previous source lineage does not match previous record', async () => {
  const record = buildV2Record({
    previousSourceDigest:
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  });
  const jsonl = await historyWith(record);

  const result = readMomentumEvidenceConsensusStoredEvidenceFromJsonl({
    artistId: 'iu',
    carrierRecordId: record.recordDigest as string,
    jsonl,
  });

  assert.deepEqual(result, {
    status: 'data-issue',
    reason: 'history-validation-failed',
  });
});

test('public route design accepts a valid attested trace without numeric promotion', async () => {
  const currentSource =
    await getMomentumEvidenceConsensusShadowProductForIU();

  assert.equal(currentSource.status, 'ok');
  if (currentSource.status !== 'ok') return;

  const model = currentSource.model;
  const attestedSource: ProductMomentumEvidenceConsensusReadModelResult =
    Object.freeze({
      status: 'ok' as const,
      model: Object.freeze({
        ...model,
        storedEvidenceTrace: Object.freeze({
          carrierRecordId: model.storedEvidenceTrace.carrierRecordId,
          observationId: model.storedEvidenceTrace.observationId,
          sourceV143Digest: null,
          sourceAttestationContractVersion:
            SOURCE_ATTESTATION_CONTRACT,
          sourceAttestationDigest: SOURCE_ATTESTATION_DIGEST,
          observationDigest: model.storedEvidenceTrace.observationDigest,
        }),
      }),
    });

  const readiness: MomentumLiveShadowProductReadinessResult =
    Object.freeze({
      contractVersion: 'momentum-live-shadow-product-readiness-v1',
      state: 'public-route-candidate' as const,
      productActivationReady: false as const,
      productPublicationReady: false as const,
      publicRouteDesignReady: true,
      productMomentumScore: null,
      numericProductEligible: false as const,
      previewFallbackAllowed: false as const,
      runtimeShadowReadVerified: true,
      currentCarrier: Object.freeze({
        carrierRecordId: model.storedEvidenceTrace.carrierRecordId,
        alignmentCutoffAt: model.evidence.alignmentCutoffAt,
        directionalConsensus: model.evidence.directionalConsensus,
        persistenceConsensus: model.evidence.persistenceConsensus,
        historicalOnly: false,
      }),
      sourceCurrentness: Object.freeze({
        lastfmSourceAdvancedBeyondCarrierCutoff: true,
        naverSchedulerObservedAfterCarrierCutoff: true,
        naverCurrentStoredEvidenceReproducedForReadiness: true,
        sourceAdvancementObserved: true,
      }),
      freshnessPolicy: Object.freeze({
        arbitraryAgeThresholdAllowed: false as const,
        maximumAgeDays: null,
        currentCategoricalEvaluationRequiredAfterSourceAdvancement:
          true as const,
        newHistoryObservationRequiredBeforeEvaluation: false as const,
        historyAppendDecision:
          'defer-until-current-evaluation' as const,
      }),
      currentEvaluation: Object.freeze({
        performed: true,
        currentCarrierProduced: true,
        currentNoOpEvaluationAttested: false,
        satisfiesFreshness: true,
        evaluatedAlignmentCutoffAt: model.evidence.alignmentCutoffAt,
        directionalConsensus: model.evidence.directionalConsensus,
        persistenceConsensus: model.evidence.persistenceConsensus,
        attestationPath:
          'data/momentum-product/iu_momentum_current_dual_source_evaluation_attestation_v1.json',
        attestationDigest: SOURCE_ATTESTATION_DIGEST,
      }),
      blockers: Object.freeze([]),
    });

  const result = createMomentumPublicRouteDesignCandidate(
    readiness,
    attestedSource,
  );

  assert.equal(result.status, 'ready-for-owner-review');
  if (result.status !== 'ready-for-owner-review') return;
  assert.equal(result.decision.productMomentumScore, null);
  assert.equal(result.decision.numericProductEligible, false);
  assert.equal(result.decision.previewFallbackAllowed, false);
  assert.equal(result.decision.publicRouteActivated, false);
});
