import { runNaverNewsShadowSeriesVerification } from '../../lib/server/ingestion/naverNewsShadowSeriesVerifier';

const THROUGH_SLOT = '2026-09-21T00:00:00.000Z';
const EXPECTED_JOB_ID =
  'dae0750b1ad81f468f479328ef726e6344eaa31a62246cce3e4aeebc5d9a3f7d';

async function main() {
  if (process.env.VERCEL_ENV !== 'preview') {
    console.log('momentum_v158_preview_build_verifier=skipped_non_preview');
    return;
  }

  const result = await runNaverNewsShadowSeriesVerification(
    [
      '--artist',
      'iu',
      '--protocol-start',
      '2026-09-15T16:00:00.000Z',
      '--through-slot-start',
      THROUGH_SLOT,
    ],
    process.env,
  );

  const latest = result.activity?.slots.at(-1) ?? null;
  const valid =
    result.canonicalArtistId === 'iu'
    && result.protocolStart === '2026-09-15T16:00:00.000Z'
    && result.throughSlotStart === THROUGH_SLOT
    && result.expectedSlotCount === 129
    && result.snapshotCount === 129
    && result.status === 'available'
    && result.activity?.status === 'available'
    && latest?.slotStart === THROUGH_SLOT
    && latest?.jobId === EXPECTED_JOB_ID
    && latest?.observedObservationCount === 100
    && latest?.bootstrap === false;

  if (!valid) {
    throw new Error('momentum_v158_preview_build_stored_evidence_mismatch');
  }

  console.log(JSON.stringify({
    verifier: 'momentum_v158_preview_build_stored_evidence',
    canonicalArtistId: result.canonicalArtistId,
    protocolStart: result.protocolStart,
    throughSlotStart: result.throughSlotStart,
    expectedSlotCount: result.expectedSlotCount,
    snapshotCount: result.snapshotCount,
    status: result.status,
    activityStatus: result.activity?.status ?? null,
    latest: {
      slotStart: latest.slotStart,
      jobId: latest.jobId,
      collectionCompleteness: latest.collectionCompleteness,
      observedObservationCount: latest.observedObservationCount,
      firstSeenObservationCount: latest.firstSeenObservationCount,
      bootstrap: latest.bootstrap,
    },
    storedEvidenceReproducedThisEvaluation: true,
  }));
}

main().catch(() => {
  console.error(
    'momentum_v158_preview_build_stored_evidence_verification_failed_closed',
  );
  process.exitCode = 1;
});
