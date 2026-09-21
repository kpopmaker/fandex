import {
  runNaverNewsMomentumNativeVerifier,
} from '../../lib/server/ingestion/naverNewsMomentumNativeVerifier';
import {
  adaptFandexMomentumVerifierOutputToStoredEvidenceAttestationResearch,
} from '../../lib/intelligence/fandexMomentumVerifierOutputAttestationAdapterResearch';
import {
  evaluateFandexMomentumStoredEvidenceAttestationResearch,
} from '../../lib/intelligence/fandexMomentumStoredEvidenceAttestationResearch';

async function main() {
  if (process.env.VERCEL_ENV !== 'preview') {
    console.log('momentum_v161_native_preview_probe=skipped_non_preview');
    return;
  }

  const native = await runNaverNewsMomentumNativeVerifier(
    {
      canonicalArtistId: 'iu',
      throughSlotStart: '2026-09-21T12:00:00.000Z',
    },
    process.env,
  );

  const adapted =
    adaptFandexMomentumVerifierOutputToStoredEvidenceAttestationResearch({
      snapshot: native.snapshot,
      verifierOutput: native.verifierOutput,
    });

  if (adapted.state !== 'attestation-adapted' || adapted.attestation === null) {
    throw new Error('momentum_v161_native_preview_v160_rejected');
  }

  const v159 = evaluateFandexMomentumStoredEvidenceAttestationResearch({
    snapshot: native.snapshot,
    runtimeObservation: {
      observedAt: '2026-09-21T12:47:00.000Z',
      requestPath: '/api/internal/naver-news/shadow-scheduler',
      httpStatus: 200,
      deploymentId: 'dpl_AfKF5z9aAvNxsa6gzCjXpEXengHt',
      branch: 'main',
    },
    readAttestation: adapted.attestation,
  });

  if (
    v159.state !== 'attested-provenance-ready'
    || !v159.provenance.futureLiveRefreshEligible
  ) {
    throw new Error('momentum_v161_native_preview_v159_rejected');
  }

  console.log('V161_NATIVE_FRESH_BEGIN');
  console.log(JSON.stringify({
    native: {
      contractVersion: native.contractVersion,
      digest: native.digest,
      snapshot: native.snapshot,
      verifierOutput: native.verifierOutput,
      effects: native.effects,
    },
    v160: {
      state: adapted.state,
      digest: adapted.digest,
      verifierOutputAccepted: adapted.verifierOutputAccepted,
      blockers: adapted.blockers,
      attestation: adapted.attestation,
      effects: adapted.effects,
    },
    v159: {
      state: v159.state,
      digest: v159.digest,
      provenanceState: v159.provenance.state,
      provenanceDigest: v159.provenance.digest,
      futureLiveRefreshEligible:
        v159.provenance.futureLiveRefreshEligible,
      blockers: v159.blockers,
      effects: v159.effects,
    },
  }, null, 2));
  console.log('V161_NATIVE_FRESH_END');
}

main().catch((error) => {
  console.error(
    'momentum_v161_native_preview_probe_failed_closed',
    error instanceof Error ? error.message : 'unknown',
  );
  process.exitCode = 1;
});
