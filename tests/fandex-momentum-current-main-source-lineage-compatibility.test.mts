import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  FANDEX_NAVER_MEDIA_ATTENTION_MOMENTUM_RESEARCH_DESCRIPTOR,
} from '../lib/intelligence/fandexNaverMediaAttentionMomentumResearch';
import {
  FANDEX_MOMENTUM_TEMPORAL_NORMALIZATION_RESEARCH_DESCRIPTOR,
} from '../lib/intelligence/fandexMomentumTemporalNormalizationResearch';
import {
  NAVER_NEWS_ISSUE_POINT_CONSTRUCT,
  NAVER_NEWS_ISSUE_POINT_METHODOLOGY_VERSION,
} from '../lib/intelligence/naverNewsIssuePointConstruct';
import {
  NAVER_NEWS_ISSUE_POINT_FROZEN_METHODOLOGY_CONTRACT_VERSION,
} from '../lib/server/ingestion/naverNewsIssuePointFrozenMethodology';

function gitBlobSha(content: string): string {
  const bytes = Buffer.from(content, 'utf8');
  return createHash('sha1')
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest('hex');
}

test('current-main source-lineage audit binds the exact local direct-source blobs', async () => {
  const [auditRaw, constructRaw, frozenRaw] = await Promise.all([
    readFile(new URL('../data/momentum-research/iu_momentum_current_main_source_lineage_compatibility_20260925T081535KST.json', import.meta.url), 'utf8'),
    readFile(
      new URL('../lib/intelligence/naverNewsIssuePointConstruct.ts', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL('../lib/server/ingestion/naverNewsIssuePointFrozenMethodology.ts', import.meta.url),
      'utf8',
    ),
  ]);
  const audit = JSON.parse(auditRaw);

  assert.equal(
    gitBlobSha(constructRaw),
    audit.directMomentumSourceContracts.construct.branchBlobSha,
  );
  assert.equal(
    audit.directMomentumSourceContracts.construct.branchBlobSha,
    audit.directMomentumSourceContracts.construct.mainBlobSha,
  );
  assert.equal(
    gitBlobSha(frozenRaw),
    audit.directMomentumSourceContracts.frozenMethodology.branchBlobSha,
  );
  assert.equal(
    audit.directMomentumSourceContracts.frozenMethodology.branchBlobSha,
    audit.directMomentumSourceContracts.frozenMethodology.mainBlobSha,
  );
});

test('current main remains semantically compatible with the v140/v141 media component contract', async () => {
  const raw = await readFile(new URL('../data/momentum-research/iu_momentum_current_main_source_lineage_compatibility_20260925T081535KST.json', import.meta.url), 'utf8');
  const audit = JSON.parse(raw);

  assert.equal(
    NAVER_NEWS_ISSUE_POINT_METHODOLOGY_VERSION,
    'v1_naver_news_issue_point_real_methodology',
  );
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.selectedWindowSlotCount, 8);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.selectedWindowDurationHours, 8);
  assert.equal(
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT.normalizationType,
    'HISTORICAL_STRICT_EXCEEDANCE_SHARE',
  );
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.missingOrGapAsZeroAllowed, false);
  assert.equal(
    NAVER_NEWS_ISSUE_POINT_FROZEN_METHODOLOGY_CONTRACT_VERSION,
    'v1_naver_news_issue_point_frozen_methodology',
  );
  assert.equal(
    FANDEX_NAVER_MEDIA_ATTENTION_MOMENTUM_RESEARCH_DESCRIPTOR
      .sourceMethodologyVersion,
    NAVER_NEWS_ISSUE_POINT_METHODOLOGY_VERSION,
  );
  assert.equal(
    FANDEX_NAVER_MEDIA_ATTENTION_MOMENTUM_RESEARCH_DESCRIPTOR
      .componentScoreProduced,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_TEMPORAL_NORMALIZATION_RESEARCH_DESCRIPTOR
      .crossFamilyRawAveragingAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_TEMPORAL_NORMALIZATION_RESEARCH_DESCRIPTOR
      .compositeScoreProduced,
    false,
  );

  assert.equal(
    audit.compatibilityResult.state,
    'source-contract-compatible-runtime-equivalence-not-live-replayed',
  );
  assert.equal(
    audit.compatibilityResult.v140SourceContractCompatibleWithCurrentMain,
    true,
  );
  assert.equal(
    audit.compatibilityResult.v141MediaComponentContractCompatibleWithCurrentMain,
    true,
  );
  assert.equal(audit.compatibilityResult.methodologyVersionChanged, false);
  assert.equal(audit.compatibilityResult.constructChanged, false);
  assert.equal(audit.compatibilityResult.windowSemanticsChanged, false);
  assert.equal(audit.compatibilityResult.normalizationChanged, false);
  assert.equal(audit.compatibilityResult.missingnessSemanticsChanged, false);
  assert.equal(audit.compatibilityResult.liveDatabaseEquivalenceReplayed, false);
});

test('lower-level main drift is classified without promoting unverified runtime equivalence', async () => {
  const raw = await readFile(new URL('../data/momentum-research/iu_momentum_current_main_source_lineage_compatibility_20260925T081535KST.json', import.meta.url), 'utf8');
  const audit = JSON.parse(raw);

  assert.equal(audit.lowerLevelReadDrift.sourcePr238.merged, true);
  assert.equal(
    audit.lowerLevelReadDrift.sourcePr238.classification,
    'read-performance-only-with-semantic-fallback',
  );
  assert.equal(
    audit.lowerLevelReadDrift.sourcePr238.facts.readJobEvidenceSinglePathRetained,
    true,
  );
  assert.equal(
    audit.lowerLevelReadDrift.sourcePr238.facts.optionalBatchReadAdded,
    true,
  );
  assert.equal(
    audit.lowerLevelReadDrift.sourcePr238.facts
      .sharedRehydrateStoredEvidenceUsedBySingleAndBatch,
    true,
  );
  assert.equal(
    audit.lowerLevelReadDrift.sourcePr238.facts
      .seriesFallsBackToSingleReadWhenBatchUnavailable,
    true,
  );
  assert.equal(
    audit.lowerLevelReadDrift.sourcePr238.facts.databaseWriteAdded,
    false,
  );

  assert.equal(audit.lowerLevelReadDrift.sourcePr239.merged, true);
  assert.equal(
    audit.lowerLevelReadDrift.sourcePr239.classification,
    'runtime-database-tls-hardening-outside-momentum-methodology',
  );
  assert.equal(
    audit.lowerLevelReadDrift.sourcePr239.facts.touchedMomentumConstruct,
    false,
  );
  assert.equal(
    audit.lowerLevelReadDrift.sourcePr239.facts.touchedFrozenMethodology,
    false,
  );

  assert.equal(audit.interpretation.noNewMethodologyVersionRequired, true);
  assert.equal(
    audit.interpretation.futureProductionDeploymentMustUseCurrentMainSecurityAndProductLineage,
    true,
  );
  assert.equal(audit.productBoundary.productMomentumScore, null);
  assert.equal(audit.productBoundary.productionEligible, false);
  assert.equal(audit.productBoundary.productProductionActual, '1/7');
  assert.deepEqual(audit.effects, {
    providerReads: 0,
    databaseReads: 0,
    databaseWrites: 0,
    credentialReads: 0,
    credentialWrites: 0,
    deployments: 0,
    productWrites: 0,
    registryMutations: 0,
    ledgerWrites: 0,
    pullRequestMerges: 0,
  });
});
