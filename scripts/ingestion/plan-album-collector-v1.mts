import { pathToFileURL } from 'node:url';

import {
  buildAlbumCollectorPlanReport,
  parseAlbumCollectorPlanCommand,
} from '../../lib/server/ingestion/albumCollectorPlanCli';

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const parsed = parseAlbumCollectorPlanCommand(argv);
  const report = buildAlbumCollectorPlanReport(parsed);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch(() => {
    console.error('Album collector plan v1 failed closed. No network call, database read/write, schedule activation, or environment mutation was performed.');
    process.exitCode = 1;
  });
}
