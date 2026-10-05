import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  getOfficialNaverNewsShadowEpoch,
  NAVER_NEWS_IU_RECOVERY_PROTOCOL_START,
  NAVER_NEWS_SHADOW_EPOCH_CONTRACT_VERSION,
} from '../lib/server/ingestion/naverNewsShadowEpoch';

type Activation = Readonly<{
  contractVersion: string;
  canonicalArtistId: string;
  action: string;
  authority: string;
  authorizationId: string;
  authorizedBaseMain: string;
  candidate: Readonly<{
    path: string;
    blobSha: string;
    contractVersion: string;
    candidateProtocolStart: string;
    qualifiedThroughSlotStart: string;
    contiguousSuccessfulSlotCount: number;
    requiredAnalysisSlotCount: number;
    requiredSeriesSlotCount: number;
    evidenceSource: string;
  }>;
  decision: Readonly<{
    activationAuthorized: boolean;
    officialEpochRolloverAuthorized: boolean;
    activatedProtocolStart: string;
    missingSlotsSynthesized: boolean;
    backfillAuthorized: boolean;
    publicRouteActivated: boolean;
    productScorePublished: boolean;
    directProductionContributionEligible: boolean;
  }>;
  safetyBoundary: Readonly<Record<string, boolean | number>>;
}>;

async function readActivation(): Promise<Activation> {
  return JSON.parse(
    await readFile(
      new URL(
        '../data/momentum-product/iu_naver_news_shadow_recovery_epoch_activation_v1.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as Activation;
}

test('owner authorization is exact-bound to the qualified recovery candidate', async () => {
  const activation = await readActivation();

  assert.equal(
    activation.contractVersion,
    'naver-news-shadow-recovery-epoch-activation-v1',
  );
  assert.equal(activation.canonicalArtistId, 'iu');
  assert.equal(activation.action, 'activate-qualified-recovery-epoch');
  assert.equal(activation.authority, 'product-operations-owner');
  assert.equal(
    activation.authorizationId,
    'ops-activate-naver-news-recovery-epoch-20261005-v1',
  );
  assert.equal(
    activation.authorizedBaseMain,
    '1e962d1ba2dfa663f0706941644ae208ad93b6a8',
  );
  assert.equal(
    activation.candidate.path,
    'data/momentum-product/iu_naver_news_shadow_recovery_epoch_candidate_v1.json',
  );
  assert.equal(
    activation.candidate.blobSha,
    '33cd7bb0352efe877be17732c14c311e86046422',
  );
  assert.equal(
    activation.candidate.contractVersion,
    'naver-news-shadow-recovery-epoch-candidate-v1',
  );
  assert.equal(
    activation.candidate.candidateProtocolStart,
    '2026-10-03T01:00:00.000Z',
  );
  assert.equal(activation.candidate.contiguousSuccessfulSlotCount, 60);
  assert.equal(activation.candidate.requiredAnalysisSlotCount, 48);
  assert.equal(activation.candidate.requiredSeriesSlotCount, 49);
  assert.equal(
    activation.candidate.contiguousSuccessfulSlotCount
      >= activation.candidate.requiredSeriesSlotCount,
    true,
  );
  assert.equal(
    activation.candidate.evidenceSource,
    'immutable-blob-official-scheduler-manifest',
  );
});

test('authorized recovery epoch is the official shadow epoch and remains fail-closed for publication', async () => {
  const activation = await readActivation();
  const official = getOfficialNaverNewsShadowEpoch('iu');

  assert.equal(
    NAVER_NEWS_SHADOW_EPOCH_CONTRACT_VERSION,
    'v2_naver_news_shadow_epoch',
  );
  assert.equal(
    NAVER_NEWS_IU_RECOVERY_PROTOCOL_START,
    activation.decision.activatedProtocolStart,
  );
  assert.equal(
    official.protocolStart,
    activation.decision.activatedProtocolStart,
  );
  assert.equal(activation.decision.activationAuthorized, true);
  assert.equal(activation.decision.officialEpochRolloverAuthorized, true);
  assert.equal(activation.decision.missingSlotsSynthesized, false);
  assert.equal(activation.decision.backfillAuthorized, false);
  assert.equal(activation.decision.publicRouteActivated, false);
  assert.equal(activation.decision.productScorePublished, false);
  assert.equal(
    activation.decision.directProductionContributionEligible,
    false,
  );
  assert.equal(official.directProductContributionEligible, false);
  assert.equal(official.backfillAllowed, false);
});

test('activation authorizes no provider execution or durable writes', async () => {
  const activation = await readActivation();

  assert.deepEqual(activation.safetyBoundary, {
    providerExecutionsAuthorized: 0,
    blobWritesAuthorized: 0,
    databaseWritesAuthorized: 0,
    missingSlotSynthesisAuthorized: false,
    backfillAuthorized: false,
    scorePublicationAuthorized: false,
    publicRouteCutoverAuthorized: false,
  });
});
