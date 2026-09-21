import { requireRuntimeDatabaseUrl } from '../../lib/server/persistence/contracts';

if (process.env.VERCEL_ENV !== 'preview') {
  console.log('momentum_v161_preview_db_contract=skipped_non_preview');
} else {
  requireRuntimeDatabaseUrl(process.env);
  console.log('momentum_v161_preview_db_contract=configured');
}
