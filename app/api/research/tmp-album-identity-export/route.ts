import {
  buildIuAlbumIdentityEvidencePersistenceCandidates,
  serializeAlbumIdentityPersistenceRecord,
} from '../../../../lib/alternative-evidence/albumIdentityEvidencePersistenceResearch';

export const dynamic = 'force-dynamic';

const authorizationSnapshot = Object.freeze({
  acquisition: 'allowed',
  automation: 'manual-only',
  rawStorage: 'not-applicable',
  normalizedStorage: 'allowed',
  retention: 'allowed',
  commercialUse: 'unknown',
  derivedPublication: 'unknown',
  rawRedistribution: 'not-applicable',
});

export async function GET() {
  const observedAt = '2026-09-16T23:30:00.000Z';
  const collectedAt = '2026-09-16T23:30:01.000Z';
  const rows = buildIuAlbumIdentityEvidencePersistenceCandidates({
    observedAt,
    collectedAt,
    authorizationSnapshot,
  }).map(serializeAlbumIdentityPersistenceRecord);

  return Response.json({
    contract: 'album-identity-evidence-persistence-research-v1',
    observedAt,
    collectedAt,
    count: rows.length,
    rows,
  });
}
