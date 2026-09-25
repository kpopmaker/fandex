import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import {
  captureWikimediaEntityAttentionPreDayResearch,
  collectWikimediaEntityAttentionPostDayResearch,
  type WikimediaProspectiveResearchSnapshotEnvelope,
} from '../../lib/alternative-evidence/wikimediaEntityAttentionProspectiveResearch';

type Command =
  | Readonly<{ mode: 'snapshot'; observationDay: string }>
  | Readonly<{
      mode: 'collect';
      observationDay: string;
      snapshotFile: string;
    }>;

function valueAfter(argv: readonly string[], index: number): string {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error('wikimedia_prospective_research_argument_invalid');
  }
  return value;
}

export function parseWikimediaProspectiveResearchCommand(
  argv: readonly string[],
): Command {
  const mode = argv[0];
  if (mode !== 'snapshot' && mode !== 'collect') {
    throw new Error('wikimedia_prospective_research_argument_invalid');
  }

  let observationDay: string | undefined;
  let snapshotFile: string | undefined;
  const seen = new Set<string>();

  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (
      !['--day', '--snapshot-file'].includes(argument)
      || seen.has(argument)
    ) {
      throw new Error('wikimedia_prospective_research_argument_invalid');
    }
    seen.add(argument);
    const value = valueAfter(argv, index);
    index += 1;

    if (argument === '--day') observationDay = value;
    if (argument === '--snapshot-file') snapshotFile = value;
  }

  if (!observationDay) {
    throw new Error('wikimedia_prospective_research_argument_invalid');
  }

  if (mode === 'snapshot') {
    if (snapshotFile !== undefined) {
      throw new Error('wikimedia_prospective_research_argument_invalid');
    }
    return Object.freeze({ mode, observationDay });
  }

  if (!snapshotFile || snapshotFile !== snapshotFile.trim()) {
    throw new Error('wikimedia_prospective_research_argument_invalid');
  }
  return Object.freeze({ mode, observationDay, snapshotFile });
}

function parseSnapshotEnvelope(
  value: unknown,
): WikimediaProspectiveResearchSnapshotEnvelope {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('wikimedia_prospective_research_snapshot_invalid');
  }

  const candidate = value as Partial<WikimediaProspectiveResearchSnapshotEnvelope>;
  if (
    candidate.contractVersion
      !== 'v1_wikimedia_entity_attention_prospective_research'
    || candidate.lifecycle !== 'research'
    || candidate.directProductContributionEligible !== false
    || candidate.productScorePublished !== false
    || candidate.phase !== 'pre-day-identity-snapshot'
    || typeof candidate.observationDay !== 'string'
    || !candidate.identity
  ) {
    throw new Error('wikimedia_prospective_research_snapshot_invalid');
  }

  return candidate as WikimediaProspectiveResearchSnapshotEnvelope;
}

export async function runWikimediaProspectiveResearchCommand(
  argv: readonly string[],
): Promise<unknown> {
  const command = parseWikimediaProspectiveResearchCommand(argv);

  if (command.mode === 'snapshot') {
    return captureWikimediaEntityAttentionPreDayResearch(
      command.observationDay,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(
      await readFile(command.snapshotFile, 'utf8'),
    ) as unknown;
  } catch {
    throw new Error('wikimedia_prospective_research_snapshot_invalid');
  }
  const snapshot = parseSnapshotEnvelope(parsed);

  if (snapshot.observationDay !== command.observationDay) {
    throw new Error('wikimedia_prospective_research_snapshot_invalid');
  }

  return collectWikimediaEntityAttentionPostDayResearch({
    observationDay: command.observationDay,
    beforeIdentity: snapshot.identity,
  });
}

export async function main(
  argv = process.argv.slice(2),
): Promise<void> {
  const result = await runWikimediaProspectiveResearchCommand(argv);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch(() => {
    console.error(
      'Wikimedia prospective entity-attention research failed closed. No Product value, credential, raw provider payload, or database write was emitted.',
    );
    process.exitCode = 1;
  });
}
