import { Pool } from 'pg';

import {
  evaluateFandexMomentumRecoveryContinuityFromRepository,
} from '../../lib/intelligence/fandexMomentumRecoveryContinuityGate';
import {
  createPostgresNaverNewsLatestOfficialShadowSlotRepository,
} from '../../lib/server/ingestion/naverNewsLatestOfficialShadowSlot';
import {
  requireRuntimeDatabaseUrl,
} from '../../lib/server/persistence/contracts';

async function main() {
  const pool = new Pool({
    connectionString: requireRuntimeDatabaseUrl(process.env),
    max: 1,
    connectionTimeoutMillis: 5_000,
    query_timeout: 15_000,
    statement_timeout: 15_000,
    ssl: { rejectUnauthorized: true },
  });

  try {
    const repository =
      createPostgresNaverNewsLatestOfficialShadowSlotRepository(pool);
    const gate =
      await evaluateFandexMomentumRecoveryContinuityFromRepository(
        repository,
      );

    console.log('MOMENTUM_RECOVERY_CONTINUITY_STATE=' + gate.state);
    console.log(JSON.stringify(gate));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'momentum_recovery_continuity_gate_failed',
  );
  process.exitCode = 1;
});
