import { pathToFileURL } from 'node:url';

import {
  verifySnsFandomV2BootstrapReadbackCandidate,
} from '../../lib/intelligence/snsFandomYoutubeV2BootstrapReadbackCandidateV1';
import {
  createProductionVercelBlobImmutableTextObjectStore,
} from '../../lib/server/storage/vercelBlobRuntime';

const THROUGH_ENV = 'FANDEX_SNS_FANDOM_V2_BOOTSTRAP_THROUGH_OBSERVED_SLOT';

export async function main(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Promise<void> {
  const throughObservedSlotStart = environment[THROUGH_ENV]?.trim() ?? '';
  if (!throughObservedSlotStart || !environment.BLOB_READ_WRITE_TOKEN?.trim()) {
    throw new Error('sns_fandom_v2_bootstrap_readback_exact_inputs_missing');
  }

  // IMPORTANT: the Blob adapter may support writes but only these two
  // *read-only* methods are passed to the evaluator. The evaluator
  // contains no write or provider method and cannot produce stored artifacts.
  const adapter = createProductionVercelBlobImmutableTextObjectStore(environment);
  const report = await verifySnsFandomV2BootstrapReadbackCandidate(
    {
      readText: (pathname) => adapter.readText(pathname),
      listPathnames: (prefix) => adapter.listPathnames(prefix),
    },
    { throughObservedSlotStart },
  );
  process.stdout.write(JSON.stringify(report) + '\n');
  if (report.state !== 'bootstrap-candidate-complete') process.exitCode = 1;
}

const launchedAsCli = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;
if (launchedAsCli) {
  main().catch((error) => {
    process.stderr.write(
      (error instanceof Error ? error.message
        : 'sns_fandom_v2_bootstrap_readback_failed_closed') + '\n',
    );
    process.exitCode = 1;
  });
}
