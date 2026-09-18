import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { buildLastfmHistoricalShadowCheckpoint } from '../../lib/lastfm-signal/historicalShadowCheckpoint';
import { evaluateLastfmMomentumConstructAlignment } from '../../lib/lastfm-signal/momentumConstructAlignment';

function parseArgs(argv: readonly string[]): string {
  if (argv.length !== 2 || argv[0] !== '--history' || !argv[1] || argv[1].startsWith('--')) {
    throw new Error('lastfm_v138_construct_review_argument_invalid');
  }
  return argv[1];
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const historyPath = parseArgs(argv);
  const historyCsv = await readFile(historyPath, 'utf8');
  const checkpoint = buildLastfmHistoricalShadowCheckpoint(historyCsv);
  const review = evaluateLastfmMomentumConstructAlignment(checkpoint);
  process.stdout.write(`${JSON.stringify(review, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : 'unknown-error';
    console.error(`Last.fm v138 construct review failed closed: ${message}`);
    process.exitCode = 1;
  });
}
