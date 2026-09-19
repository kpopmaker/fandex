import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import {
  evaluateFandexMomentumCrossFamilyCombinationResearch,
} from '../../lib/intelligence/fandexMomentumCrossFamilyCombinationResearch';
import {
  FANDEX_MOMENTUM_TEMPORAL_NORMALIZATION_RESEARCH_VERSION,
  type FandexMomentumTemporalNormalizationResearchResult,
} from '../../lib/intelligence/fandexMomentumTemporalNormalizationResearch';

function parseInput(value: unknown): FandexMomentumTemporalNormalizationResearchResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('momentum_v142_input_invalid');
  }
  const record = value as Record<string, unknown>;
  if (
    record.contractVersion
      !== FANDEX_MOMENTUM_TEMPORAL_NORMALIZATION_RESEARCH_VERSION
    || !Array.isArray(record.components)
  ) {
    throw new Error('momentum_v142_input_invalid');
  }
  return value as FandexMomentumTemporalNormalizationResearchResult;
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  if (argv.length !== 2 || argv[0] !== '--input' || !argv[1]) {
    throw new Error('momentum_v142_argument_invalid');
  }
  const payload = JSON.parse(await readFile(argv[1], 'utf8'));
  const result = evaluateFandexMomentumCrossFamilyCombinationResearch(
    parseInput(payload),
  );
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch(() => {
    console.error('FANDEX v142 cross-family combination review failed closed.');
    process.exitCode = 1;
  });
}
