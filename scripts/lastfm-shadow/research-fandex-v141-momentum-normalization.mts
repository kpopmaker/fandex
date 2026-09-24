import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import {
  evaluateFandexMomentumTemporalNormalizationResearch,
} from '../../lib/intelligence/fandexMomentumTemporalNormalizationResearch';
import {
  FANDEX_NAVER_MEDIA_ATTENTION_MOMENTUM_RESEARCH_VERSION,
  type FandexNaverMediaAttentionMomentumResearchResult,
} from '../../lib/intelligence/fandexNaverMediaAttentionMomentumResearch';

function valueAfter(argv: readonly string[], flag: string): string {
  const index = argv.indexOf(flag);
  const value = index >= 0 ? argv[index + 1] : undefined;
  if (!value || value.startsWith('--')) {
    throw new Error('momentum_v141_cli_argument_invalid');
  }
  return value;
}

function parseNaver(value: unknown): FandexNaverMediaAttentionMomentumResearchResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('momentum_v141_cli_naver_invalid');
  }
  const record = value as Record<string, unknown>;
  if (
    record.contractVersion !== FANDEX_NAVER_MEDIA_ATTENTION_MOMENTUM_RESEARCH_VERSION
    || typeof record.canonicalArtistId !== 'string'
    || !Array.isArray(record.anchors)
  ) {
    throw new Error('momentum_v141_cli_naver_invalid');
  }
  const effects = record.effects;
  if (!effects || typeof effects !== 'object' || Array.isArray(effects)) {
    throw new Error('momentum_v141_cli_naver_invalid');
  }
  for (const anchor of record.anchors) {
    if (!anchor || typeof anchor !== 'object' || Array.isArray(anchor)) {
      throw new Error('momentum_v141_cli_naver_invalid');
    }
    const point = anchor as Record<string, unknown>;
    if (
      typeof point.throughSlotStart !== 'string'
      || typeof point.currentActivityRate !== 'number'
      || typeof point.newsIssuePointScore !== 'number'
      || typeof point.priorDefinedWindowCount !== 'number'
    ) {
      throw new Error('momentum_v141_cli_naver_invalid');
    }
  }
  return value as FandexNaverMediaAttentionMomentumResearchResult;
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  if (argv.length !== 6) throw new Error('momentum_v141_cli_argument_invalid');
  const artist = valueAfter(argv, '--artist');
  const lastfmPath = valueAfter(argv, '--lastfm-history');
  const naverPath = valueAfter(argv, '--naver-component');

  const [lastfmHistoryCsv, naverJson] = await Promise.all([
    readFile(lastfmPath, 'utf8'),
    readFile(naverPath, 'utf8'),
  ]);
  const naverComponent = parseNaver(JSON.parse(naverJson));
  const result = evaluateFandexMomentumTemporalNormalizationResearch({
    canonicalArtistId: artist,
    lastfmHistoryCsv,
    naverComponent,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch(() => {
    console.error('FANDEX v141 momentum temporal-normalization review failed closed.');
    process.exitCode = 1;
  });
}
