import { serializeAlbumIdentityPersistenceRecord } from '../../lib/alternative-evidence/albumIdentityEvidencePersistenceResearch';
import { buildIuTheWinningIdentityPersistenceRecords } from '../../lib/alternative-evidence/iuTheWinningResearchEvidence';

const authorizationSnapshot = Object.freeze({
  acquisition: 'allowed' as const,
  automation: 'manual-only' as const,
  rawStorage: 'not-applicable' as const,
  normalizedStorage: 'allowed' as const,
  retention: 'allowed' as const,
  commercialUse: 'unknown' as const,
  derivedPublication: 'unknown' as const,
  rawRedistribution: 'not-applicable' as const,
});

const records = buildIuTheWinningIdentityPersistenceRecords({
  observedAt: '2026-09-16T10:48:22.145Z',
  collectedAt: '2026-09-16T10:48:22.145Z',
  authorizationSnapshot,
});

const rows = records.map((record) => serializeAlbumIdentityPersistenceRecord(record));
console.log(JSON.stringify({ count: rows.length, rows }, null, 2));
