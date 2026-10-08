import { pathToFileURL } from 'node:url';

import {
  evaluateSnsFandomV2RollingReceiptMonitor,
} from '../../lib/intelligence/snsFandomYoutubeV2RollingReceiptMonitorV1';
import {
  createProductionVercelBlobImmutableTextObjectStore,
} from '../../lib/server/storage/vercelBlobRuntime';

export async function main(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Promise<void> {
  const authorizedRevisionSha =
    environment.FANDEX_SNS_FANDOM_RECURRING_V2_AUTHORIZED_REVISION_SHA?.trim() ?? '';
  const ownerEvidenceRef =
    environment.FANDEX_SNS_FANDOM_RECURRING_V2_CUTOVER_EVIDENCE_REF?.trim() ?? '';
  const firstSuccessfulSlotStart =
    environment.FANDEX_SNS_FANDOM_V2_FIRST_SUCCESSFUL_SLOT_START?.trim() ?? '';
  const throughObservedSlotStart =
    environment.FANDEX_SNS_FANDOM_V2_MONITOR_THROUGH_OBSERVED_SLOT?.trim() ?? '';

  if (
    !authorizedRevisionSha
    || !ownerEvidenceRef
    || !firstSuccessfulSlotStart
    || !throughObservedSlotStart
  ) {
    throw new Error('sns_fandom_rolling_v2_monitor_exact_inputs_missing');
  }

  // The verifier receives only read/list operations. No provider API calls,
  // writes to the Blob store, or GitHub scheduler dispatches can occur.
  const store = createProductionVercelBlobImmutableTextObjectStore(environment);
  const result = await evaluateSnsFandomV2RollingReceiptMonitor({
    readText: (pathname) => store.readText(pathname),
    listPathnames: (prefix) => store.listPathnames(prefix),
  }, {
    authorizedRevisionSha,
    ownerEvidenceRef,
    firstSuccessfulSlotStart,
    throughObservedSlotStart,
  });

  process.stdout.write(JSON.stringify(result) + '\n');
  if (result.state !== 'continuous-to-operator-horizon') {
    process.exitCode = 1;
  }
}

const invokedUrl = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : '';
if (import.meta.url === invokedUrl) {
  main().catch((error) => {
    process.stderr.write(
      (error instanceof Error
        ? error.message
        : 'sns_fandom_rolling_v2_monitor_failed_closed') + '\n',
    );
    process.exitCode = 1;
  });
}
