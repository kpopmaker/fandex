import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import {
  FANDEX_MOMENTUM_CROSS_FAMILY_COMBINATION_RESEARCH_VERSION,
  type FandexMomentumCrossFamilyCombinationResearchResult,
} from '../../lib/intelligence/fandexMomentumCrossFamilyCombinationResearch';
import {
  evaluateFandexMomentumOutputFormEligibilityResearch,
} from '../../lib/intelligence/fandexMomentumOutputFormEligibilityResearch';

function parseInput(value: unknown): FandexMomentumCrossFamilyCombinationResearchResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('momentum_v143_input_invalid');
  }
  const record = value as Record<string, unknown>;
  if (
    record.contractVersion
      !== FANDEX_MOMENTUM_CROSS_FAMILY_COMBINATION_RESEARCH_VERSION
    || typeof record.canonicalArtistId !== 'string'
  ) {
    throw new Error('momentum_v143_input_invalid');
  }
  return value as FandexMomentumCrossFamilyCombinationResearchResult;
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  if (argv.length !== 2 || argv[0] !== '--input' || !argv[1]) {
    throw new Error('momentum_v143_argument_invalid');
  }
  const payload = JSON.parse(await readFile(argv[1], 'utf8'));
  const result = evaluateFandexMomentumOutputFormEligibilityResearch(
    parseInput(payload),
  );
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch(() => {
    console.error('FANDEX v143 output-form eligibility review failed closed.');
    process.exitCode = 1;
  });
}
