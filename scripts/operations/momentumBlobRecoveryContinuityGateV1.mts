import {
  evaluateFandexMomentumRecoveryContinuityFromRepository,
} from '../../lib/intelligence/fandexMomentumRecoveryContinuityGate';
import {
  createProductionNaverNewsBlobEvidenceReadStore,
} from '../../lib/server/ingestion/naverNewsBlobMirrorRuntime';
import {
  createObjectStoreNaverNewsLatestOfficialShadowSlotRepository,
} from '../../lib/server/ingestion/naverNewsStoredEvidenceMirror';

async function main() {
  const store = createProductionNaverNewsBlobEvidenceReadStore(process.env);
  const repository =
    createObjectStoreNaverNewsLatestOfficialShadowSlotRepository(store);
  const gate =
    await evaluateFandexMomentumRecoveryContinuityFromRepository(repository);

  console.log('MOMENTUM_BLOB_RECOVERY_CONTINUITY_STATE=' + gate.state);
  console.log(JSON.stringify(Object.freeze({
    evidenceSource: 'immutable-blob-official-scheduler-manifest',
    blobWrites: 0,
    databaseReads: 0,
    databaseWrites: 0,
    gate,
  })));
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'momentum_blob_recovery_continuity_gate_failed',
  );
  process.exitCode = 1;
});
