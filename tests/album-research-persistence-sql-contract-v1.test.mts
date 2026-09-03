import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = new URL('../database/migrations/003_album_research_observation_persistence.sql', import.meta.url);
const grantsPath = new URL('../database/grants/002_album_research_observation_writer.sql', import.meta.url);

async function sqlFiles() {
  const [migration, grants] = await Promise.all([
    readFile(migrationPath, 'utf8'),
    readFile(grantsPath, 'utf8'),
  ]);
  return { migration, grants };
}

test('migration creates a research-only append-only observation table', async () => {
  const { migration } = await sqlFiles();
  assert.match(migration, /CREATE TABLE fandex\.album_research_observation_records/);
  assert.match(migration, /record_version = 'album-direct-observation-research-v1'/);
  assert.match(migration, /provider IN \('circle-chart', 'hanteo-chart'\)/);
  assert.match(migration, /BEFORE UPDATE OR DELETE ON fandex\.album_research_observation_records/);
  assert.match(migration, /REVOKE ALL ON TABLE fandex\.album_research_observation_records FROM PUBLIC/);
  assert.doesNotMatch(migration, /GRANT\s+(?:ALL|UPDATE|DELETE)/i);
});

test('runtime grant is least privilege: SELECT and INSERT only', async () => {
  const { grants } = await sqlFiles();
  assert.match(grants, /ALTER TABLE fandex\.album_research_observation_records OWNER TO fandex_migrator/);
  assert.match(grants, /REVOKE ALL PRIVILEGES ON TABLE fandex\.album_research_observation_records FROM fandex_runtime/);
  assert.match(grants, /GRANT SELECT, INSERT ON TABLE fandex\.album_research_observation_records TO fandex_runtime/);
  assert.doesNotMatch(grants, /GRANT[^;]*(?:UPDATE|DELETE)[^;]*TO fandex_runtime/i);
  assert.match(grants, /REVOKE ALL PRIVILEGES ON FUNCTION fandex\.reject_album_research_observation_mutation\(\) FROM fandex_runtime/);
});

test('sql contract never introduces provider blending or publication tables', async () => {
  const { migration, grants } = await sqlFiles();
  const combined = `${migration}\n${grants}`;
  assert.doesNotMatch(combined, /SUM\s*\(/i);
  assert.doesNotMatch(combined, /AVG\s*\(/i);
  assert.doesNotMatch(combined, /publication/i);
  assert.doesNotMatch(combined, /production/i);
});
