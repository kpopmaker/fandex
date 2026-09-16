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

const sqlText = (value: string | null) => value === null ? 'NULL' : `'${value.replaceAll("'", "''")}'`;
const sqlJson = (value: unknown) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const start = Math.max(0, Number.parseInt(url.searchParams.get('start') ?? '0', 10) || 0);
  const count = Math.min(5, Math.max(1, Number.parseInt(url.searchParams.get('count') ?? '3', 10) || 3));
  const observedAt = '2026-09-16T23:30:00.000Z';
  const collectedAt = '2026-09-16T23:30:01.000Z';
  const rows = buildIuAlbumIdentityEvidencePersistenceCandidates({
    observedAt,
    collectedAt,
    authorizationSnapshot,
  }).map(serializeAlbumIdentityPersistenceRecord);
  const selected = rows.slice(start, start + count);
  const values = selected.map((row) => `(${[
    sqlText(row.record_id), sqlText(row.record_version), sqlText(row.record_type), sqlText(row.provider),
    sqlText(row.source_entity_id), sqlText(row.source_record_id), sqlText(row.payload_digest),
    sqlText(row.fandex_artist_id), sqlText(row.fandex_release_id), sqlText(row.fandex_release_family_id),
    sqlText(row.effective_period), sqlText(row.record_state), sqlText(row.supersedes_record_id),
    sqlJson(row.authorization_snapshot), sqlJson(row.evidence_payload), sqlText(row.observed_at),
    sqlText(row.collected_at), sqlText(row.revision_observed_at),
  ].join(',')})`).join(',\n');
  const sql = `INSERT INTO fandex.album_identity_research_records (
record_id,record_version,record_type,provider,source_entity_id,source_record_id,payload_digest,
fandex_artist_id,fandex_release_id,fandex_release_family_id,effective_period,record_state,
supersedes_record_id,authorization_snapshot,evidence_payload,observed_at,collected_at,revision_observed_at
) VALUES\n${values}\nON CONFLICT (record_id) DO NOTHING;`;
  return new Response(sql, { headers: { 'content-type': 'text/plain; charset=utf-8', 'x-row-count': String(selected.length) } });
}
