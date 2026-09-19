import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import {
  FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_VERSION,
  type FandexMomentumOutputFormEligibilityResearchResult,
} from '../../lib/intelligence/fandexMomentumOutputFormEligibilityResearch';
import {
  buildFandexMomentumResearchCarrierRecord,
  parseFandexMomentumResearchCarrierJsonl,
  serializeFandexMomentumResearchCarrierRecord,
} from '../../lib/intelligence/fandexMomentumResearchCarrier';

function valueAfter(argv: readonly string[], flag: string): string | null {
  const index = argv.indexOf(flag);
  if (index < 0) return null;
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error('momentum_v144_argument_invalid');
  }
  return value;
}

function parseV143(value: unknown): FandexMomentumOutputFormEligibilityResearchResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('momentum_v144_input_invalid');
  }
  const record = value as Record<string, unknown>;
  if (
    record.contractVersion
      !== FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_VERSION
    || record.state !== 'categorical-research-output-only'
    || typeof record.digest !== 'string'
  ) {
    throw new Error('momentum_v144_input_invalid');
  }
  return value as FandexMomentumOutputFormEligibilityResearchResult;
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const inputPath = valueAfter(argv, '--input');
  const recordedAt = valueAfter(argv, '--recorded-at');
  const existingPath = valueAfter(argv, '--existing');
  const allowedFlags = new Set(['--input', '--recorded-at', '--existing']);

  if (!inputPath || !recordedAt) {
    throw new Error('momentum_v144_argument_invalid');
  }
  for (let index = 0; index < argv.length; index += 2) {
    if (!allowedFlags.has(argv[index]) || !argv[index + 1]) {
      throw new Error('momentum_v144_argument_invalid');
    }
  }

  const result = parseV143(JSON.parse(await readFile(inputPath, 'utf8')));
  const existing = existingPath ? await readFile(existingPath, 'utf8') : '';
  const records = parseFandexMomentumResearchCarrierJsonl(existing);
  const previous = records.at(-1) ?? null;

  const record = buildFandexMomentumResearchCarrierRecord({
    result,
    sequence: records.length + 1,
    recordedAt,
    previousRecordDigest: previous?.recordDigest ?? null,
  });

  const lines = [
    ...records.map(serializeFandexMomentumResearchCarrierRecord),
    serializeFandexMomentumResearchCarrierRecord(record),
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch(() => {
    console.error('FANDEX v144 research carrier generation failed closed.');
    process.exitCode = 1;
  });
}
