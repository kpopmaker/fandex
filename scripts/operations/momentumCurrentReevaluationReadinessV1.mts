import fs from 'node:fs/promises';

import {
  evaluateFandexMomentumCurrentReevaluationReadiness,
  type FandexMomentumCurrentLastfmStatus,
} from '../../lib/intelligence/fandexMomentumCurrentReevaluationReadiness';
import {
  evaluateFandexMomentumRecoveryContinuityFromRepository,
} from '../../lib/intelligence/fandexMomentumRecoveryContinuityGate';
import {
  createProductionNaverNewsBlobEvidenceReadStore,
} from '../../lib/server/ingestion/naverNewsBlobMirrorRuntime';
import {
  assembleNaverNewsShadowFirstSeenSeries,
} from '../../lib/server/ingestion/naverNewsShadowFirstSeenSeries';
import {
  createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository,
  createObjectStoreNaverNewsLatestOfficialShadowSlotRepository,
} from '../../lib/server/ingestion/naverNewsStoredEvidenceMirror';

const LASTFM_STATUS_PATH =
  'data/lastfm-cloud/lastfm_cloud_status_latest.json';

async function main() {
  const status = JSON.parse(
    await fs.readFile(LASTFM_STATUS_PATH, 'utf8'),
  ) as FandexMomentumCurrentLastfmStatus;

  const store = createProductionNaverNewsBlobEvidenceReadStore(process.env);
  const slotRepository =
    createObjectStoreNaverNewsLatestOfficialShadowSlotRepository(store);
  const continuity =
    await evaluateFandexMomentumRecoveryContinuityFromRepository(
      slotRepository,
    );

  let naverSeries = null;
  if (
    continuity.state === 'continuity-qualified-candidate'
    && continuity.candidateProtocolStart !== null
    && continuity.latestSuccessfulSlotStart !== null
  ) {
    const evidenceRepository =
      createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository(store);
    naverSeries = await assembleNaverNewsShadowFirstSeenSeries({
      canonicalArtistId: 'iu',
      protocolStart: continuity.candidateProtocolStart,
      throughSlotStart: continuity.latestSuccessfulSlotStart,
    }, evidenceRepository);
  }

  const result = evaluateFandexMomentumCurrentReevaluationReadiness({
    continuity,
    naverSeries,
    lastfmStatus: status,
  });

  console.log(
    'MOMENTUM_CURRENT_REEVALUATION_READINESS_STATE=' + result.state,
  );
  console.log(JSON.stringify(result));
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'momentum_current_reevaluation_readiness_failed',
  );
  process.exitCode = 1;
});
