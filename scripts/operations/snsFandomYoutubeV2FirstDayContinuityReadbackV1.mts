import { pathToFileURL } from 'node:url';

import {
  verifySnsFandomV2FirstDayContinuityFromStore,
} from '../../lib/intelligence/snsFandomYoutubeV2FirstDayContinuityV1';
import {
  createProductionVercelBlobImmutableTextObjectStore,
} from '../../lib/server/storage/vercelBlobRuntime';

const REVISION_ENV = 'FANDEX_SNS_FANDOM_RECURRING_V2_AUTHORIZED_REVISION_SHA';
const APPROVAL_ENV = 'FANDEX_SNS_FANDOM_RECURRING_V2_CUTOVER_EVIDENCE_REF';
const FIRST_SLOT_ENV = 'FANDEX_SNS_FANDOM_V2_FIRST_SUCCESSFUL_SLOT_START';

export async function main(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Promise<void> {
  const expectedAuthorizedRevisionSha = environment[REVISION_ENV]?.trim() ?? '';
  const expectedApprovalEvidenceRef = environment[APPROVAL_ENV]?.trim() ?? '';
  const expectedFirstSlotStart = environment[FIRST_SLOT_ENV]?.trim() ?? '';

  if (
    expectedAuthorizedRevisionSha.length === 0
    || expectedApprovalEvidenceRef.length === 0
    || expectedFirstSlotStart.length === 0
  ) {
    throw new Error('sns_fandom_v2_first_day_readback_exact_inputs_missing');
  }

  // This verifier receives only the store's read and list capabilities.
  // It never calls putTextIfAbsent or a YouTube provider endpoint.
  const store = createProductionVercelBlobImmutableTextObjectStore(environment);
  const result = await verifySnsFandomV2FirstDayContinuityFromStore(
    {
      readText: (pathname) => store.readText(pathname),
      listPathnames: (prefix) => store.listPathnames(prefix),
    },
    {
      expectedAuthorizedRevisionSha,
      expectedApprovalEvidenceRef,
      expectedFirstSlotStart,
    },
  );

  process.stdout.write(JSON.stringify(result) + '\n');
  if (result.state !== 'first-day-complete') {
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
        : 'sns_fandom_v2_first_day_readback_failed_closed')
      + '\n',
    );
    process.exitCode = 1;
  });
}
