import { mkdirSync, writeFileSync } from 'node:fs';
import {
  buildIuAlbumIdentityEvidencePersistenceCandidates,
  serializeAlbumIdentityPersistenceRecord,
} from '../../lib/alternative-evidence/albumIdentityEvidencePersistenceResearch';

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

const observedAt = '2026-09-16T23:30:00.000Z';
const collectedAt = '2026-09-16T23:30:01.000Z';
const rows = buildIuAlbumIdentityEvidencePersistenceCandidates({
  observedAt,
  collectedAt,
  authorizationSnapshot,
}).map(serializeAlbumIdentityPersistenceRecord);

if (rows.length !== 19) throw new Error(`expected_19_rows_got_${rows.length}`);

const sqlString = (value: unknown): string => {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replaceAll("'", "''")}'`;
};
const sqlJson = (value: unknown): string => `${sqlString(JSON.stringify(value))}::jsonb`;

const columns = [
  'record_id', 'record_version', 'record_type', 'provider', 'source_entity_id', 'source_record_id',
  'payload_digest', 'fandex_artist_id', 'fandex_release_id', 'fandex_release_family_id',
  'effective_period', 'record_state', 'supersedes_record_id', 'authorization_snapshot',
  'evidence_payload', 'observed_at', 'collected_at', 'revision_observed_at',
] as const;

const tuple = (row: ReturnType<typeof serializeAlbumIdentityPersistenceRecord>): string => `(${[
  sqlString(row.record_id), sqlString(row.record_version), sqlString(row.record_type), sqlString(row.provider),
  sqlString(row.source_entity_id), sqlString(row.source_record_id), sqlString(row.payload_digest),
  sqlString(row.fandex_artist_id), sqlString(row.fandex_release_id), sqlString(row.fandex_release_family_id),
  sqlString(row.effective_period), sqlString(row.record_state), sqlString(row.supersedes_record_id),
  sqlJson(row.authorization_snapshot), sqlJson(row.evidence_payload), sqlString(row.observed_at),
  sqlString(row.collected_at), sqlString(row.revision_observed_at),
].join(',')})`;

const outputDir = '.tmp-album-identity-batches';
mkdirSync(outputDir, { recursive: true });
const batchSize = 4;
for (let start = 0, index = 1; start < rows.length; start += batchSize, index += 1) {
  const batch = rows.slice(start, start + batchSize);
  const sql = `INSERT INTO fandex.album_identity_research_records (${columns.join(',')}) VALUES\n${batch.map(tuple).join(',\n')}\nON CONFLICT (record_id) DO NOTHING;\n`;
  writeFileSync(`${outputDir}/batch-${index}.sql`, sql, 'utf8');
}
writeFileSync(`${outputDir}/manifest.json`, JSON.stringify({ count: rows.length, batches: Math.ceil(rows.length / batchSize), observedAt, collectedAt }, null, 2) + '\n', 'utf8');
