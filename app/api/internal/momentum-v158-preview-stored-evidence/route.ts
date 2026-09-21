import 'server-only';

import { runNaverNewsShadowSeriesVerification } from '@/lib/server/ingestion/naverNewsShadowSeriesVerifier';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const THROUGH_SLOT = '2026-09-21T00:00:00.000Z';
const EXPECTED_JOB_ID =
  'dae0750b1ad81f468f479328ef726e6344eaa31a62246cce3e4aeebc5d9a3f7d';

function rejected(): Response {
  return Response.json(
    { ok: false, code: 'momentum_v158_preview_stored_evidence_verifier_rejected' },
    { status: 403 },
  );
}

export async function GET(): Promise<Response> {
  if (process.env.VERCEL_ENV !== 'preview') return rejected();

  try {
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
    const exactCurrentBoundary =
      result.status === 'available'
      && result.activity?.status === 'available'
      && result.throughSlotStart === THROUGH_SLOT
      && latest?.slotStart === THROUGH_SLOT
      && latest?.jobId === EXPECTED_JOB_ID
      && latest?.observedObservationCount === 100
      && latest?.bootstrap === false;

    if (!exactCurrentBoundary) {
      return Response.json(
        {
          ok: false,
          code: 'momentum_v158_preview_stored_evidence_boundary_mismatch',
          canonicalArtistId: result.canonicalArtistId,
          throughSlotStart: result.throughSlotStart,
          expectedSlotCount: result.expectedSlotCount,
          snapshotCount: result.snapshotCount,
          status: result.status,
          reason: result.reason,
          latestSlotStart: latest?.slotStart ?? null,
          latestJobId: latest?.jobId ?? null,
          latestObservedObservationCount:
            latest?.observedObservationCount ?? null,
        },
        { status: 409 },
      );
    }

    return Response.json({
      ok: true,
      mode: 'preview-read-only-stored-evidence-verifier',
      canonicalArtistId: result.canonicalArtistId,
      protocolStart: result.protocolStart,
      throughSlotStart: result.throughSlotStart,
      expectedSlotCount: result.expectedSlotCount,
      snapshotCount: result.snapshotCount,
      status: result.status,
      reason: result.reason,
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
    });
  } catch {
    return rejected();
  }
}
