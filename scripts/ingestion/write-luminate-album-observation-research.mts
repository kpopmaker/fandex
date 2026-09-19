import { pathToFileURL } from 'node:url';

import { runLuminateAlbumResearchWrite } from '../../lib/alternative-evidence/luminateAlbumObservationWriteCommandResearch';

export async function main(
  argv = process.argv.slice(2),
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Promise<void> {
  const summary = await runLuminateAlbumResearchWrite(argv, environment);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = summary.status === 'applied' || summary.status === 'idempotent-existing' ? 0 : 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch(() => {
    console.error('Luminate album research write failed closed. No credential, database detail, SQL, licensed quantity, or raw provider payload was logged.');
    process.exitCode = 1;
  });
}
